import * as ansis from 'ansis';
import { executeProcess, type ProcessResult } from './execute-process';
import * as process from 'node:process';

function formatCommandLog(command: string, args: string[] = []): string {
  const logElements: string[] = [];
  logElements.push(ansis.cyan(command));
  if (args.length > 0) {
    logElements.push(ansis.white(args.join(' ')));
  }
  return logElements.join(' ');
}

export async function runEslintWithStats(
  command: string,
  args: Record<string, ArgumentValue>,
  options: {
    stats: boolean;
    statsOutputFile?: string;
    statsFormat?: string;
  },
  logger: { log: (...args: string[]) => void } = console,
  env: Record<string, string | undefined> = process.env
): Promise<Pick<ProcessResult, 'code'>> {
  const { stats, statsOutputFile, statsFormat } = options;

  const statsArgs: Record<string, ArgumentValue> = {};

  if (stats) {
    statsArgs['stats'] = true;
    if (statsOutputFile) {
      statsArgs['output-file'] = statsOutputFile;
    }
    if (statsFormat) {
      statsArgs['format'] = statsFormat;
    }
  }

  const allArgs = { ...args, ...statsArgs };
  const argsArray = objectToCliArgs(allArgs);

  logger.log(formatCommandLog(command, argsArray));

  try {
    const result = await executeProcess({
      command,
      args: argsArray,
      env: env,
      observer: {
        onStdout: (stdout: string) => {
          logger.log(stdout);
        },
        onStderr: (stderr: string) => {
          logger.log(stderr);
        },
      },
    });

    if (statsOutputFile) {
      logger.log(`Stats file generated - ${statsOutputFile}`);
    }

    return { code: result.code };
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
