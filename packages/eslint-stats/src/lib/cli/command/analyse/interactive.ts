import ansis from 'ansis';
import { renderTable, ShowOption } from '../../../reporting/render-table';
import { reprintSection } from './utils';
import { AnalyseArgs } from './analyse.command';
import { DetailedRuleStat } from '../../../models/eslint-stats.schema';
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
import { getRowsToRender } from './processing';
import { terminalFormat } from '../../../reporting/terminal-format';
import {
  getFirstColumnHeader,
  getTableHeaders,
} from '../../../reporting/table-headers';
import * as fs from 'fs';
import * as path from 'path';
import { formatAggregatedTimesForDisplay } from '../../../reporting/format';

type DetailedRuleStats = DetailedRuleStat[];
type SortOrder = 'asc' | 'desc';
type Action = 'group' | 'sort' | 'order' | 'rows' | 'write';

interface InteractiveState {
  groupByIndex: number;
  sortByIndex: number;
  sortOrder: SortOrder;
  take: number[];
  lastAction: Action | null;
  notification?: string;
  outputPath?: string;
}

const groupByOptions = ['rule', 'file', 'file-rule'] as const;
const sortByOptions = ['time', 'violations'] as const;
const maxGroupByLength = Math.max(...groupByOptions.map((s) => s.length));
const maxSortByLength = Math.max(...sortByOptions.map((s) => s.length));

function initInteractiveState(argv: AnalyseArgs): InteractiveState {
  const outputPath = argv.outPath
    ? path.resolve(argv.outPath)
    : path.resolve(
        path.dirname(argv.file),
        path.basename(argv.file, path.extname(argv.file)) + '.md'
      );

  return {
    groupByIndex: groupByOptions.indexOf(argv.groupBy as any),
    sortByIndex: sortByOptions.indexOf(argv.sortBy as any),
    sortOrder: 'desc',
    take: argv.take?.map((n) => Number(n)) ?? [10],
    lastAction: 'sort',
    notification: undefined,
    outputPath,
  };
}

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

function createInteractivLegend(state: InteractiveState): string {
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

function renderInteractiveView(
  state: InteractiveState,
  detailedStats: DetailedRuleStats,
  show: ShowOption[]
): string {
  const { groupByIndex, sortByIndex, sortOrder, take, lastAction } = state;
  const groupBy = groupByOptions[groupByIndex];
  const sortBy = sortByOptions[sortByIndex];

  const processedData = getRowsToRender(detailedStats, {
    groupBy,
    sortBy,
    sortOrder,
    take,
    show,
  });
  const formattedData = formatAggregatedTimesForDisplay(processedData);

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

  const tableStr = renderTable(terminalFormat(formattedData), {
    headers: headers,
    show,
  });

  const header = createInteractivLegend(state);

  const linesToPrint = [header, '', tableStr];
  reprintSection(linesToPrint);
  return tableStr;
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
    lastAction: null,
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
  detailedStats: DetailedRuleStats,
  argv: AnalyseArgs
): void {
  let state = initInteractiveState(argv);

  const { show, file } = argv;

  let tableStr: string;

  const renderScreen = () =>
    (tableStr = renderInteractiveView(
      state,
      detailedStats,
      show as ShowOption[]
    ));

  setupStdin(
    (key: string) => {
      state = handleKeyPress(key, state);
      if (state.lastAction === 'write' && state.outputPath) {
        state = handleWriteAction(state, tableStr, state.outputPath, file);
      }
      renderScreen();
    },
    () => process.exit(0)
  );

  console.clear();
  renderScreen();
}
