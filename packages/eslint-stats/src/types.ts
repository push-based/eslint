import type { ESLint } from 'eslint';

export interface RuleTiming {
  /** The total time spent, in milliseconds. */
  total: number;
}

/**
 * A map of ESLint rule names to their respective timing information.
 * Keys are rule names (e.g., "no-unused-vars"), and values are `RuleTiming` objects.
 */
export interface Rules {
  [ruleName: string]: RuleTiming;
}

/**
 * Represents timing information for a single pass of ESLint over a file.
 * This can include time spent parsing, executing rules, and applying fixes.
 */
export interface Pass {
  /** Timing information for the parsing phase. */
  parse?: RuleTiming;
  /** Timing information for individual rules. */
  rules: Rules;
  /** Timing information for the fixing phase. */
  fix?: RuleTiming;
  /** Total time for this pass, including parsing, rules, and fixes. */
  total?: number;
}

/**
 * Contains an array of timing information for all passes ESLint made over a file.
 */
export interface Times {
  /** An array of `Pass` objects, one for each pass ESLint made. */
  passes: Pass[];
}

/**
 * Contains detailed performance statistics for linting a single file.
 */
export interface Stats {
  /** Timing information for parsing, rule execution, and fixing, organized by passes. */
  times: Times;
  /** The number of times ESLint applied at least one fix after linting. */
  fixPasses?: number;
}

/**
 * Information about a deprecated ESLint rule that was used during linting.
 * Extends ESLint's DeprecatedRuleUse to add an optional `info` field.
 */
export interface UsedDeprecatedRule extends ESLint.DeprecatedRuleUse {
  /** Additional information about the deprecation. */
  info?: Record<string, any>;
}

/**
 * Represents the complete ESLint result for a single file.
 * Extends ESLint's LintResult (omitting fields we redefine) to add a custom `customTimingStats` field
 * and use our custom `UsedDeprecatedRule`.
 */
export interface LintResult
  extends Omit<ESLint.LintResult, 'usedDeprecatedRules'> {
  /** Performance statistics for linting this file (custom field). */
  customTimingStats: Stats;
  /**
   * An array of our custom deprecated rules (includes optional `info` field).
   * This is defined as optional here, overriding the base if it was mandatory.
   */
  usedDeprecatedRules?: UsedDeprecatedRule[];
  // messages and suppressedMessages are inherited from ESLint.LintResult and are of type Linter.LintMessage[]
}

/**
 * Represents an array of `LintResult` objects, typically the top-level structure
 * of an ESLint JSON output when linting multiple files.
 */
export type LintResults = LintResult[];

export interface SimpleStats {
  [key: string]: number;
}
