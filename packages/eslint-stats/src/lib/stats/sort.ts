import type { ProcessedTimeEntry } from '../models/eslint-stats.schema';

export type SortKey =
  | 'time'
  | 'errors'
  | 'warnings'
  | 'fixableErrors'
  | 'fixableWarnings'
  | 'fixableSuggestionCount'
  | 'manuallyFixable';

export type SortOptions = {
  key?: 'time' | 'violations'; // legacy for backward compatibility
  keys?: SortKey[];
  order?: 'asc' | 'desc';
};

export function sortRules(
  entries: ProcessedTimeEntry[],
  options: SortOptions = {}
): ProcessedTimeEntry[] {
  const { order = 'desc' } = options;

  const getSortKeys = (): SortKey[] => {
    if (options.keys) {
      return options.keys;
    }
    if (options.key === 'violations') {
      return ['errors', 'warnings'];
    }
    return ['time']; // Default
  };

  const sortKeys = getSortKeys();

  // Sort the current level of entries
  entries.sort((a, b) => {
    for (const key of sortKeys) {
      let diff = 0;
      switch (key) {
        case 'time':
          diff = (b.timeMs || 0) - (a.timeMs || 0);
          break;
        case 'errors':
          diff = (b.errorCount || 0) - (a.errorCount || 0);
          break;
        case 'warnings':
          diff = (b.warningCount || 0) - (a.warningCount || 0);
          break;
        case 'manuallyFixable':
          diff = (b.manuallyFixable ? 1 : 0) - (a.manuallyFixable ? 1 : 0);
          break;
      }
      if (diff !== 0) {
        return order === 'desc' ? diff : -diff;
      }
    }

    // Secondary sort by identifier (e.g., rule name or file path)
    return a.identifier.localeCompare(b.identifier);
  });

  // Recursively sort children
  for (const entry of entries) {
    if (entry.children && entry.children.length > 0) {
      entry.children = sortRules(entry.children, options);
    }
  }

  return entries;
}
