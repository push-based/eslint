import { AnalyseArgs } from './types';
import { startInteractiveSession } from './interactive';
import {
  groupByOptions,
  sortByOptions,
  InteractiveCommandState,
  SortByOption,
} from './command-state';
import {
  EslintStatsViewOptions,
  renderInteractiveEsLintStatsView,
  loadStats,
} from '../../../stats';
import { readFileSync } from 'fs';
import { ESLint } from 'eslint';
import * as path from 'path';

function initInteractiveState(argv: AnalyseArgs): InteractiveCommandState {
  const take = argv.take?.map((n: number | string) => Number(n)) ?? [10];
  const isFileRuleView = argv.groupBy === 'file-rule';

  // Ensure we have proper defaults for file-rule view
  const normalizedTake =
    isFileRuleView && take.length === 1
      ? [take[0], take[0]] // Use same limit for both files and rules if only one provided
      : take;

  // Create output path from input file with .md extension
  const parsedPath = path.parse(argv.file);
  const outputPath = path.join(parsedPath.dir, parsedPath.name + '.md');

  return {
    groupByIndex: groupByOptions.indexOf(argv.groupBy),
    sortByIndex: sortByOptions.indexOf(argv.sortBy),
    sortOrder: argv.sortDirection,
    take: normalizedTake,
    interactive: argv.interactive ?? false,
    file: argv.file,
    outputPath,
    activeLayer: isFileRuleView ? 'file' : undefined, // Initialize to 'file' for file-rule view
  };
}

// Type-safe mapping function for internal options
function mapSortByOptionToField(
  option: SortByOption
): 'totalTime' | 'errorCount' {
  switch (option) {
    case 'time':
      return 'totalTime';
    case 'violations':
      return 'errorCount';
    default:
      // This should never happen due to exhaustive checking
      const _exhaustive: never = option;
      throw new Error(`Unhandled sort option: ${_exhaustive}`);
  }
}

function convertInteractiveStateToEslintStatsViewState(
  state: InteractiveCommandState
): EslintStatsViewOptions {
  const sortByValue = sortByOptions[state.sortByIndex];
  const sortBy = mapSortByOptionToField(sortByValue);
  const viewName = groupByOptions[state.groupByIndex];

  // Ensure take is always a tuple of at least one number
  let take: [number, number?];
  if (!state.take || state.take.length === 0) {
    take = [10];
  } else if (state.take.length === 1) {
    take = [state.take[0]];
  } else {
    take = [state.take[0], state.take[1]];
  }

  return {
    sortBy,
    sortDirection: state.sortOrder,
    viewName,
    take,
  };
}

export async function analyseHandler(argv: AnalyseArgs): Promise<void> {
  try {
    // Ensure take is always a number array
    if (argv.take) {
      argv.take = argv.take.map((n: number | string) => Number(n));
    }

    const userRequestedInteractive = process.argv.includes('--interactive');
    const isInteractive =
      process.stdout.isTTY &&
      argv.interactive &&
      // When user explicitly uses --interactive flag, we ignore env var
      (userRequestedInteractive || !('DISABLE_AUTO_UPDATE' in process.env));

    const state = initInteractiveState(argv);

    if (!isInteractive) {
      // For non-interactive mode, use loadStats helper
      const detailedStats = loadStats(argv.file);
      const tableOptions = convertInteractiveStateToEslintStatsViewState(state);
      const result = renderInteractiveEsLintStatsView(
        tableOptions,
        detailedStats
      );
      console.log(result.join('\n'));
      return;
    }

    // For interactive mode, read and parse the raw lint results
    const jsonContent = readFileSync(argv.file, 'utf-8');
    const rawStats = JSON.parse(jsonContent) as ESLint.LintResult[];
    startInteractiveSession(rawStats, state);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('An unknown error occurred.');
    }
    process.exit(1);
  }
}
