import { HierarchyNode, hierarchy } from 'd3-hierarchy';
import { sum } from 'd3-array';
import {
  BaseStats,
  DisplayStatsWithTime,
  FileStatsNode,
  RuleStatsNode,
  RootStatsNode,
  StatsTreeNode,
} from '../parse/eslint-result-visitor';

export type { FileStatsNode, RuleStatsNode, StatsTreeNode };

export interface FileStatsEntry extends DisplayStatsWithTime {
  type: 'file';
  rulesTime: number;
  fixTime: number;
  parseTime: number;
  children: RuleStatsEntry[];
}

export interface RuleStatsEntry extends DisplayStatsWithTime {
  type: 'rule';
}

export type NodeStats = FileStatsEntry | RuleStatsEntry;
export type RootData = {
  type: 'root';
  identifier: string;
  totalTime: number;
  errorCount: number;
  warningCount: number;
  pct: number;
  rulesTime: number;
  fixTime: number;
  parseTime: number;
  children: FileStatsEntry[];
};
export type HierarchyNodeData = NodeStats | RootData;

export type FileRow = DisplayStatsWithTime & {
  type: 'file';
  depth: 0;
  parent?: undefined;
  rulesTime: number;
  fixTime: number;
  parseTime: number;
};

export type RuleRow = DisplayStatsWithTime & {
  type: 'rule';
  depth: 1;
  parent: string;
};

export type StatsRow = FileRow | RuleRow;

export function buildTree(
  stats: RootStatsNode,
  grandTotal: number
): FileStatsEntry[] {
  return stats.children.map((file) => {
    const {
      identifier,
      errorCount,
      warningCount,
      totalTime,
      rulesTime,
      fixTime,
      parseTime,
      children: rawRules,
    } = file;

    const children: RuleStatsEntry[] = rawRules.map((rule) => {
      const {
        identifier,
        totalTime: ruleTime,
        errorCount,
        warningCount,
      } = rule;
      return {
        type: 'rule',
        identifier,
        errorCount,
        warningCount,
        totalTime: ruleTime,
        pct: totalTime > 0 ? (ruleTime / totalTime) * 100 : 0,
      };
    });

    const pct = grandTotal > 0 ? (totalTime / grandTotal) * 100 : 0;

    return {
      type: 'file',
      identifier,
      errorCount,
      warningCount,
      totalTime,
      rulesTime,
      fixTime,
      parseTime,
      pct,
      children,
    };
  });
}

export function toFlatEntry(node: HierarchyNode<NodeStats>): StatsRow {
  const d = node.data;
  const base: BaseStats = {
    identifier: d.identifier,
    errorCount: d.errorCount,
    warningCount: d.warningCount,
  };

  if (d.type === 'file') {
    const { totalTime, rulesTime, fixTime, parseTime, pct } = d;
    return {
      ...base,
      type: 'file',
      depth: 0,
      parent: undefined,
      totalTime,
      rulesTime,
      fixTime,
      parseTime,
      pct,
    };
  } else {
    const { totalTime, pct } = d;
    return {
      ...base,
      type: 'rule',
      depth: 1,
      parent: node.parent?.data.identifier || '',
      totalTime,
      pct,
    };
  }
}

export function buildHierarchy(
  tree: FileStatsEntry[],
  grandTotal: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): HierarchyNode<any> {
  const rootData = {
    type: 'root' as const,
    identifier: 'root',
    totalTime: grandTotal,
    errorCount: sum(tree, (f) => f.errorCount),
    warningCount: sum(tree, (f) => f.warningCount),
    pct: 100,
    rulesTime: sum(tree, (f) => f.rulesTime),
    fixTime: sum(tree, (f) => f.fixTime),
    parseTime: sum(tree, (f) => f.parseTime),
    children: tree,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    hierarchy<any>(rootData, (d: any) => d.children)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sum((d: any) => d.totalTime || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function flattenNodeStats(root: HierarchyNode<any>): StatsRow[] {
  return root
    .descendants()
    .filter((n) => n.depth > 0)
    .map(toFlatEntry);
}
