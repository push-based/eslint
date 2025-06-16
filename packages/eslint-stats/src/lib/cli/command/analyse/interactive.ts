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
import { computeTotals } from '../../../parse/eslint-result-visitor';
import { RootStatsNode } from '../../../parse/eslint-result-visitor';
import { formatTotalsLine, TotalsData } from '../../../stats/format';
import { createInfoExplanation } from './info.screen';

export function handleGlobalActions(
  key: string,
  state: InteractiveCommandState,
  processedStats: RootStatsNode
) {
  if (state.lastAction === 'write' && state.outputPath) {
    handleWriteAction(state, state.outputPath, state.file, processedStats);
  }
  if (state.lastAction === 'info') {
    return handleInfoAction(state, processedStats);
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
  const isFileRuleView = groupByOptions[state.groupByIndex] === 'file-rule';

  // Handle layer switching for file-rule view
  if (isFileRuleView && (key === 'f' || key === 'F')) {
    return {
      ...newState,
      activeLayer: 'file',
      lastAction: 'layer',
    };
  }

  if (isFileRuleView && (key === 'r' || key === 'R')) {
    return {
      ...newState,
      activeLayer: 'rule',
      lastAction: 'layer',
    };
  }

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
        // Reset active layer when switching views
        activeLayer: undefined,
      };
    case SHIFT_TAB:
      return {
        ...newState,
        groupByIndex:
          (state.groupByIndex - 1 + groupByOptions.length) %
          groupByOptions.length,
        lastAction: 'group',
        // Reset active layer when switching views
        activeLayer: undefined,
      };
    case PLUS:
    case MINUS:
      if (isFileRuleView) {
        // Handle file-rule view with layer-specific control
        const take = [...state.take];
        const activeLayer = state.activeLayer || 'file'; // Default to file layer
        const layerIndex = activeLayer === 'file' ? 0 : 1;

        // Ensure we have at least 2 elements in take array
        if (take.length < 2) {
          take.push(take[0] || 10); // Use first value or default to 10
        }

        const currentValue = take[layerIndex] || 10;
        take[layerIndex] =
          key === PLUS ? currentValue + 1 : Math.max(1, currentValue - 1);

        return {
          ...newState,
          take,
          lastAction: 'rows',
          activeLayer, // Ensure activeLayer is set
        };
      } else {
        // Original behavior for non-file-rule views
        return {
          ...newState,
          take: state.take.map((n) =>
            key === PLUS ? n + 1 : Math.max(1, n - 1)
          ),
          lastAction: 'rows',
        };
      }
    case ENTER:
      if (state.outputPath) {
        return {
          ...newState,
          lastAction: 'write',
        };
      }
      return state;
    case 'i':
    case 'I':
      return {
        ...newState,
        lastAction: 'info',
      };
    default:
      return state;
  }
}

// Type-safe mapping functions
const sortFieldMap = {
  time: 'totalTime',
  error: 'errorCount',
  warning: 'warningCount',
  identifier: 'identifier',
} as const;

function mapSortByOptionToField(
  option: SortByOption
): 'totalTime' | 'errorCount' | 'warningCount' | 'identifier' {
  return sortFieldMap[option];
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
    default: {
      // This should never happen due to exhaustive checking
      const _exhaustive: never = option;
      throw new Error(`Unhandled group option: ${_exhaustive}`);
    }
  }
}

export function handleWriteAction(
  state: InteractiveCommandState,
  outputPath: string,
  analyzedFilePath: string,
  processedStats: RootStatsNode
): InteractiveCommandState {
  const outputName = path.basename(outputPath);

  const { groupByIndex, sortByIndex, sortOrder, take } = state;
  const groupBy = groupByOptions[groupByIndex];
  const sortBy = mapSortByOptionToField(sortByOptions[sortByIndex]);
  const stateDescription = `> State: Group by **${groupBy}**, Sort by **${sortBy}** (${sortOrder}), Rows: **${take.join(
    ', '
  )}**`;

  const tableOptions = convertInteractiveStateToViewOptions(state);
  const tableContent = renderInteractiveEsLintStatsView(
    tableOptions,
    processedStats
  );

  const newContent = `${ansis.strip(stateDescription)}\n\n${ansis.strip(
    tableContent.join('\n')
  )}`;
  let contentToAppend: string;

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    contentToAppend = `\n\n---\n\n${newContent}`;
  } else {
    const analyzedFileName = path.basename(analyzedFilePath);
    const totalStatsLine = processedStats
      ? ansis.strip(createTotalStatsLine(processedStats, state))
      : '';
    const fileHeader = `# Eslint Stats Analysis\n\nFile: **${analyzedFileName}**\n\n${totalStatsLine}\n\n---\n\n${newContent}`;
    contentToAppend = fileHeader;
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
      ? state.take.length > 1
        ? [state.take[0], state.take[1]] // Use separate limits for files and rules
        : [state.take[0], state.take[0]] // Use same limit for both if only one provided
      : [10, 10]; // Default to 10 for both

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

function createTotalStatsLine(
  processedStats: RootStatsNode,
  state?: InteractiveCommandState
): string {
  const totals = computeTotals(processedStats.children);
  const currentView = state ? groupByOptions[state.groupByIndex] : 'rule';
  const filePath = state ? state.file : undefined;
  const decodedCommand = processedStats.decodedCommand;

  return formatTotalsLine(
    totals as TotalsData,
    currentView,
    filePath,
    decodedCommand
  );
}

export function startInteractiveSession(
  processedStats: RootStatsNode,
  state: InteractiveCommandState
): void {
  const renderScreen = (state: InteractiveCommandState) => {
    // If showing info, render info screen instead of table
    if (state.lastAction === 'info') {
      const infoExplanation = createInfoExplanation(state, processedStats);
      return [createInteractiveOptions(state), '', infoExplanation];
    }

    // Normal table rendering
    const tableOptions = convertInteractiveStateToViewOptions(state);
    const totalStatsLine = createTotalStatsLine(processedStats, state);
    return [
      createInteractiveOptions(state),
      '',
      totalStatsLine,
      '',
      ...renderInteractiveEsLintStatsView(tableOptions, processedStats),
    ];
  };

  setupStdin(
    (key: string) => {
      state = updateStateOnKeyPress(key, state);

      const sceneContent = renderScreen(state);

      handleGlobalActions(key, state, processedStats);

      reprintSection(sceneContent);
    },
    () => process.exit(0)
  );

  reprintSection(renderScreen(state));
}

export function reprintSection(newTexts: string[]): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\u001Bc'); // Reset terminal
    process.stdout.write('\u001B[2J'); // Clear screen
    process.stdout.write('\u001B[H'); // Move to home position
  } else {
    // Fallback for non-TTY environments
    console.clear();
  }

  const output = newTexts.join('\n');
  process.stdout.write(output);
}

function handleInfoAction(
  state: InteractiveCommandState,
  processedStats: RootStatsNode
): InteractiveCommandState {
  const explanation = createInfoExplanation(state, processedStats);

  return {
    ...state,
    lastAction: undefined,
    notification: explanation,
  };
}
