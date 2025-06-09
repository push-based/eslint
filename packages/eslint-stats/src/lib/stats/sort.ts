import {
  ProcessedFileResult,
  ProcessedRuleResult,
} from '../parse/processed-eslint-result.types';

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
  entry: ProcessedFileResult | ProcessedRuleResult
): entry is ProcessedFileResult => {
  return 'filePath' in entry;
};

const getIdentifier = (
  entry: ProcessedFileResult | ProcessedRuleResult
): string => {
  return isFile(entry) ? entry.filePath : entry.ruleId;
};

const getTimeMs = (
  entry: ProcessedFileResult | ProcessedRuleResult
): number => {
  return isFile(entry) ? entry.totalMs : entry.totalMs;
};

const getTotalErrors = (entry: ProcessedFileResult | ProcessedRuleResult) => {
  if (isFile(entry)) {
    return entry.totalErrors;
  } else {
    return entry.errors;
  }
};

const getTotalWarnings = (entry: ProcessedFileResult | ProcessedRuleResult) => {
  if (isFile(entry)) {
    return entry.totalWarnings;
  } else {
    return entry.warnings;
  }
};

export function sortEsLintStats<
  T extends ProcessedFileResult | ProcessedRuleResult
>(entries: T[], options: SortOptions = {}): T[] {
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
