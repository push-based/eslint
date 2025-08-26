import { runEslintWithStats } from '../../../parse/run-eslint-with-stats';
import { analyseHandler } from '../analyse/handler';
import { AnalyseArgs, group, sort, sortDirection } from '../analyse/types';
import { MeasureArgs } from './types';
import { objectToCliArgs } from '../../../parse/run-eslint-with-stats';

export async function handler(argv: MeasureArgs): Promise<void> {
  const {
    show: showReport,
    eslintCommandAndArgs = [],
    fileOutput,
    interactive,
    ...restArgv
  } = argv;

  // Get the command to run, filtering out 'measure' and providing a default if empty
  const command = (eslintCommandAndArgs || []).filter((a) => a !== 'measure')
    .length
    ? eslintCommandAndArgs
    : ['node', 'node_modules/.bin/eslint', '.'];

  if (command.filter((a) => a !== '--').length === 0) {
    console.log('Error: No command provided to measure.');
    console.log(`Using "${command.join(' ')}" as default command.`);
  }

  // Clean up arguments
  const {
    _,
    $0,
    'eslint-command-and-args': unusedEslintArgs,
    ...filteredArgs
  } = restArgv as any;
  const additionalArgs = objectToCliArgs({ ...filteredArgs }).map((a) =>
    a.replaceAll(/"/g, '')
  );

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
