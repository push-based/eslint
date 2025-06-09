import type { ESLint, Linter } from 'eslint';
import type {
  EslintResultVisitor,
  RuleVisitData,
} from './eslint-result-visitor';
import {
  ProcessedFileResult,
  ProcessedEslintRulesStats,
} from './processed-eslint-result.types';
import { createProcessedTotalsTracker } from './totals';
import { walkEslintResult } from './eslint-result.walk';

type ESLintResult = ESLint.LintResult;
type EslintMessage = Linter.LintMessage;

export function createProcessEslintResultVisitor(): EslintResultVisitor & {
  getResults(): ProcessedEslintRulesStats;
} {
  let results: ProcessedFileResult[] = [];
  let currentFile: ProcessedFileResult | null = null;
  const totalsTracker = createProcessedTotalsTracker();

  return {
    visitFile(fileResult: ESLintResult): void {
      let parseMs = 0;
      let rulesMs = 0;
      let fixMs = 0;
      let totalMs = 0;

      if (fileResult.stats?.times?.passes?.[0]) {
        const pass = fileResult.stats.times.passes[0];
        parseMs = pass.parse?.total || 0;
        fixMs = pass.fix?.total || 0;
        totalMs = pass.total || 0;

        // Calculate rulesMs from the sum of all rule timings
        if (pass.rules) {
          rulesMs = Object.values(pass.rules).reduce((sum, rule) => {
            return sum + (rule.total || 0);
          }, 0);
        }
      }

      currentFile = {
        filePath: fileResult.filePath,
        parseMs,
        rulesMs,
        fixMs,
        totalMs,
        totalErrors: fileResult.errorCount,
        totalWarnings: fileResult.warningCount,
        fixableErrors: (fileResult.fixableErrorCount || 0) > 0,
        fixableWarnings: (fileResult.fixableWarningCount || 0) > 0,
        rules: [],
      };

      results.push(currentFile);
      totalsTracker.trackFile(currentFile);
    },

    visitMessage(message: EslintMessage, fileResult: ESLintResult): void {
      return;
    },

    visitRule(ruleData: RuleVisitData, fileResult: ESLintResult): void {
      if (!currentFile) return;

      const { ruleId, messages, timeMs } = ruleData;
      const errors = messages.filter((msg) => msg.severity === 2).length;
      const warnings = messages.filter((msg) => msg.severity === 1).length;
      const fixable = messages.some((msg) => msg.fix);

      const ruleResult = {
        ruleId,
        totalMs: timeMs,
        errors,
        warnings,
        fixable,
      };

      currentFile.rules.push(ruleResult);
      totalsTracker.trackRule(ruleResult);
    },

    getResults(): ProcessedEslintRulesStats {
      // Calculate total rules across all files
      const totalRules = results.reduce(
        (sum, file) => sum + file.rules.length,
        0
      );
      totalsTracker.setTotalRules(totalRules);

      const totals = totalsTracker.getTotals();

      return {
        ...totals,
        processedResults: [...results],
      };
    },
  };
}

export function processEslintResults(
  results: ESLintResult[]
): ProcessedEslintRulesStats {
  const visitor = createProcessEslintResultVisitor();
  walkEslintResult(results, visitor);

  return visitor.getResults();
}
