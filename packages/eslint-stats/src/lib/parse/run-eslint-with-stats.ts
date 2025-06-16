import * as ansis from 'ansis';
import { executeProcess, type ProcessResult } from '../utils/execute-process';
import * as process from 'node:process';
import { join } from 'node:path';
import { basename } from 'path';
import { RootStatsNode } from './eslint-result-visitor';
import { readFileSync } from 'fs';
import { processEslintResults } from './eslint-result.visitor';

const ESLINT_PREFIX = 'ESLINT-STATS--';

function formatCommandLog(command: string, args: string[] = []): string {
  const logElements: string[] = [];
  logElements.push(ansis.cyan(command));
  if (args.length > 0) {
    logElements.push(ansis.white(args.join(' ')));
  }
  return logElements.join(' ');
}

function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

export function encodeCmd(cmd: string, args: string[]) {
  const combined = [cmd, ...args].join(' ');
  const b64 = Buffer.from(combined, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeCmd(slug: string) {
  let b64 = slug.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return Buffer.from(b64, 'base64').toString('utf8');
}

type EsLintStatsProfileNameOptions = {
  prefix: string;
  date?: Date;
};

/**
 * Generates an ESLint stats filename like:
 * PREFIX.YYYYMMDD.HHMMSS.json
 */
export function getEsLintStatsFileName({
  prefix,
  date = new Date(),
}: EsLintStatsProfileNameOptions) {
  // Build date/time segments
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const datePart = `${year}${month}${day}`;
  const timePart = `${hours}${minutes}${seconds}`;

  const preparedPrefix = prefix
    // Remove leading/trailing whitespace, replace spaces with dashes, and remove non-alphanumeric characters
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '-');
  return `${preparedPrefix}.${datePart}.${timePart}.json`;
}

export async function runEslintWithStats(
  command: string[],
  args: string[],
  logger: { log: (...args: string[]) => void } = console,
  env: Record<string, string | undefined> = process.env
): Promise<Pick<ProcessResult, 'code'> & { outputFile: string }> {
  const date = new Date();
  const [executable, ...commandArgs] = command;

  // Generate the ESLint args with placeholder for encoding
  const eslintArgsForEncoding = objectToCliArgs({
    stats: true,
    format: 'json',
    'output-file': '<generated>',
  });

  // Create the full command for encoding (with placeholder for output-file)
  const fullCommandForEncoding = [
    executable,
    ...commandArgs,
    ...args,
    '--',
    ...eslintArgsForEncoding,
  ];

  const outputFile = join(
    process.cwd(),
    getEsLintStatsFileName({
      prefix: `ESLINT-STATS--${encodeCmd(
        fullCommandForEncoding[0],
        fullCommandForEncoding.slice(1)
      )}`,
      date,
    })
  );

  const envWithTiming = { ...env };

  // Now create the actual ESLint args with the real output file
  const eslintArgs = objectToCliArgs({
    stats: true,
    format: 'json',
    'output-file': outputFile,
  });

  const allArgs = [...commandArgs, ...args, ...eslintArgs];

  logger.log(formatCommandLog(executable, allArgs));

  try {
    const result = await executeProcess({
      command: executable,
      args: allArgs,
      env: envWithTiming,
      ignoreExitCode: true,
      observer: {
        onStdout: () => {
          // do nothing to silence the output
        },
        onStderr: (stderr: string) => {
          // stats are written to stderr
          logger.log(ansis.gray(stderr));
        },
      },
    });

    return { code: result.code, outputFile };
  } catch (error) {
    logger.log(`Failed to generate stats`);
    throw error;
  }
}

type ArgumentValue = number | string | boolean | string[];
export type CliArgsObject<T extends object = Record<string, ArgumentValue>> =
  T extends never
    ? Record<string, ArgumentValue | undefined> | { _: string }
    : T;

/**
 * Converts an object with different types of values into an array of command-line arguments.
 *
 * @example
 * const args = objectToCliArgs({
 *   _: ['node', 'index.js'], // node index.js
 *   name: 'Juanita', // --name=Juanita
 *   formats: ['json', 'md'] // --format=json --format=md
 * });
 */
export function objectToCliArgs<
  T extends object = Record<string, ArgumentValue>
>(params?: CliArgsObject<T>): string[] {
  if (!params) {
    return [];
  }

  return Object.entries(params).flatMap(([key, value]) => {
    // process/file/script
    if (key === '_') {
      return Array.isArray(value) ? value : [`${value}`];
    }
    const prefix = key.length === 1 ? '-' : '--';
    // "-*" arguments (shorthands)
    if (Array.isArray(value)) {
      return value.map((v) => `${prefix}${key}="${v}"`);
    }
    // "--*" arguments ==========

    if (typeof value === 'object') {
      return Object.entries(value as Record<string, ArgumentValue>).flatMap(
        // transform nested objects to the dot notation `key.subkey`
        ([k, v]) => objectToCliArgs({ [`${key}.${k}`]: v })
      );
    }

    if (typeof value === 'string') {
      return [`${prefix}${key}="${value}"`];
    }

    if (typeof value === 'number') {
      return [`${prefix}${key}=${value}`];
    }

    if (typeof value === 'boolean') {
      return [`${prefix}${value ? '' : 'no-'}${key}`];
    }

    throw new Error(`Unsupported type ${typeof value} for key ${key}`);
  });
}

/**
 * ESLint stats filename pattern for validation and parsing
 */
const ESLINT_STATS_FILENAME_PATTERN =
  /^(?<prefix>[^.]+)\.(?<ymd>\d{8})\.(?<hms>\d{6})\.(?<ext>json)$/;

type EsLintStatsFileName = string;

type EsLintStatsNameOptions = {
  prefix: string;
  date: Date;
  extension: string;
};

/**
 * Parses an ESLint stats filename and extracts its components.
 *
 * @param {string} file - Filename in the format:
 *   {prefix}.{YYYYMMDD}.{HHMMSS}.{extension}
 * @returns {object} Parsed details including:
 *   prefix, date (Date object), extension
 * @throws {Error} If the filename doesn't match the expected pattern.
 *
 * @example
 * const info = parseEsLintStatsName('ESLINT_STATS--ZXNsaW50.20250510.134625.json');
 *  info = {
 *    prefix: 'ESLINT_STATS--ZXNsaW50',
 *    date: Date('2025-05-10T13:46:25'),
 *    extension: 'json'
 *  }
 */
export function parseEsLintStatsName(
  file: EsLintStatsFileName
): Required<EsLintStatsNameOptions> {
  const match = basename(file).match(ESLINT_STATS_FILENAME_PATTERN);

  if (!match) {
    throw new Error(`Invalid ESLint stats filename format: ${file}`);
  }

  const { prefix, ymd, hms, ext } = match?.groups ?? {};

  const year = +ymd.slice(0, 4);
  const month = +ymd.slice(4, 6) - 1;
  const day = +ymd.slice(6, 8);
  const hours = +hms.slice(0, 2);
  const minutes = +hms.slice(2, 4);
  const seconds = +hms.slice(4, 6);

  return {
    prefix,
    date: new Date(year, month, day, hours, minutes, seconds),
    extension: ext,
  };
}

export function loadStats(file: string): RootStatsNode {
  try {
    const jsonContent = readFileSync(file, 'utf-8');
    const lintResults = JSON.parse(jsonContent);

    if (
      Array.isArray(lintResults) &&
      lintResults.length > 0 &&
      !lintResults.some((result) => 'stats' in result && result.stats)
    ) {
      throw new Error(
        `The ESLint stats file seems to be missing performance data. ` +
          `Please make sure you generate it with the '--stats' flag, e.g., ` +
          `'eslint . --format json --output-file ${file} --stats'.`
      );
    }

    // Try to parse filename information
    let date: Date | undefined;
    let decodedCommand: string | undefined;
    try {
      const parsedInfo = parseEsLintStatsName(file);
      date = parsedInfo.date;

      // Try to decode command if prefix contains encoded command
      if (parsedInfo.prefix.startsWith(ESLINT_PREFIX)) {
        const encodedPart = parsedInfo.prefix.replace(ESLINT_PREFIX, '');
        try {
          decodedCommand = decodeCmd(encodedPart);
        } catch {
          // If decoding fails, just ignore it
        }
      }
    } catch {
      // If filename parsing fails, just ignore it and continue
    }

    return processEslintResults(lintResults, date, decodedCommand, file);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error parsing file "${file}": ${error.message}`);
    } else {
      throw new Error(`An unknown error occurred while processing "${file}".`);
    }
  }
}
