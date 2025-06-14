import { ProcessedEslintResult } from '../parse';
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
      (v) => {
        const t = sum(v, (d) => d.time);
        return {
          time: t,
          errors: sum(v, (d) => d.errors),
          warnings: sum(v, (d) => d.warnings),
          percentage: (t / totalTime) * 100,
        };
      },
      (d) => d.identifier
    ),
    ([identifier, stats]) => ({ identifier, ...stats })
  );
}

function makeFileEntry(
  file: ProcessedEslintResult['files'][0],
  totalTime: number
): FileEntry {
  return {
    identifier: file.filePath,
    time: file.times.total,
    parseTime: file.times.parse,
    rulesTime: sum(Object.values(file.times.rules)),
    fixTime: file.times.fix,
    errors: file.violations.errorCount,
    warnings: file.violations.warningCount,
    percentage: (file.times.total / totalTime) * 100,
  };
}

export function extractFileEntries(
  results: ProcessedEslintResult,
  totalTime: number
): FileEntry[] {
  return results.files.map((file) => makeFileEntry(file, totalTime));
}

export function extractHierarchicalEntries(
  results: ProcessedEslintResult,
  totalTime: number
): (RuleEntry | FileEntry)[] {
  // first produce all file nodes
  const files: FileEntry[] = results.files.map((file) => ({
    ...makeFileEntry(file, totalTime),
    depth: 0,
    file,
  }));

  // then all rule nodes
  const rules: RuleEntry[] = results.files.flatMap((file) =>
    file.rules.map((rule) => ({
      identifier: rule.ruleId,
      time: rule.time,
      errors: rule.violations.errorMessages.length,
      warnings: rule.violations.warningMessages.length,
      percentage:
        file.times.total > 0 ? (rule.time / file.times.total) * 100 : 0,
      depth: 1,
      parentIdentifier: file.filePath,
    }))
  );

  // merge into one flat array; no more processHierarchicalEntries needed
  return [...files, ...rules];
}
