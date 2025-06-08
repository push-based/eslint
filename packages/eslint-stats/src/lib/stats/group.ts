import {
  type DetailedRuleStat,
  type TimeEntry,
} from '../models/eslint-stats.schema';

export function updateGroupedStats(entry: TimeEntry, stat: DetailedRuleStat) {
  const { timeMs, fixable, manuallyFixable, severity } = stat;

  entry.timeMs += timeMs;
  entry.fixable = entry.fixable || fixable;
  entry.manuallyFixable = entry.manuallyFixable || manuallyFixable;

  if (severity === 1) {
    entry.warningCount = (entry.warningCount || 0) + 1;
  }
  if (severity === 2) {
    entry.errorCount = (entry.errorCount || 0) + 1;
  }
}

/**
 * Aggregates ESLint rule execution times from an array of linting results.
 *
 * @param {DetailedRuleStat[]} detailedStats - An array of DetailedRuleStat objects.
 * @returns {TimeEntry[]} An array of TimeEntry objects representing rule execution times.
 */
export function groupByRule(detailedStats: DetailedRuleStat[]): TimeEntry[] {
  const ruleMap = new Map<string, TimeEntry>();

  for (const stat of detailedStats) {
    const { ruleId } = stat;

    let entry = ruleMap.get(ruleId);
    if (!entry) {
      entry = {
        identifier: ruleId,
        timeMs: 0,
        warningCount: 0,
        errorCount: 0,
        fixable: false,
        manuallyFixable: false,
      };
      ruleMap.set(ruleId, entry);
    }

    updateGroupedStats(entry, stat);
  }
  return Array.from(ruleMap.values());
}

export function groupByFile(detailedStats: DetailedRuleStat[]): TimeEntry[] {
  const fileProblemMap = new Map<
    string,
    {
      timeMs: number;
      manuallyFixable: boolean;
      problems: { fixable: boolean }[];
      warningCount: number;
      errorCount: number;
    }
  >();

  for (const stat of detailedStats) {
    const { filePath, timeMs, manuallyFixable, severity, fixable } = stat;

    let entry = fileProblemMap.get(filePath);
    if (!entry) {
      entry = {
        timeMs: 0,
        manuallyFixable: false,
        problems: [],
        warningCount: 0,
        errorCount: 0,
      };
      fileProblemMap.set(filePath, entry);
    }

    entry.timeMs += timeMs;
    entry.manuallyFixable = entry.manuallyFixable || manuallyFixable;

    if (severity === 1) {
      entry.warningCount++;
      entry.problems.push({ fixable });
    }
    if (severity === 2) {
      entry.errorCount++;
      entry.problems.push({ fixable });
    }
  }

  const results: TimeEntry[] = [];
  for (const [filePath, aggregation] of fileProblemMap.entries()) {
    results.push({
      identifier: filePath,
      timeMs: aggregation.timeMs,
      manuallyFixable: aggregation.manuallyFixable,
      warningCount: aggregation.warningCount,
      errorCount: aggregation.errorCount,
      fixable:
        aggregation.problems.length > 0 &&
        aggregation.problems.every((p) => p.fixable),
    });
  }

  return results;
}

// New function for groupBy: 'file-rule'
export function groupByFileAndRule(
  detailedStats: DetailedRuleStat[]
): TimeEntry[] {
  const fileMap = new Map<
    string,
    TimeEntry & { rules: Map<string, TimeEntry> }
  >();

  for (const stat of detailedStats) {
    const { filePath, ruleId, timeMs, fixable, manuallyFixable, severity } =
      stat;

    let fileEntry = fileMap.get(filePath);
    if (!fileEntry) {
      fileEntry = {
        identifier: filePath,
        timeMs: 0,
        children: [],
        warningCount: 0,
        errorCount: 0,
        fixable: false,
        manuallyFixable: false,
        rules: new Map<string, TimeEntry>(),
      };
      fileMap.set(filePath, fileEntry);
    }

    // Aggregate file-level stats
    fileEntry.timeMs += timeMs;
    fileEntry.manuallyFixable = fileEntry.manuallyFixable || manuallyFixable;
    if (severity === 1) {
      fileEntry.warningCount = (fileEntry.warningCount || 0) + 1;
    }
    if (severity === 2) {
      fileEntry.errorCount = (fileEntry.errorCount || 0) + 1;
    }

    let ruleEntry = fileEntry.rules.get(ruleId);
    if (!ruleEntry) {
      ruleEntry = {
        identifier: ruleId,
        timeMs: 0,
        warningCount: 0,
        errorCount: 0,
        fixable: false,
        manuallyFixable: false,
      };
      fileEntry.rules.set(ruleId, ruleEntry);
    }

    // Aggregate rule-level stats
    ruleEntry.timeMs += timeMs;
    ruleEntry.fixable = ruleEntry.fixable || fixable;
    ruleEntry.manuallyFixable = ruleEntry.manuallyFixable || manuallyFixable;
    if (severity === 1) {
      ruleEntry.warningCount = (ruleEntry.warningCount || 0) + 1;
    }
    if (severity === 2) {
      ruleEntry.errorCount = (ruleEntry.errorCount || 0) + 1;
    }
  }

  // A file is fixable if all of its rules with errors/warnings are fixable.
  for (const fileEntry of fileMap.values()) {
    const rulesWithProblems = Array.from(fileEntry.rules.values()).filter(
      (r) => r.warningCount > 0 || r.errorCount > 0
    );
    fileEntry.fixable =
      rulesWithProblems.length > 0 && rulesWithProblems.every((r) => r.fixable);
  }

  return Array.from(fileMap.values()).map((fileEntry) => {
    const { rules, ...rest } = fileEntry;
    return {
      ...rest,
      children: Array.from(rules.values()),
    };
  });
}
