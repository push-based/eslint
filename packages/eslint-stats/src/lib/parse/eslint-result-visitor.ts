import type { Linter } from 'eslint';
import { sum } from 'd3-array';

type EslintMessage = Linter.LintMessage;

export interface StopOnFalseWalkOptions {
  // Stop walking if visitor returns false
  // Good for:
  // - Early termination: Stop when you find what you're looking for
  // - Conditional processing: Stop on error conditions
  stopOnFalse?: boolean;
}

// Base stats interface for common properties
export interface BaseStats {
  identifier: string;
  errorCount: number;
  warningCount: number;
}

// Display stats with time information
export interface DisplayStatsWithTime extends BaseStats {
  totalTime: number;
  pct: number;
}

// 1. Unified CoreStats with consistent naming
export interface CoreStats {
  identifier: string;
  errorCount: number;
  warningCount: number;
  totalTime: number;
  timePct: number;
}

export interface RuleStatsNode extends CoreStats {
  type: 'rule';
}

export interface FileStatsNode extends CoreStats {
  type: 'file';
  fatalErrorCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
  fixPasses: number;
  rulesTime: number;
  fixTime: number;
  parseTime: number;
  children: RuleStatsNode[];
}

// 2. Keep RootStatsNode separate from the main union
export interface RootStatsNode {
  type: 'root';
  children: FileStatsNode[];
}

// 3. StatsTreeNode union no longer includes root
export type StatsTreeNode = FileStatsNode | RuleStatsNode;

// 4. Use mapped types to automatically derive StatsTotals fields
type NumericFields<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

type SumableFields = Exclude<
  NumericFields<FileStatsNode>,
  'fatalErrorCount' | 'fixableErrorCount' | 'fixableWarningCount' | 'timePct'
>;

export interface StatsTotals extends Pick<FileStatsNode, SumableFields> {
  fileCount: number;
  ruleCount: number;
  filesTime: number; // computed separately from file nodes
  fileErrorCount: number; // sum of fatalErrorCount on files
  fixableErrorCount: number;
  fixableWarningCount: number;
}

// 5. Tightened visitor API
type VisitorResult = void | false;

export interface EslintResultVisitor {
  visitFile?(node: FileStatsNode): VisitorResult;

  visitMessage?(msg: EslintMessage, file: FileStatsNode): VisitorResult;

  visitRule?(node: RuleStatsNode, file: FileStatsNode): VisitorResult;

  getResults(): RootStatsNode;
}

export function computeTotals(files: FileStatsNode[]): StatsTotals {
  return {
    fileCount: files.length,
    ruleCount: sum(files, (f) => f.children.length),
    // Properties from SumableFields (automatically derived from FileStatsNode)
    errorCount: sum(files, (f) => f.errorCount),
    warningCount: sum(files, (f) => f.warningCount),
    totalTime: sum(files, (f) => f.totalTime),
    rulesTime: sum(files, (f) => f.rulesTime),
    parseTime: sum(files, (f) => f.parseTime),
    fixTime: sum(files, (f) => f.fixTime),
    fixPasses: sum(files, (f) => f.fixPasses),
    // Additional computed fields
    filesTime: sum(files, (f) => f.totalTime),
    fileErrorCount: sum(files, (f) => f.fatalErrorCount),
    fixableErrorCount: sum(files, (f) => f.fixableErrorCount),
    fixableWarningCount: sum(files, (f) => f.fixableWarningCount),
  };
}
