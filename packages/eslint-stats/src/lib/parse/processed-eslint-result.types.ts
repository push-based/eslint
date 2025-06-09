import { ProcessedEslintResultTotals } from './totals';

export type RuleViolations = {
  errors: number;
  warnings: number;
  fixable: boolean;
};

export type TotalTime = {
  totalMs: number;
};

export type ProcessedRuleResult = RuleViolations &
  TotalTime & {
    ruleId: string;
  };

export type FileViolations = {
  totalErrors: number;
  totalWarnings: number;
  fixableErrors: boolean;
  fixableWarnings: boolean;
};

export type ProcessedFileResult = FileViolations &
  TotalTime & {
    filePath: string;
    parseMs: number;
    rulesMs: number;
    fixMs: number;
    rules: ProcessedRuleResult[];
  };

export interface ProcessedEslintRulesStats extends ProcessedEslintResultTotals {
  processedResults: ProcessedFileResult[];
}
