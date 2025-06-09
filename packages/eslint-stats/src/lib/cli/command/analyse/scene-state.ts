import path from 'path';
import { AnalyseArgs } from './analyse.command';

type SortOrder = 'asc' | 'desc';
type Action = 'group' | 'sort' | 'order' | 'rows' | 'write';

export const groupByOptions = ['rule', 'file', 'file-rule'] as const;
export const sortByOptions = ['time', 'violations'] as const;
export type GroupByOption = (typeof groupByOptions)[number];
export type SortByOption = (typeof sortByOptions)[number];

export interface InteractiveState {
  groupByIndex: number;
  sortByIndex: number;
  sortOrder: SortOrder;
  take: number[];
  lastAction?: Action;
  notification?: string;
  outputPath?: string;
  file: string;
  interactive: boolean;
}

export const maxGroupByLength = Math.max(
  ...groupByOptions.map((s) => s.length)
);
export const maxSortByLength = Math.max(...sortByOptions.map((s) => s.length));

export function initInteractiveState(argv: AnalyseArgs): InteractiveState {
  const outputPath = argv.outPath
    ? path.resolve(argv.outPath)
    : path.resolve(
        path.dirname(argv.file),
        path.basename(argv.file, path.extname(argv.file)) + '.md'
      );

  const take = argv.take?.map((n) => Number(n)) ?? [10];

  return {
    groupByIndex: groupByOptions.indexOf(argv.groupBy),
    sortByIndex: sortByOptions.indexOf(argv.sortBy),
    sortOrder: 'desc',
    take: take,
    lastAction: 'sort',
    notification: undefined,
    outputPath,
    file: argv.file,
    interactive: true,
  };
}
