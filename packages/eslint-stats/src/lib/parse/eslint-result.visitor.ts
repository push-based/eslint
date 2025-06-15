import type { ESLint, Linter } from 'eslint';
import {
  EslintResultVisitor,
  FileStatsNode,
  RuleStatsNode,
  RootStatsNode,
  StatsTotals,
  computeTotals,
} from './eslint-result-visitor';
import { walkEslintResult } from './eslint-result.walk';

export function createProcessedTotalsTracker() {
  const files: FileStatsNode[] = [];

  return {
    trackFile(fileResult: FileStatsNode): void {
      files.push(fileResult);
    },

    trackRule(ruleResult: RuleStatsNode): void {
      // Rules are already added to their parent file's children
      // No additional tracking needed here
    },

    getTotals(): StatsTotals {
      return computeTotals(files);
    },
  };
}

type ESLintResult = ESLint.LintResult;

export function createProcessEslintResultVisitor(): EslintResultVisitor {
  const results: FileStatsNode[] = [];
  const totalsTracker = createProcessedTotalsTracker();

  return {
    visitFile(fileResult: FileStatsNode): void {
      totalsTracker.trackFile(fileResult);
      results.push(fileResult);
    },

    visitMessage(message: Linter.LintMessage, fileResult: FileStatsNode): void {
      return;
    },

    visitRule(ruleData: RuleStatsNode, fileData: FileStatsNode): void {
      // Rules are now automatically pushed to fileData.children in walkEslintResult
      totalsTracker.trackRule(ruleData);
    },

    getResults(): RootStatsNode {
      return {
        type: 'root',
        children: [...results],
      };
    },
  };
}

export function processEslintResults(results: ESLintResult[]): RootStatsNode {
  // Create a simple visitor that just tracks files for totals calculation
  const visitor = createProcessEslintResultVisitor();

  // walkEslintResult now returns the RootStatsNode directly with rules populated in children
  return walkEslintResult(results, visitor);
}
