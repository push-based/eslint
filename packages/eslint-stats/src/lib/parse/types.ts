export interface ProcessedFileResult {
  filePath: string;
  timeMs: number;
  errors: number;
  warnings: number;
  fixableErrors: number;
  fixableWarnings: number;
  rules: ProcessedRuleResult[];
}

export interface ProcessedRuleResult {
  ruleId: string;
  timeMs: number;
  errors: number;
  warnings: number;
  fixable: boolean;
}
