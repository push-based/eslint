/**
 * @fileoverview Script to read ESLint performance statistics from a JSON file,
 * aggregate the rule timings, and display them in a formatted table.
 */
import type { Argv, CommandModule } from 'yargs';
import { AnalyseArgs, group, sort, sortDirection } from './types';
import { analyseHandler } from './handler';
import { join } from 'path';

export const analyseCommand: CommandModule<object, AnalyseArgs> = {
  command: 'analyse <file>',
  aliases: ['analyze'],
  describe: 'Analyse a given eslint-stats.json file.',
  builder: (yargs: Argv): Argv<AnalyseArgs> => {
    return yargs
      .positional('file', {
        describe: 'Path to eslint-stats.json file.',
        type: 'string',
        demandOption: true,
        default: join(process.cwd(), 'eslint-stats.json'),
      })
      .option('group-by', {
        describe: 'Group stats by a given criteria.',
        alias: 'g',
        default: group.rule,
        choices: Object.values(group),
      })
      .option('sort-by', {
        describe: 'Sort stats by a given criteria.',
        alias: 's',
        default: sort.time,
        choices: Object.values(sort),
      })
      .option('sort-direction', {
        describe: 'Sort direction.',
        alias: 'd',
        default: sortDirection.desc,
        choices: Object.values(sortDirection),
      })
      .option('take', {
        describe:
          'The number of entries to display. For file-rule group, two values can be provided for files and rules.',
        alias: 't',
        type: 'array',
      })
      .option('interactive', {
        describe: 'Control the table over terminal input',
        type: 'boolean',
        default: true,
      }) as unknown as Argv<AnalyseArgs>;
  },
  handler: analyseHandler,
};
