export const groupByOptions = ['rule', 'file', 'file-rule'] as const;
export const sortByOptions = ['time', 'violations'] as const;

export type GroupByOption = (typeof groupByOptions)[number];
export type SortByOption = (typeof sortByOptions)[number];

type SortOrder = 'asc' | 'desc';
type Action = 'group' | 'sort' | 'order' | 'rows' | 'write';

export interface InteractiveCommandState {
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
