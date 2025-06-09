import {
  ProcessedFileResult,
  ProcessedRuleResult,
} from './processed-eslint-result.types';

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
    trackFile(fileResult: ProcessedFileResult): void {
      totals.totalTimeMs += fileResult.totalMs;
      totals.totalFiles += 1;
      totals.totalFileErrors += fileResult.totalErrors;
      totals.totalFileWarnings += fileResult.totalWarnings;
      totals.totalFixableErrors += fileResult.fixableErrors ? 1 : 0;
      totals.totalFixableWarnings += fileResult.fixableWarnings ? 1 : 0;
    },

    trackRule(ruleResult: ProcessedRuleResult): void {
      totals.totalErrors += ruleResult.errors;
      totals.totalWarnings += ruleResult.warnings;
    },

    setTotalRules(count: number): void {
      totals.totalRules = count;
    },

    getTotals(): ProcessedEslintResultTotals {
      return { ...totals };
    },
  };
}
