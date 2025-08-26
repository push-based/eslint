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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    trackRule(_ruleResult: RuleStatsNode): void {
      // Rules are already added to their parent file's children
      // No additional tracking needed here
    },

    getTotals(): StatsTotals {
      return computeTotals(files);
    },
  };
}

type ESLintResult = ESLint.LintResult;

export function createProcessEslintResultVisitor(
  date?: Date,
  decodedCommand?: string,
  filePath?: string
): EslintResultVisitor {
  const results: FileStatsNode[] = [];
  const totalsTracker = createProcessedTotalsTracker();

  return {
    visitFile(fileResult: FileStatsNode): void {
      totalsTracker.trackFile(fileResult);
      results.push(fileResult);
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    visitMessage(
      _message: Linter.LintMessage,
      _fileResult: FileStatsNode
    ): void {
      return;
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    visitRule(_ruleData: RuleStatsNode, _fileData: FileStatsNode): void {
      // Rules are now automatically pushed to fileData.children in walkEslintResult
      totalsTracker.trackRule(_ruleData);
    },

    getResults(): RootStatsNode {
      return {
        type: 'root',
        children: [...results],
        date,
        decodedCommand,
        filePath,
      };
    },
  };
}

export function processEslintResults(
  results: ESLintResult[],
  date?: Date,
  decodedCommand?: string,
  filePath?: string
): RootStatsNode {
  // Create a simple visitor that just tracks files for totals calculation
  const visitor = createProcessEslintResultVisitor(
    date,
    decodedCommand,
    filePath
  );

  // walkEslintResult now returns the RootStatsNode directly with rules populated in children
  walkEslintResult(results, visitor);

  return visitor.getResults();
}
