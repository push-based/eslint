import type { ESLint, Linter } from 'eslint';

type ESLintResult = ESLint.LintResult;
type EslintMessage = Linter.LintMessage;

export interface EslintResultVisitor {
  visitFile?(fileResult: ESLintResult): void | boolean;

  visitMessage?(
    message: EslintMessage,
    fileResult: ESLintResult
  ): void | boolean;

  visitRule?(ruleData: RuleVisitData, fileResult: ESLintResult): void | boolean;
}

export interface RuleVisitData {
  ruleId: string;
  messages: EslintMessage[];
  timeMs: number;
}
