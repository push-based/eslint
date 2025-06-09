import {
  ProcessedFileResult,
  ProcessedRuleResult,
  ProcessedEslintRulesStats,
} from '../parse/processed-eslint-result.types';
import { ProcessedEslintResultTotals } from '../parse/totals';

export interface RuleGrouping {
  ruleId: string;
  totalMs: number;
  errors: number;
  warnings: number;
  fixable: boolean;
  occurrences?: number;
}

export type RuleGroupingStats = ProcessedEslintResultTotals & {
  processedResults: ProcessedRuleResult[];
};

export function groupByRule(
  processedEslintRulesStats: ProcessedEslintRulesStats
): RuleGroupingStats {
  const ruleMap = new Map<string, ProcessedRuleResult>();

  // Flatten all rules from all files and group by ruleId
  for (const fileResult of processedEslintRulesStats.processedResults) {
    for (const ruleResult of fileResult.rules) {
      const existing = ruleMap.get(ruleResult.ruleId);
      if (existing) {
        existing.totalMs += ruleResult.totalMs;
        existing.errors += ruleResult.errors;
        existing.warnings += ruleResult.warnings;
        existing.fixable = existing.fixable && ruleResult.fixable; // only fixable if all are fixable
      } else {
        // Create new entry
        ruleMap.set(ruleResult.ruleId, { ...ruleResult });
      }
    }
  }

  return {
    ...processedEslintRulesStats,
    processedResults: Array.from(ruleMap.values()),
  };
}

export type FileResultWithoutRules = Omit<ProcessedFileResult, 'rules'>;

export type FileGroupingStats = ProcessedEslintResultTotals & {
  processedResults: ProcessedFileResult[];
};
export function groupByFile(
  processedEslintRulesStats: ProcessedEslintRulesStats
): FileGroupingStats {
  return {
    ...processedEslintRulesStats,
    processedResults: processedEslintRulesStats.processedResults.map(
      ({ rules, ...fileResult }) => fileResult as ProcessedFileResult
    ),
  };
}
