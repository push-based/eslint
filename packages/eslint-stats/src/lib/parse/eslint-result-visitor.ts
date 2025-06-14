import type { Linter } from 'eslint';

type EslintMessage = Linter.LintMessage;

export interface EslintResultVisitor {
  visitFile?(fileResult: ProcessedFile): void | boolean;

  visitMessage?(
    message: EslintMessage,
    fileResult: ProcessedFile
  ): void | boolean;

  visitRule?(
    ruleData: ProcessedRule,
    fileResult: ProcessedFile
  ): void | boolean;
}

export type ProcessedRule = {
  ruleId: string;
  violations: {
    errorMessages: EslintMessage[];
    warningMessages: EslintMessage[];
    offMessages: EslintMessage[];
  };
  time: number;
};

export type ProcessedFile = {
  filePath: string;
  violations: {
    errorCount: number;
    fatalErrorCount: number;
    warningCount: number;
    fixableErrorCount: number;
    fixableWarningCount: number;
    fixPasses: number;
  };
  times: {
    parse: number;
    rules: Record<string, number>;
    fix: number;
    total: number;
  };
  rules: ProcessedRule[];
};

export type ProcessedEslintResult = {
  times: {
    total: number;
  };
  violations: {};
  files: ProcessedFile[];
};
