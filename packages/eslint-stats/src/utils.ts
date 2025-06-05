import { LintResults } from './types';

// User-defined types (rule times as strings)
export type AggregatedRuleTimes = {
  [ruleName: string]: string;
};

export type AggregatedTimes = AggregatedRuleTimes & {
  timeMs: number;
};

export type AggregatedTimesRelativePercentage = AggregatedTimes & {
  relativePercent: number; // Raw percentage, or -1 if total is 0
};

// Type for the output of aggregatePerRule (rule times as numbers)
export type NumericAggregatedTimes = Record<string, number>;

// Generic interface for processed time entries - might become unused by formatAggregatedTimesForDisplay
export interface ProcessedTimeEntry<TIdentifier extends string = string> {
  identifier: TIdentifier;
  timeMs: number;
  relativePercent: number; // Numeric relative percentage, or -1 if total is 0
}

/**
 * Aggregates ESLint rule execution times from an array of linting results.
 *
 * @param {LintResults} lintResults - An array of ESLint result objects for multiple files.
 * @returns {NumericAggregatedTimes} An object where keys are rule names and values are their
 * total aggregated execution time in milliseconds across all files.
 */
export function aggregatePerRule(
  lintResults: LintResults
): NumericAggregatedTimes {
  return lintResults
    .flatMap((fileResult) => {
      const rules = fileResult.stats?.times?.passes?.[0]?.rules;
      if (!rules) {
        return [];
      }
      return Object.entries(rules).map(([ruleName, ruleStats]) => ({
        ruleName,
        ruleTime: ruleStats?.total || 0,
      }));
    })
    .reduce((acc: NumericAggregatedTimes, { ruleName, ruleTime }) => {
      acc[ruleName] = (acc[ruleName] || 0) + ruleTime;
      return acc;
    }, {});
}

export function aggregatePerFile(
  lintResults: LintResults
): NumericAggregatedTimes {
  return lintResults.reduce((acc: NumericAggregatedTimes, fileResult) => {
    const filePath = fileResult.filePath;
    let fileTime = 0;
    const passes = fileResult.stats?.times?.passes;
    if (passes && passes.length > 0) {
      fileTime = passes.reduce(
        (sum, pass) => sum + (pass?.total || 0), // Sum total of each pass
        0
      );
    }

    if (filePath) {
      acc[filePath] = (acc[filePath] || 0) + fileTime;
    }
    return acc;
  }, {});
}

export function calculateProcessedTimeEntries(
  aggregatedTimes: NumericAggregatedTimes
): ProcessedTimeEntry<string>[] {
  const total = Object.values(aggregatedTimes).reduce(
    (sum, time) => sum + time,
    0
  );
  const entries: [string, number][] = Object.entries(aggregatedTimes);

  return entries.map(([key, timeValue]): ProcessedTimeEntry<string> => {
    const relativeVal = total > 0 ? (timeValue * 100) / total : -1;
    return {
      identifier: key,
      timeMs: timeValue,
      relativePercent: relativeVal,
    };
  });
}

export function formatAggregatedTimesForDisplay(
  processedEntries: ProcessedTimeEntry<string>[]
): Record<string, string>[] {
  // Sort by timeMs descending
  const sortedEntries = [...processedEntries].sort(
    (a, b) => b.timeMs - a.timeMs
  );

  return sortedEntries.map(({ identifier, timeMs, relativePercent }) => {
    return {
      identifier,
      timeMs: timeMs.toFixed(3),
      relativePercent:
        relativePercent === -1 ? 'N/A' : relativePercent.toFixed(1) + '%',
    };
  });
}
