import { runEslintWithStats } from '../../../parse/run-eslint-with-stats';
import { analyseHandler } from '../analyse/handler';
import { AnalyseArgs, group, sort, sortDirection } from '../analyse/types';
import { MeasureArgs } from './types';
import { objectToCliArgs } from '../../../parse/run-eslint-with-stats';

export async function handler(argv: MeasureArgs): Promise<void> {
  const { show: showReport, args, fileOutput, interactive, ...restArgv } = argv;

  const command = (args || []).filter((a) => a !== 'measure');

  if (command.length === 0) {
    console.error('Error: No command provided to measure.');
    process.exit(1);
  }

  const { _, $0, ...remainingArgs } = restArgv as any;

  const additionalArgs = objectToCliArgs({ ...remainingArgs });

  try {
    const result = await runEslintWithStats(command, additionalArgs, console);

    if (showReport) {
      const analyseArgs: AnalyseArgs = {
        file: fileOutput || result.outputFile,
        // using defaults from yargs in analyse.command.ts
        groupBy: group.rule,
        sortBy: sort.time,
        sortDirection: sortDirection.desc,
        interactive,
      };
      await analyseHandler(analyseArgs);
      return;
    }

    if (result.code !== 0) {
      process.exit(result.code || 1);
    }
  } catch (_error) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // error is logged by runEslintWithStats
    process.exit(1);
  }
}
