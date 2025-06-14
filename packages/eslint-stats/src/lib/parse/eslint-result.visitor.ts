import type { ESLint } from 'eslint';
import {
  EslintResultVisitor,
  ProcessedEslintResult,
  ProcessedFile,
  ProcessedRule,
} from './eslint-result-visitor';
import { walkEslintResult } from './eslint-result.walk';

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

type ESLintResult = ESLint.LintResult;

export function createProcessEslintResultVisitor(): EslintResultVisitor & {
  getResults(): ProcessedEslintResult;
} {
  const results: ProcessedFile[] = [];
  const totalsTracker = createProcessedTotalsTracker();
  let currentFile: ProcessedFile | undefined = undefined;

  return {
    visitFile(fileResult: ProcessedFile): void {
      currentFile = fileResult;
      totalsTracker.trackFile(fileResult);
      results.push(fileResult);
    },

    visitRule(ruleData: ProcessedRule, _: ProcessedFile): void {
      if (currentFile === undefined) {
        return;
      }
      currentFile.rules.push(ruleData);
      totalsTracker.trackRule(ruleData);
    },

    getResults(): ProcessedEslintResult {
      const totals = totalsTracker.getTotals();
      return {
        violations: {},
        times: {
          total: totals.totalTimeMs,
        },
        files: [...results],
      };
    },
  };
}

export function processEslintResults(
  results: ESLintResult[]
): ProcessedEslintResult {
  const visitor = createProcessEslintResultVisitor();
  walkEslintResult(results, visitor);

  return visitor.getResults();
}
