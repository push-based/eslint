import { ascending, descending } from 'd3-array';
import { StatsRow } from './stats-hierarchy';

export type SortableField =
  | 'totalTime'
  | 'errorCount'
  | 'warningCount'
  | 'identifier';

export type SortableData = StatsRow;

const accessors: Record<SortableField, (d: SortableData) => number | string> = {
  totalTime: (d) => d.totalTime,
  errorCount: (d) => d.errorCount,
  warningCount: (d) => d.warningCount,
  identifier: (d) => d.identifier,
};

export function sortEntries(
  entries: SortableData[],
  sortBy: SortableField,
  sortDirection: 'asc' | 'desc'
): SortableData[] {
  const comparator = sortDirection === 'asc' ? ascending : descending;

  return [...entries].sort((a, b) =>
    comparator(accessors[sortBy](a), accessors[sortBy](b))
  );
}
