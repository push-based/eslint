import type { Argv, CommandModule } from 'yargs';
import type { MeasureArgs } from './types';
import { handler } from './handler';

export const measureCommand: CommandModule<object, MeasureArgs> = {
  command: 'measure [args...]',
  describe: 'Run eslint on a given set of files and measure the performance.',
  builder: (yargs: Argv): Argv<MeasureArgs> => {
    return yargs
      .positional('args', {
        describe:
          'Arguments to pass to ESLint or a command that runs eslint (e.g. nx run my-app:lint). If not provided, it will run eslint on the current directory.',
        type: 'string',
        array: true,
      })
      .group(['config', 'quiet', 'help'], 'ESLint Options:')
      .option('config', {
        describe: 'Path to the ESLint config file.',
        type: 'string',
        alias: 'c',
      })
      .group(['file-output', 'show'], 'Stats Options:')
      .option('file-output', {
        describe: 'File to write the stats to.',
        type: 'string',
      })
      .option('show', {
        describe: 'Show the stats report after running the command.',
        type: 'boolean',
        default: true,
      })
      .option('interactive', {
        describe:
          'in combination with `--show` it will show the stats report in the console as interactive table',
        type: 'boolean',
        default: true,
      })
      .example(
        '$0 measure "src/**/*.ts"',
        'Lint all TypeScript files in the src directory.'
      )
      .example(
        '$0 measure "src/**/*.ts" --config ./.eslintrc.ci.js',
        'Lint files with a specific config.'
      )
      .example(
        '$0 measure nx run project-name:lint',
        'Lint files with a specific config and output format.'
      )
      .epilog(
        `This command runs ESLint on the specified files and measures performance statistics.`
      );
  },
  handler,
};
