import ansis from 'ansis';

import {
  ARROW_DOWN,
  ARROW_LEFT,
  ARROW_RIGHT,
  ARROW_UP,
  CTRL_C,
  MINUS,
  PLUS,
  SHIFT_TAB,
  TAB,
  ENTER,
} from './constants';

import * as fs from 'fs';
import * as path from 'path';

import { ESLint } from 'eslint';
import {
  renderInteractiveEsLintStatsView,
  EslintStatsViewOptions,
} from '../../../stats';
import {
  groupByOptions,
  InteractiveCommandState,
  sortByOptions,
  SortByOption,
  GroupByOption,
} from './command-state';
import { createInteractiveOptions } from './utils';
import { processEslintResults } from '../../../parse';

export function handleGlobalActions(
  key: string,
  state: InteractiveCommandState,
  sceneContent: string[]
) {
  if (state.lastAction === 'write' && state.outputPath) {
    handleWriteAction(
      state,
      sceneContent.join('\n'),
      state.outputPath,
      state.file
    );
  }
  switch (key) {
    case CTRL_C:
      process.exit(0);
      break;
    default:
      return;
  }
}

export function updateStateOnKeyPress(
  key: string,
  state: InteractiveCommandState
): InteractiveCommandState {
  const newState = { ...state, notification: undefined };
  switch (key) {
    case ARROW_RIGHT:
      return {
        ...newState,
        sortByIndex: (state.sortByIndex + 1) % sortByOptions.length,
        lastAction: 'sort',
      };
    case ARROW_LEFT:
      return {
        ...newState,
        sortByIndex:
          (state.sortByIndex - 1 + sortByOptions.length) % sortByOptions.length,
        lastAction: 'sort',
      };
    case ARROW_UP:
    case ARROW_DOWN:
      return {
        ...newState,
        sortOrder: state.sortOrder === 'desc' ? 'asc' : 'desc',
        lastAction: 'order',
      };
    case TAB:
      return {
        ...newState,
        groupByIndex: (state.groupByIndex + 1) % groupByOptions.length,
        lastAction: 'group',
      };
    case SHIFT_TAB:
      return {
        ...newState,
        groupByIndex:
          (state.groupByIndex - 1 + groupByOptions.length) %
          groupByOptions.length,
        lastAction: 'group',
      };
    case PLUS:
      return {
        ...newState,
        take: state.take.map((n) => n + 1),
        lastAction: 'rows',
      };
    case MINUS:
      return {
        ...newState,
        take: state.take.map((n) => Math.max(1, n - 1)),
        lastAction: 'rows',
      };
    case ENTER:
      if (state.outputPath) {
        return {
          ...newState,
          lastAction: 'write',
        };
      }
      return state;
    default:
      return state;
  }
}

// Type-safe mapping functions
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

function mapGroupByOptionToViewName(
  option: GroupByOption
): 'rule' | 'file' | 'file-rule' {
  switch (option) {
    case 'rule':
      return 'rule';
    case 'file':
      return 'file';
    case 'file-rule':
      return 'file-rule';
    default:
      // This should never happen due to exhaustive checking
      const _exhaustive: never = option;
      throw new Error(`Unhandled group option: ${_exhaustive}`);
  }
}

export function handleWriteAction(
  state: InteractiveCommandState,
  tableStr: string,
  outputPath: string,
  analyzedFilePath: string
): InteractiveCommandState {
  const outputName = path.basename(outputPath);

  const { groupByIndex, sortByIndex, sortOrder, take } = state;
  const groupBy = groupByOptions[groupByIndex];
  const sortBy = mapSortByOptionToField(sortByOptions[sortByIndex]);
  const stateDescription = `> State: Group by **${groupBy}**, Sort by **${sortBy}** (${sortOrder}), Rows: **${take.join(
    ', '
  )}**`;

  const newContent = `${stateDescription}\n\n${ansis.strip(tableStr)}`;
  let contentToAppend: string;

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    contentToAppend = `\n\n---\n\n${newContent}`;
  } else {
    const analyzedFileName = path.basename(analyzedFilePath);
    contentToAppend = `# Eslint Stats Analysis\n\nFile: **${analyzedFileName}**\n\n---\n\n${newContent}`;
  }

  fs.appendFileSync(outputPath, contentToAppend);
  return {
    ...state,
    lastAction: undefined,
    notification: `Appended to ${outputName}`,
  };
}

export function convertInteractiveStateToViewOptions(
  state: InteractiveCommandState
): EslintStatsViewOptions {
  const sortByValue = sortByOptions[state.sortByIndex];
  const sortBy = mapSortByOptionToField(sortByValue);
  const viewName = mapGroupByOptionToViewName(
    groupByOptions[state.groupByIndex]
  );

  // Convert take to a tuple format
  const take: [number, number?] =
    state.take && state.take.length > 0
      ? [state.take[0], state.take[0]] // Use the same limit for both files and rules
      : [10];

  return {
    sortBy,
    sortDirection: state.sortOrder,
    viewName,
    take,
  };
}

function setupStdin(onData: (key: string) => void, onExit: () => void) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (key: string) => {
    if (key === CTRL_C) {
      onExit();
    } else {
      onData(key);
    }
  });
}

export function startInteractiveSession(
  detailedStats: ESLint.LintResult[],
  state: InteractiveCommandState
): void {
  const processedStats = processEslintResults(detailedStats);

  const renderScreen = (state: InteractiveCommandState) => {
    const tableOptions = convertInteractiveStateToViewOptions(state);
    return [
      createInteractiveOptions(state),
      '',
      ...renderInteractiveEsLintStatsView(tableOptions, processedStats),
    ];
  };

  setupStdin(
    (key: string) => {
      state = updateStateOnKeyPress(key, state);

      const sceneContent = renderScreen(state);

      handleGlobalActions(key, state, sceneContent);

      reprintSection(sceneContent);
    },
    () => process.exit(0)
  );

  reprintSection(renderScreen(state));
}

export function reprintSection(newTexts: string[]): void {
  const output = newTexts.join('\n');
  process.stdout.write('\u001B[2J\u001B[0;0H' + output + '\u001B[0;0H');
}
