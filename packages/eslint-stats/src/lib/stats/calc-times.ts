import {
  ProcessedFileResult,
  ProcessedRuleResult,
} from '../parse/processed-eslint-result.types';
import { ProcessedEslintResultTotals } from '../parse/totals';

// Enhanced types with relative percentages
export type ProcessedRuleResultWithRelative = ProcessedRuleResult & {
  relativeTotalTimeMs: number;
  maxTotalTimeMs: number;
  minTotalTimeMs: number;
  maxErrors: number;
  minErrors: number;
  maxWarnings: number;
  minWarnings: number;
};

export type ProcessedFileResultWithRelative = ProcessedFileResult & {
  relativeTotalTimeMs: number;
  maxTotalTimeMs: number;
  minTotalTimeMs: number;
  rules: ProcessedRuleResultWithRelative[];
};

/**
 * addStats is a generic function that adds min,max,relative to all the entries and returns them
 * @param processedEntries
 */
// Overload for files
export function addStats(
  processedEntries: ProcessedFileResult[],
  stats: ProcessedEslintResultTotals
): ProcessedFileResultWithRelative[];

// Overload for rules
export function addStats(
  processedEntries: ProcessedRuleResult[],
  stats: ProcessedEslintResultTotals
): ProcessedRuleResultWithRelative[];

// Implementation
export function addStats(
  processedEntries: ProcessedFileResult[] | ProcessedRuleResult[],
  stats: ProcessedEslintResultTotals
): ProcessedFileResultWithRelative[] | ProcessedRuleResultWithRelative[] {
  // Type guard to check if we're dealing with files or rules
  const isFileArray = (entries: any[]): entries is ProcessedFileResult[] => {
    return entries.length === 0 || 'rules' in entries[0];
  };

  if (isFileArray(processedEntries)) {
    // Handle files
    const files = processedEntries as ProcessedFileResult[];

    // Calculate min/max values across all files
    const fileTimes = files.map((file) => file.totalMs);
    const maxFileTime = fileTimes.length > 0 ? Math.max(...fileTimes) : 0;
    const minFileTime = fileTimes.length > 0 ? Math.min(...fileTimes) : 0;

    // Collect all rules across all files for min/max calculations
    const allRules = files.flatMap((file) => file.rules);
    const ruleTimes = allRules.map((rule) => rule.totalMs);
    const ruleErrors = allRules.map((rule) => rule.errors);
    const ruleWarnings = allRules.map((rule) => rule.warnings);

    const maxRuleTime = ruleTimes.length > 0 ? Math.max(...ruleTimes) : 0;
    const minRuleTime = ruleTimes.length > 0 ? Math.min(...ruleTimes) : 0;
    const maxRuleErrors = ruleErrors.length > 0 ? Math.max(...ruleErrors) : 0;
    const minRuleErrors = ruleErrors.length > 0 ? Math.min(...ruleErrors) : 0;
    const maxRuleWarnings =
      ruleWarnings.length > 0 ? Math.max(...ruleWarnings) : 0;
    const minRuleWarnings =
      ruleWarnings.length > 0 ? Math.min(...ruleWarnings) : 0;

    // Process each file and its rules
    return files.map((file) => {
      // Calculate relative time for file (as percentage of total time)
      const relativeTotalTimeMs =
        stats.totalTimeMs > 0 ? (file.totalMs / stats.totalTimeMs) * 100 : 0;

      // Process rules within this file
      const rulesWithRelative: ProcessedRuleResultWithRelative[] =
        file.rules.map((rule) => ({
          ...rule,
          relativeTotalTimeMs:
            stats.totalTimeMs > 0
              ? (rule.totalMs / stats.totalTimeMs) * 100
              : 0,
          maxTotalTimeMs: maxRuleTime,
          minTotalTimeMs: minRuleTime,
          maxErrors: maxRuleErrors,
          minErrors: minRuleErrors,
          maxWarnings: maxRuleWarnings,
          minWarnings: minRuleWarnings,
        }));

      return {
        ...file,
        relativeTotalTimeMs,
        maxTotalTimeMs: maxFileTime,
        minTotalTimeMs: minFileTime,
        rules: rulesWithRelative,
      };
    });
  } else {
    // Handle rules
    const rules = processedEntries as ProcessedRuleResult[];

    // Calculate min/max values across all rules
    const ruleTimes = rules.map((rule) => rule.totalMs);
    const ruleErrors = rules.map((rule) => rule.errors);
    const ruleWarnings = rules.map((rule) => rule.warnings);

    const maxRuleTime = ruleTimes.length > 0 ? Math.max(...ruleTimes) : 0;
    const minRuleTime = ruleTimes.length > 0 ? Math.min(...ruleTimes) : 0;
    const maxRuleErrors = ruleErrors.length > 0 ? Math.max(...ruleErrors) : 0;
    const minRuleErrors = ruleErrors.length > 0 ? Math.min(...ruleErrors) : 0;
    const maxRuleWarnings =
      ruleWarnings.length > 0 ? Math.max(...ruleWarnings) : 0;
    const minRuleWarnings =
      ruleWarnings.length > 0 ? Math.min(...ruleWarnings) : 0;

    return rules.map((rule) => ({
      ...rule,
      relativeTotalTimeMs:
        stats.totalTimeMs > 0 ? (rule.totalMs / stats.totalTimeMs) * 100 : 0,
      maxTotalTimeMs: maxRuleTime,
      minTotalTimeMs: minRuleTime,
      maxErrors: maxRuleErrors,
      minErrors: minRuleErrors,
      maxWarnings: maxRuleWarnings,
      minWarnings: minRuleWarnings,
    }));
  }
}
