import type { Argv, CommandModule } from 'yargs';
import type { MeasureArgs } from './types';
import { handler } from './handler';

export const measureCommand: CommandModule<object, MeasureArgs> = {
  command: 'measure [files...]',
  describe: 'Run eslint on a given set of files and measure the performance.',
  builder: (yargs: Argv): Argv<MeasureArgs> => {
    return yargs
      .positional('files', {
        describe: 'Paths to files or directories to lint.',
        type: 'string',
      })
      .group(
        ['config', 'format', 'output-file', 'quiet', 'help'],
        'ESLint Options:'
      )
      .option('config', {
        describe: 'Path to the ESLint config file.',
        type: 'string',
        alias: 'c',
      })
      .option('format', {
        describe: 'ESLint output format.',
        type: 'string',
        default: 'stylish',
      })
      .option('output-file', {
        describe: 'File to write the ESLint output to.',
        type: 'string',
        alias: 'o',
      })
      .option('quiet', {
        describe: 'Report errors only.',
        type: 'boolean',
      })
      .group(
        ['stats-output-file', 'stats-format', 'eslint-command'],
        'Stats Options:'
      )
      .option('eslint-command', {
        describe: 'The command to run ESLint.',
        type: 'string',
        default: 'eslint',
      })
      .option('stats-output-file', {
        describe: 'File to write the stats to.',
        type: 'string',
        alias: 'sof',
      })
      .option('stats-format', {
        describe: 'Stats output format.',
        type: 'string',
        alias: 'sf',
      })
      .example(
        '$0 measure "src/**/*.ts"',
        'Lint all TypeScript files in the src directory.'
      )
      .example(
        '$0 measure "src/**/*.ts" --config ./.eslintrc.ci.js --format json --output-file eslint-report.json',
        'Lint files with a specific config and output format.'
      )
      .epilog(
        `This command runs ESLint on the specified files and measures performance statistics.`
      );
  },
  handler,
};
