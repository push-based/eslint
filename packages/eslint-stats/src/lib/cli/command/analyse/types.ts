export enum group {
  rule = 'rule',
  file = 'file',
  'file-rule' = 'file-rule',
}

export enum sort {
  time = 'time',
  error = 'error',
  warning = 'warning',
  identifier = 'identifier',
}

export enum sortDirection {
  asc = 'asc',
  desc = 'desc',
}

export interface AnalyseArgs {
  file: string;
  groupBy: group;
  sortBy: sort;
  sortDirection: sortDirection;
  take?: (string | number)[];
  interactive?: boolean;
}
