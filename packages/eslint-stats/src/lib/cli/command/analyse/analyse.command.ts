/**
 * @fileoverview Script to read ESLint performance statistics from a JSON file,
 * aggregate the rule timings, and display them in a formatted table.
 */
import type { Argv, CommandModule } from 'yargs';
import { AnalyseArgs, group, sort, sortDirection } from './types';
import { analyseHandler } from './handler';

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
      .option('show', {
        describe: 'What to show in the report.',
        alias: 'w',
        default: [],
        choices: ['rules-with-warnings', 'rules-with-fixable-warnings'],
        type: 'array',
      }) as unknown as Argv<AnalyseArgs>;
  },
  handler: analyseHandler,
};
