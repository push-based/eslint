import * as ansis from 'ansis';
import { executeProcess, type ProcessResult } from './execute-process';
import * as process from 'node:process';
import { join } from 'node:path';

function formatCommandLog(command: string, args: string[] = []): string {
  const logElements: string[] = [];
  logElements.push(ansis.cyan(command));
  if (args.length > 0) {
    logElements.push(ansis.white(args.join(' ')));
  }
  return logElements.join(' ');
}

export async function runEslintWithStats(
  command: string[],
  args: string[],
  options: {
    outputFile?: string;
  } = {},
  logger: { log: (...args: string[]) => void } = console,
  env: Record<string, string | undefined> = process.env
): Promise<Pick<ProcessResult, 'code'>> {
  const { outputFile = join(process.cwd(), 'eslint.stats.json') } = options;

  const envWithTiming = { ...env };

  const [executable, ...commandArgs] = command;

  const eslintArgs = objectToCliArgs({
    stats: true,
    format: 'json',
    'output-file': outputFile,
  });

  const allArgs = [...commandArgs, ...args, '--', ...eslintArgs];

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
