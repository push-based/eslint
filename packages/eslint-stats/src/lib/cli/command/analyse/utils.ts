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

  // Base controls with normal styling
  const groupControl = `${ansis.cyan('Group:')} ${ansis.yellow(
    paddedGroupBy
  )} ${ansis.gray('(↹)')}`;
  const sortControl = `${ansis.cyan('Sort:')} ${ansis.yellow(
    paddedSortBy
  )} ${ansis.gray('(←/→)')}`;
  const orderControl = `${ansis.cyan('Order:')} ${ansis.yellow(
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
        ? ansis.bold.green('[F]')
        : ansis.bold.blue('[R]');

    rowsControl = `${ansis.cyan('Rows:')} ${ansis.yellow(
      `F:${fileLimit},R:${ruleLimit}`
    )} ${ansis.gray('(+/−)')} ${layerIndicator}`;
  } else {
    rowsControl = `${ansis.cyan('Rows:')} ${ansis.yellow(
      take.join(',')
    )} ${ansis.gray('(+/−)')}`;
  }

  // Apply bold only to the active action while preserving colors
  const finalGroupControl =
    lastAction === 'group'
      ? `${ansis.bold.cyan('Group:')} ${ansis.bold.yellow(
          paddedGroupBy
        )} ${ansis.bold.gray('(↹)')}`
      : groupControl;
  const finalSortControl =
    lastAction === 'sort'
      ? `${ansis.bold.cyan('Sort:')} ${ansis.bold.yellow(
          paddedSortBy
        )} ${ansis.bold.gray('(←/→)')}`
      : sortControl;
  const finalOrderControl =
    lastAction === 'order'
      ? `${ansis.bold.cyan('Order:')} ${ansis.bold.yellow(
          sortOrder === 'desc' ? '↓' : '↑'
        )} ${ansis.bold.gray('(↑/↓)')}`
      : orderControl;
  const finalRowsControl =
    lastAction === 'rows' || lastAction === 'layer'
      ? isFileRuleView
        ? `${ansis.bold.cyan('Rows:')} ${ansis.bold.yellow(
            `F:${take[0] || 10},R:${take[1] || take[0] || 10}`
          )} ${ansis.bold.gray('(+/−)')} ${
            (activeLayer || 'file') === 'file'
              ? ansis.bold.green('[F]')
              : ansis.bold.blue('[R]')
          }`
        : `${ansis.bold.cyan('Rows:')} ${ansis.bold.yellow(
            take.join(',')
          )} ${ansis.bold.gray('(+/−)')}`
      : rowsControl;

  // First row: Main options
  const firstRow = [
    finalGroupControl,
    finalSortControl,
    finalOrderControl,
    finalRowsControl,
  ].join(' · ');

  // Second row: Action options
  const quitControl = `${ansis.cyan('Quit:')} ${ansis.yellow('⌃C')}`;
  const infoControl = `${ansis.cyan('Info:')} ${ansis.yellow('I')}`;
  const finalInfoControl =
    lastAction === 'info'
      ? `${ansis.bold.cyan('Info:')} ${ansis.bold.yellow('I')}`
      : infoControl;

  const actionControls = [];

  if (outputPath) {
    const writeControl = `${ansis.cyan('Write:')} ${ansis.yellow('⏎')}`;
    const finalWriteControl =
      lastAction === 'write'
        ? `${ansis.bold.cyan('Write:')} ${ansis.bold.yellow('⏎')}`
        : writeControl;
    actionControls.push(finalWriteControl);
  }

  actionControls.push(finalInfoControl);
  actionControls.push(quitControl);
  const secondRow = actionControls.join(' · ');

  // Combine both rows
  const header = `${firstRow}\n${secondRow}`;

  if (notification) {
    return `${ansis.green(notification)}\n${header}`;
  }
  return header;
}
