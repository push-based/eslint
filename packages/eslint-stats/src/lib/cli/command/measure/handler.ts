import type { MeasureArgs } from './types';
import { filterCliOptions } from './utils';
import { runEslintWithStats } from '../../../stats/run-eslint-with-stats';

export async function handler(argv: MeasureArgs): Promise<void> {
  const { _: positionalArgs = [], $0, ...options } = argv;
  const files = positionalArgs as string[];

  const statsOptions = {
    stats: true,
    statsOutputFile: options.statsOutputFile || options['stats-output-file'],
    statsFormat: options.statsFormat || options['stats-format'],
  };

  const eslintOptions = { ...options };
  delete eslintOptions.statsOutputFile;
  delete eslintOptions['stats-output-file'];
  delete eslintOptions.statsFormat;
  delete eslintOptions['stats-format'];
  delete eslintOptions['sof'];
  delete eslintOptions['sf'];

  const filteredEslintOptions = filterCliOptions(eslintOptions);

  const eslintArgs = {
    _: files,
    ...filteredEslintOptions,
  };

  try {
    const eslintCommand = options['eslint-command'] || 'eslint';
    const result = await runEslintWithStats(
      eslintCommand,
      eslintArgs,
      statsOptions
    );

    if (result.code !== 0) {
      process.exit(result.code || 1);
    }
  } catch (error) {
    // error is logged by runEslintWithStats
    process.exit(1);
  }
}
