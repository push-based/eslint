import type { ProcessedTimeEntry } from '../models/eslint-stats.schema';

export function getFirst(
  entries: ProcessedTimeEntry[],
  count: number[] = [10]
): ProcessedTimeEntry[] {
  const [currentCount, ...restCount] = count;

  const limit = currentCount ?? entries.length;
  const wasSliced = entries.length > limit;
  const slicedEntries = entries.slice(0, limit);

  const processedEntries = slicedEntries.map((entry) =>
    entry.children
      ? {
          ...entry,
          children: getFirst(
            entry.children,
            restCount.length > 0 ? restCount : [currentCount]
          ),
        }
      : entry
  );

  if (wasSliced) {
    processedEntries.push({
      identifier: '...',
      timeMs: 0,
      relativePercent: 0,
      warningCount: 0,
      errorCount: 0,
      fixable: false,
      manuallyFixable: false,
    });
  }

  return processedEntries;
}
