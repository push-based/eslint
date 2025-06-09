import ansis from 'ansis';
import {
  flattenFormattedEntriesToRows,
  renderTable,
} from '../../../reporting/render-table';
import { reprintSection } from './utils';
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
import { sortEsLintStats } from '../../../stats/sort';
import {
  getFirstColumnHeader,
  getTableHeaders,
} from '../../../reporting/table-headers';
import * as fs from 'fs';
import * as path from 'path';
import { formatAggregatedTimesForDisplay } from '../../../reporting';
import {
  ProcessedEslintRulesStats,
  ProcessedRuleResult,
  ProcessedFileResult,
} from '../../../parse/processed-eslint-result.types';
import { ProcessedEslintResultTotals } from '../../../parse/totals';
import {
  ProcessedFileResultWithRelative,
  ProcessedRuleResultWithRelative,
} from '../../../stats/calc-times';
import {
  InteractiveState,
  sortByOptions,
  groupByOptions,
  maxGroupByLength,
  maxSortByLength,
} from './scene-state';
import { getFirst } from '../../../stats/filter';
import { groupByFile, groupByRule } from '../../../stats/grouping';
import { addStats } from '../../../stats/calc-times';

function handleKeyPress(
  key: string,
  state: InteractiveState
): InteractiveState {
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

function createInteractivOptions(state: InteractiveState): string {
  const {
    groupByIndex,
    sortByIndex,
    sortOrder,
    take,
    lastAction,
    notification,
    outputPath,
  } = state;
  const groupBy = groupByOptions[groupByIndex];
  const sortBy = sortByOptions[sortByIndex];

  const paddedGroupBy = groupBy.padEnd(maxGroupByLength);
  const paddedSortBy = sortBy.padEnd(maxSortByLength);

  const groupControl = `${ansis.cyan('Group:')} ${ansis.yellow(
    paddedGroupBy
  )} ${ansis.gray('(Tab)')}`;
  const sortControl = `${ansis.cyan('Sort:')} ${ansis.yellow(
    paddedSortBy
  )} ${ansis.gray('(←/→)')}`;
  const orderControl = `${ansis.cyan('Order:')} ${ansis.yellow(
    sortOrder === 'desc' ? '↓' : '↑'
  )} ${ansis.gray('(↑/↓)')}`;
  const rowsControl = `${ansis.cyan('Rows:')} ${ansis.yellow(
    take.join(', ')
  )} ${ansis.gray('(+/-)')}`;
  const quitControl = `${ansis.cyan('Quit:')} ${ansis.yellow('Ctrl+C')} `;

  const leftHeader = [
    lastAction === 'group' ? ansis.bold(groupControl) : groupControl,
    lastAction === 'sort' ? ansis.bold(sortControl) : sortControl,
    lastAction === 'order' ? ansis.bold(orderControl) : orderControl,
  ].join(' | ');
  const rightHeaderControls = [
    lastAction === 'rows' ? ansis.bold(rowsControl) : rowsControl,
  ];

  if (outputPath) {
    const writeControlStr = `${ansis.cyan('Write:')} ${ansis.yellow('Enter')}`;
    const writeControl =
      lastAction === 'write' ? ansis.bold(writeControlStr) : writeControlStr;
    rightHeaderControls.push(writeControl);
  }

  rightHeaderControls.push(quitControl);
  const rightHeader = rightHeaderControls.join(' | ');

  const header = `${leftHeader} | ${rightHeader}`;
  if (notification) {
    return `${ansis.green(notification)}\n${header}`;
  }
  return header;
}

export function renderInteractiveView(
  state: InteractiveState,
  detailedStats: ProcessedEslintRulesStats
): string {
  const { sortByIndex, sortOrder, take } = state;
  const sortBy = sortByOptions[sortByIndex];
  const groupBy = groupByOptions[state.groupByIndex];

  // Always use stats from original detailedStats
  const { processedResults: originalResults, ...stats } = detailedStats;

  let processedResults: ProcessedFileResult[] | ProcessedRuleResult[];
  let dataForSorting: (ProcessedFileResult | ProcessedRuleResult)[];

  if (groupBy === 'rule') {
    const groupedData = groupByRule(detailedStats);
    processedResults = groupedData.processedResults;
    const enrichedData = addStats(
      processedResults as ProcessedRuleResult[],
      stats
    );
    dataForSorting = enrichedData;
  } else if (groupBy === 'file') {
    const groupedData = groupByFile(detailedStats);
    processedResults = groupedData.processedResults;
    const enrichedData = addStats(
      processedResults as ProcessedFileResult[],
      stats
    );
    dataForSorting = enrichedData;
  } else {
    processedResults = originalResults;
    const enrichedData = addStats(processedResults, stats);
    dataForSorting = enrichedData;
  }

  const sortedData = sortEsLintStats(
    dataForSorting as ProcessedRuleResultWithRelative[],
    {
      key: sortBy as 'time' | 'violations',
      order: sortOrder,
    }
  );

  const firstItems = getFirst(sortedData, take);

  const formattedData = formatAggregatedTimesForDisplay(
    Array.isArray(firstItems) ? firstItems : [firstItems],
    stats
  );
  // Data is assumed to be pre-sorted and pre-sliced if necessary by the caller.
  // The flattenFormattedEntriesToRows function will handle hierarchy.
  const displayRows: string[][] = flattenFormattedEntriesToRows(formattedData);

  const tableStr = renderTable(displayRows, {
    headers: getHeaders(state),
    stats,
  });

  const interactiveOptions = state.interactive
    ? [createInteractivOptions(state)]
    : [''];
  const linesToPrint = [...interactiveOptions, '', tableStr];
  reprintSection(linesToPrint);
  return linesToPrint.join('\n');
}

function handleWriteAction(
  state: InteractiveState,
  tableStr: string,
  outputPath: string,
  analyzedFilePath: string
): InteractiveState {
  const outputName = path.basename(outputPath);

  const { groupByIndex, sortByIndex, sortOrder, take } = state;
  const groupBy = groupByOptions[groupByIndex];
  const sortBy = sortByOptions[sortByIndex];
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
  detailedStats: ProcessedEslintRulesStats,
  state: InteractiveState,
  filePath: string
): void {
  let tableStr: string;

  const renderScreen = () =>
    (tableStr = renderInteractiveView(state, detailedStats));

  setupStdin(
    (key: string) => {
      state = handleKeyPress(key, state);
      if (state.lastAction === 'write' && state.outputPath) {
        state = handleWriteAction(state, tableStr, state.outputPath, filePath);
      }
      renderScreen();
    },
    () => process.exit(0)
  );

  console.clear();
  renderScreen();
}

export function getHeaders(state: InteractiveState): string[] {
  const { groupByIndex, sortByIndex, sortOrder, lastAction } = state;
  const groupBy = groupByOptions[groupByIndex];
  const sortBy = sortByOptions[sortByIndex];

  const firstColumnHeader = getFirstColumnHeader(groupBy);
  const headers = getTableHeaders(firstColumnHeader);
  const sortArrow = sortOrder === 'desc' ? '↓' : '↑';
  if (sortBy === 'time') {
    headers[1] = `${headers[1]} ${sortArrow}`;
    headers[2] = `${headers[2]} ${sortArrow}`;
  } else if (sortBy === 'violations') {
    headers[3] = `${headers[3]} ${sortArrow}`;
    headers[4] = `${headers[4]} ${sortArrow}`;
  }

  if (lastAction === 'group') {
    headers[0] = ansis.bold(headers[0]);
  } else if (lastAction === 'sort' || lastAction === 'order') {
    if (sortBy === 'time') {
      headers[1] = ansis.bold(headers[1]);
      headers[2] = ansis.bold(headers[2]);
    } else if (sortBy === 'violations') {
      headers[3] = ansis.bold(headers[3]);
      headers[4] = ansis.bold(headers[4]);
    }
  }
  return headers;
}
