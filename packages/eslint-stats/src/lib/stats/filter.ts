import { ProcessedFileResult } from '../parse/processed-eslint-result.types';
import { ProcessedRuleResult } from '../parse/processed-eslint-result.types';
import { isFile } from './sort';

export function getFirst<T extends ProcessedFileResult | ProcessedRuleResult>(
  entries: T | T[],
  count: number[] = [10]
): T | T[] {
  const [currentCount, ...restCount] = count;

  if (!Array.isArray(entries)) {
    // Single ProcessedFileResult - apply filtering to its rules if present
    if ('rules' in entries && entries.rules) {
      const processedRules = getFirst(
        entries.rules,
        restCount.length > 0 ? restCount : [currentCount]
      ) as ProcessedRuleResult[];

      return {
        ...entries,
        rules: processedRules,
      } as T;
    }
    return entries;
  }

  const limit = currentCount ?? entries.length;
  const slicedEntries = entries.slice(0, limit);

  const processedEntries = slicedEntries.map((entry: T) => {
    if (isFile(entry) && 'rules' in entry && entry.rules) {
      return {
        ...entry,
        rules: getFirst(
          entry.rules,
          restCount.length > 0 ? restCount : [currentCount]
        ) as ProcessedRuleResult[],
      } as T;
    }
    return entry;
  });

  return processedEntries;
}
