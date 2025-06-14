import { ascending, descending } from 'd3-array';
import { FileEntry, RuleEntry } from './extract';

export type SortableField = 'time' | 'errors' | 'warnings' | 'identifier';

export type SortableData = RuleEntry | FileEntry;

const accessors: Record<SortableField, (d: SortableData) => number | string> = {
  time: (d) => d.time,
  errors: (d) => d.errors,
  warnings: (d) => d.warnings,
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
