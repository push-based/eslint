import { TimeEntry, ProcessedTimeEntry } from '../models/eslint-stats.schema';

export function calculateGrandTotal(entries: TimeEntry[]): number {
  let total = 0;
  const stack = [...entries];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (entry) {
      total += entry.timeMs;
      if (entry.children) {
        // Add children to the stack to process them
        for (let i = entry.children.length - 1; i >= 0; i--) {
          stack.push(entry.children[i]);
        }
      }
    }
  }
  return total;
}

export function processTimesRecursive(
  entries: TimeEntry[],
  grandTotal: number
): ProcessedTimeEntry[] {
  return entries.map((entry): ProcessedTimeEntry => {
    const relativeVal = grandTotal > 0 ? (entry.timeMs * 100) / grandTotal : -1;
    const processedChildren = entry.children
      ? processTimesRecursive(entry.children, grandTotal)
      : undefined;

    return {
      ...entry,
      relativePercent: relativeVal,
      ...(processedChildren && { children: processedChildren }),
    } as ProcessedTimeEntry;
  });
}

export function calculateMsAndRelativePercent(
  entries: TimeEntry[]
): ProcessedTimeEntry[] {
  const grandTotal = calculateGrandTotal(entries);
  return processTimesRecursive(entries, grandTotal);
}

export function processInRelativeContext(
  entries: TimeEntry[],
  grandTotal: number
): ProcessedTimeEntry[] {
  return entries.map((entry): ProcessedTimeEntry => {
    const relativeVal = grandTotal > 0 ? (entry.timeMs * 100) / grandTotal : -1;
    const processedChildren = entry.children
      ? processInRelativeContext(entry.children, entry.timeMs)
      : undefined;

    return {
      ...entry,
      relativePercent: relativeVal,
      ...(processedChildren && { children: processedChildren }),
    } as ProcessedTimeEntry;
  });
}
