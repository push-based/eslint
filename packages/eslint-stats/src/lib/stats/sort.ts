import { ProcessedFile, ProcessedRule } from '../parse/eslint-result-visitor';

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

export const isFile = (
  entry: ProcessedFile | ProcessedRule
): entry is ProcessedFile => {
  return 'filePath' in entry;
};

const getIdentifier = (entry: ProcessedFile | ProcessedRule): string => {
  return isFile(entry) ? entry.filePath : entry.ruleId;
};

const getTimeMs = (entry: ProcessedFile | ProcessedRule): number => {
  return isFile(entry) ? entry.times.total : entry.time;
};

const getTotalErrors = (entry: ProcessedFile | ProcessedRule) => {
  if (isFile(entry)) {
    return entry.violations.errorCount;
  } else {
    return entry.violations.errorMessages.length;
  }
};

const getTotalWarnings = (entry: ProcessedFile | ProcessedRule) => {
  if (isFile(entry)) {
    return entry.violations.warningCount;
  } else {
    return entry.violations.warningMessages.length;
  }
};

export function sortEsLintStats<T extends ProcessedFile | ProcessedRule>(
  entries: T[],
  options: SortOptions = {}
): T[] {
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

  // Sort the entries
  const sortedEntries = [...entries].sort((a, b) => {
    for (const key of sortKeys) {
      let diff = 0;
      switch (key) {
        case 'time':
          diff = getTimeMs(b) - getTimeMs(a);
          break;
        case 'errors':
          diff = getTotalErrors(b) - getTotalErrors(a);
          break;
        case 'warnings':
          diff = getTotalWarnings(b) - getTotalWarnings(a);
          break;
      }
      if (diff !== 0) {
        return order === 'desc' ? diff : -diff;
      }
    }

    // Secondary sort by identifier (file path or rule ID)
    return getIdentifier(a).localeCompare(getIdentifier(b));
  });

  // For files, also sort their rules
  return sortedEntries.map((entry) => {
    if (isFile(entry) && 'rules' in entry && entry.rules) {
      return {
        ...entry,
        rules: sortEsLintStats(entry.rules, options),
      };
    }
    return entry;
  });
}
