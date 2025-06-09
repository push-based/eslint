import {
  ProcessedFileResult,
  ProcessedRuleResult,
} from './processed-eslint-result.types';
import type { ProcessedEslintResultTotals } from './totals';

export interface ProcessedEslintResultVisitor {
  visitStats?(stats: ProcessedEslintResultTotals): void;
  visitFile?(fileResult: ProcessedFileResult): void | boolean;

  visitRule?(
    ruleData: ProcessedRuleResult,
    fileResult: ProcessedFileResult
  ): void | boolean;
}
