import ansis from 'ansis';
import {
  groupByOptions,
  InteractiveCommandState,
  maxGroupByLength,
  maxSortByLength,
  sortByOptions,
} from './command-state';

export function createInteractiveOptions(
  state: InteractiveCommandState
): string {
  const {
    groupByIndex,
    sortByIndex,
    sortOrder,
    take,
    lastAction,
    notification,
    outputPath,
    activeLayer,
  } = state;
  const groupBy = groupByOptions[groupByIndex];
  const sortBy = sortByOptions[sortByIndex];
  const isFileRuleView = groupBy === 'file-rule';

  const paddedGroupBy = groupBy.padEnd(maxGroupByLength);
  const paddedSortBy = sortBy.padEnd(maxSortByLength);

  const groupControl = `${ansis.cyan('Group:')} ${ansis.yellow(
    paddedGroupBy
  )} ${ansis.gray('(Tab)')}`;
  const sortControl = `${ansis.cyan('Sort ←/→:')} ${ansis.yellow(
    paddedSortBy
  )} ${ansis.gray('(←/→)')}`;
  const orderControl = `${ansis.cyan('Order ↑/↓:')} ${ansis.yellow(
    sortOrder === 'desc' ? '↓' : '↑'
  )} ${ansis.gray('(↑/↓)')}`;

  // Create rows control based on view type
  let rowsControl: string;
  if (isFileRuleView) {
    const fileLimit = take[0] || 10;
    const ruleLimit = take[1] || fileLimit;
    const currentLayer = activeLayer || 'file';
    const layerIndicator =
      currentLayer === 'file'
        ? ansis.bold.green('[Files]')
        : ansis.bold.blue('[Rules]');

    rowsControl = `${ansis.cyan('Rows:')} ${ansis.yellow(
      `F:${fileLimit}, R:${ruleLimit}`
    )} ${ansis.gray('(+/-)')} ${layerIndicator} ${ansis.gray(
      '(F/R to switch)'
    )}`;
  } else {
    rowsControl = `${ansis.cyan('Rows:')} ${ansis.yellow(
      take.join(', ')
    )} ${ansis.gray('(+/-)')}`;
  }

  // First row: Main options
  const firstRow = [
    lastAction === 'group' ? ansis.bold(groupControl) : groupControl,
    lastAction === 'sort' ? ansis.bold(sortControl) : sortControl,
    lastAction === 'order' ? ansis.bold(orderControl) : orderControl,
    lastAction === 'rows' || lastAction === 'layer'
      ? ansis.bold(rowsControl)
      : rowsControl,
  ].join(' | ');

  // Second row: Action options
  const quitControl = `${ansis.cyan('Quit:')} ${ansis.yellow('Ctrl+C')}`;

  const actionControls = [];

  if (outputPath) {
    const writeControlStr = `${ansis.cyan('Write:')} ${ansis.yellow('Enter')}`;
    const writeControl =
      lastAction === 'write' ? ansis.bold(writeControlStr) : writeControlStr;
    actionControls.push(writeControl);
  }

  actionControls.push(quitControl);
  const secondRow = actionControls.join(' | ');

  // Combine both rows
  const header = `${firstRow}\n${secondRow}`;

  if (notification) {
    return `${ansis.green(notification)}\n${header}`;
  }
  return header;
}
