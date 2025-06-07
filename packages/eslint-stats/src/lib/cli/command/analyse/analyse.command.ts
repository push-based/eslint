/**
 * @fileoverview Script to read ESLint performance statistics from a JSON file,
 * aggregate the rule timings, and display them in a formatted table.
 */
import type { Argv, CommandModule } from 'yargs';
import { analyseHandler } from './handler';

export interface AnalyseArgs {
  interactive?: boolean;
  file: string;
  groupBy: string;
  sortBy: string;
  show: string[];
  take?: (string | number)[];
  outPath?: string;
}

export const analyseCommand: CommandModule<{}, AnalyseArgs> = {
  command: 'analyse <file>',
  describe: 'Analyse ESLint stats JSON file',
  builder: (yargs: Argv): Argv<AnalyseArgs> => {
    return yargs
      .positional('file', {
        type: 'string',
        description: 'Path to the ESLint stats JSON file',
      })
      .demandOption('file')
      .group(
        ['groupBy', 'sortBy', 'show', 'take', 'outPath', 'help'],
        'Formatting Options:'
      )
      .option('groupBy', {
        alias: 'g',
        type: 'string',
        description: 'Group by "rule", "file", or "file-rule"',
        default: 'rule',
        choices: ['rule', 'file', 'file-rule'],
      })
      .option('sortBy', {
        alias: 's',
        type: 'string',
        description: 'Sort by "time" or "violations"',
        default: 'time',
        choices: ['time', 'violations'],
      })
      .option('show', {
        description:
          'Columns to show. Options: "time", "relative", "violations".',
        type: 'array',
        choices: ['time', 'relative', 'violations'],
        default: ['time', 'relative', 'violations'],
      })
      .option('take', {
        alias: 't',
        type: 'array',
        description:
          'The number of entries to display. For `file-rule` group, two values can be provided for files and rules.',
      })
      .option('outPath', {
        type: 'string',
        description:
          'Path to the output file. Defaults to the input file name with a .md extension.',
      })
      .option('interactive', {
        type: 'boolean',
        description: 'Interactive mode',
        default: process.stdout.isTTY,
      });
  },
  handler: analyseHandler,
};
