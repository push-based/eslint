import { ProcessedEslintResult } from '../../../../parse/eslint-result-visitor';
import { rollup, sum } from 'd3-array';

export type BaseEntry = {
  time: number;
  errors: number;
  warnings: number;
  percentage: number;
};

export type RuleEntry = BaseEntry & {
  identifier: string;
};

export type FileEntry = BaseEntry & {
  identifier: string;
  parseTime?: number;
  rulesTime?: number;
  fixTime?: number;
  file?: ProcessedEslintResult['files'][0];
};

export function extractRuleEntries(
  results: ProcessedEslintResult,
  totalTime: number
): RuleEntry[] {
  const flatRules = results.files.flatMap((file) =>
    file.rules.map((rule) => ({
      identifier: rule.ruleId,
      time: rule.time,
      errors: rule.violations.errorMessages.length,
      warnings: rule.violations.warningMessages.length,
    }))
  );

  // Use D3's rollup for aggregation
  return Array.from(
    rollup(
      flatRules,
      (v) => ({
        time: sum(v, (d) => d.time),
        errors: sum(v, (d) => d.errors),
        warnings: sum(v, (d) => d.warnings),
        percentage: (sum(v, (d) => d.time) / totalTime) * 100,
      }),
      (d) => d.identifier
    ),
    ([identifier, stats]) => ({ identifier, ...stats })
  );
}

export function extractFileEntries(
  results: ProcessedEslintResult,
  totalTime: number
): FileEntry[] {
  return results.files.map((file) => ({
    identifier: file.filePath,
    time: file.times.total,
    parseTime: file.times.parse,
    rulesTime: Object.values(file.times.rules).reduce(
      (sum, time) => sum + time,
      0
    ),
    fixTime: file.times.fix,
    errors: file.violations.errorCount,
    warnings: file.violations.warningCount,
    percentage: (file.times.total / totalTime) * 100,
  }));
}

export function extractHierarchicalEntries(
  results: ProcessedEslintResult,
  totalTime: number
): FileEntry[] {
  return results.files.map((file) => ({
    identifier: file.filePath,
    time: file.times.total,
    parseTime: file.times.parse,
    rulesTime: Object.values(file.times.rules).reduce(
      (sum, time) => sum + time,
      0
    ),
    fixTime: file.times.fix,
    errors: file.violations.errorCount,
    warnings: file.violations.warningCount,
    percentage: (file.times.total / totalTime) * 100,
    file, // Keep reference to original file for rules
  }));
}
