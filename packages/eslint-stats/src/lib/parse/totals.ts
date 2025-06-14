import {ProcessedFile, ProcessedRule} from "./eslint-result-visitor";

/**
 * Common totals interface that can be used across different visitors and grouping strategies
 */
export interface ProcessedEslintResultTotals {
  totalFiles: number;
  totalRules: number;
  totalTimeMs: number;
  totalErrors: number;
  totalWarnings: number;
  totalFileErrors: number;
  totalFileWarnings: number;
  totalFixableErrors: number;
  totalFixableWarnings: number;
}

/**
 * Creates a totals tracker using functional composition
 * Returns an object with methods that close over shared state
 */
export function createProcessedTotalsTracker() {
  let totals: ProcessedEslintResultTotals = {
    totalFiles: 0,
    totalRules: 0,
    totalTimeMs: 0,
    totalErrors: 0,
    totalWarnings: 0,
    totalFileErrors: 0,
    totalFileWarnings: 0,
    totalFixableErrors: 0,
    totalFixableWarnings: 0,
  };

  return {
    trackFile(fileResult: ProcessedFile): void {
      totals.totalTimeMs += fileResult.times.total;
      totals.totalFiles += 1;
      totals.totalFileErrors += fileResult.violations.errorCount;
      totals.totalFileWarnings += fileResult.violations.warningCount;
      totals.totalFixableErrors += fileResult.violations.fixableErrorCount;
      totals.totalFixableWarnings += fileResult.violations.fixableWarningCount;
    },

    trackRule(ruleResult: ProcessedRule): void {
      totals.totalErrors += ruleResult.violations.errorMessages.length;
      totals.totalWarnings += ruleResult.violations.warningMessages.length;
    },

    getTotals(): ProcessedEslintResultTotals {
      return totals;
    },
  };
}
