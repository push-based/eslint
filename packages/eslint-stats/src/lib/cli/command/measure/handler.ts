import { runEslintWithStats } from '../../../stats/run-eslint-with-stats';
import { analyseHandler } from '../analyse/handler';
import { AnalyseArgs, group, sort, sortDirection } from '../analyse/types';
import { join } from 'path';
import { MeasureArgs } from './types';
import { objectToCliArgs } from '../../../stats/run-eslint-with-stats';

export async function handler(argv: MeasureArgs): Promise<void> {
  const { show: showReport, args, fileOutput, interactive, ...restArgv } = argv;

  let outputFile = fileOutput;
  if (!outputFile) {
    outputFile = join(process.cwd(), `eslint-stats.json`);
  }

  const command = args || [];

  if (command.length === 0) {
    console.error('Error: No command provided to measure.');
    process.exit(1);
  }

  const additionalArgs = objectToCliArgs(restArgv);

  try {
    const result = await runEslintWithStats(
      command,
      additionalArgs,
      {
        outputFile,
      },
      console
    );

    if (showReport) {
      const analyseArgs: AnalyseArgs = {
        file: outputFile,
        // using defaults from yargs in analyse.command.ts
        groupBy: group.rule,
        sortBy: sort.time,
        sortDirection: sortDirection.desc,
        show: [],
        interactive,
      };
      await analyseHandler(analyseArgs);
      return;
    }

    if (result.code !== 0) {
      process.exit(result.code || 1);
    }
  } catch (error) {
    // error is logged by runEslintWithStats
    process.exit(1);
  }
}
