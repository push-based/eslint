import type { ESLint, Linter } from 'eslint';
import {
  EslintResultVisitor,
  ProcessedEslintResult,
  ProcessedFile,
  ProcessedRule,
} from './eslint-result-visitor';
import { createProcessedTotalsTracker } from './totals';
import { walkEslintResult } from './eslint-result.walk';

type ESLintResult = ESLint.LintResult;
type EslintMessage = Linter.LintMessage;

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

    visitMessage(message: EslintMessage, fileResult: ProcessedFile): void {
      return;
    },

    visitRule(ruleData: ProcessedRule, fileResult: ProcessedFile): void {
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
