import type { ESLint, Linter } from 'eslint';
import { EslintResultVisitor, RuleVisitData } from './eslint-result-visitor';
import { ProcessedFileResult } from './types';

type ESLintResult = ESLint.LintResult;
type EslintMessage = Linter.LintMessage;

export class ProcessEslintResultVisitor implements EslintResultVisitor {
  private results: ProcessedFileResult[] = [];
  private currentFile: ProcessedFileResult | null = null;

  visitFile(fileResult: ESLintResult): void {
    let fileTimeMs = 0;
    if (fileResult.stats?.times?.passes?.[0]?.rules) {
      const ruleStats = fileResult.stats.times.passes[0].rules;
      fileTimeMs = Object.values(ruleStats).reduce(
        (total, ruleStat) => total + (ruleStat.total || 0),
        0
      );
    }

    this.currentFile = {
      filePath: fileResult.filePath,
      timeMs: fileTimeMs,
      errors: fileResult.errorCount,
      warnings: fileResult.warningCount,
      fixableErrors: fileResult.fixableErrorCount || 0,
      fixableWarnings: fileResult.fixableWarningCount || 0,
      rules: [],
    };

    this.results.push(this.currentFile);
  }

  visitMessage(message: EslintMessage, fileResult: ESLintResult): void {
    return;
  }

  visitRule(ruleData: RuleVisitData, fileResult: ESLintResult): void {
    if (!this.currentFile) return;

    const { ruleId, messages, timeMs } = ruleData;
    const errors = messages.filter((msg) => msg.severity === 2).length;
    const warnings = messages.filter((msg) => msg.severity === 1).length;
    const fixable = messages.some((msg) => msg.fix);

    this.currentFile.rules.push({
      ruleId,
      timeMs,
      errors,
      warnings,
      fixable,
    });
  }

  getResults(): ProcessedFileResult[] {
    return [...this.results];
  }

  reset(): void {
    this.results = [];
    this.currentFile = null;
  }
}

export function processEslintResults(
  results: ESLintResult[]
): ProcessedFileResult[] {
  const visitor = new ProcessEslintResultVisitor();

  const { walkEslintResult } = require('../models/eslint-result.walk');
  walkEslintResult(results, visitor);

  return visitor.getResults();
}
