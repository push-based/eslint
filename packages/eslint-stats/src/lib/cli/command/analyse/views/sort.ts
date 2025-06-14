import { FileEntry } from './extract';
import { RuleEntry } from './extract';

export type SortableField = 'time' | 'errors' | 'warnings' | 'identifier';

export type SortableData = RuleEntry | FileEntry;

export function sortEntries(
  entries: SortableData[],
  sortBy: SortableField,
  sortDirection: 'asc' | 'desc'
): SortableData[] {
  return [...entries].sort((a, b) => {
    const aValue = getSortValue(a, sortBy);
    const bValue = getSortValue(b, sortBy);

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });
}

function getSortValue(
  entry: SortableData,
  sortBy: SortableField
): number | string {
  switch (sortBy) {
    case 'time':
      return entry.time;
    case 'errors':
      return entry.errors;
    case 'warnings':
      return entry.warnings;
    case 'identifier':
      return 'ruleId' in entry ? entry.ruleId : entry.filePath;
    default:
      return 0;
  }
}
