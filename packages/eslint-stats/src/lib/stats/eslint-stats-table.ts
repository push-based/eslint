import { renderTable } from '../utils/ascii-table';
import { max } from 'd3-array';
import {
  formatTimeColored,
  formatPercentageColored,
  formatErrorCount,
  formatWarningCount,
  formatFilePath,
  formatRuleId,
} from './format';
import {
  buildTree,
  buildHierarchy,
  flattenNodeStats,
  StatsRow,
  FileRow,
  RuleRow,
} from './stats-hierarchy';
import { sortEntries } from './sort';
import { RootStatsNode } from '../parse';
import { group } from 'd3-array';
import { sparklineForFile } from './format';

function formatIdentifier(e: StatsRow, header: string): string {
  const base =
    header === 'Rule' || e.depth === 1
      ? formatRuleId(e.identifier)
      : formatFilePath(e.identifier);
  return '  '.repeat(e.depth) + base;
}

// 5. Fold immutable options into a single type
interface BaseViewOptions {
  sortBy?: 'totalTime' | 'errorCount' | 'warningCount' | 'identifier';
  sortDirection?: 'asc' | 'desc';
  take?: [number, number?];
}

export type TableViewOptions = BaseViewOptions;

export interface EslintStatsViewOptions extends BaseViewOptions {
  lastAction?: 'showView' | 'sortBy' | 'sortDirection' | 'take';
  viewName?: 'rule' | 'file' | 'file-rule';
}

export type TableHeaderOptions = {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

type CellExtras<T> = (entry: T) => string | undefined;

type Maxima = {
  totalTime: number;
  pct: number;
  err: number;
  warn: number;
};

function formatRow(
  e: StatsRow,
  maxes: Maxima,
  header: string,
  extra?: CellExtras<StatsRow>
) {
  const id = formatIdentifier(e, header);
  const time = formatTimeColored(e.totalTime, maxes.totalTime);
  const tcell = extra ? `${extra(e) || ''} ${time}`.trim() : time;
  return [
    id,
    tcell,
    formatPercentageColored(e.pct, maxes.pct),
    formatErrorCount(e.errorCount, maxes.err),
    formatWarningCount(e.warningCount, maxes.warn),
  ];
}

type ViewConfig = {
  filter: (r: StatsRow) => boolean;
  extra?: CellExtras<StatsRow>;
  label: string;
  interleave?: boolean;
  transform?: (rows: StatsRow[], totalTime: number) => StatsRow[];
};

const VIEWS: Record<string, ViewConfig> = {
  rule: {
    filter: (r: StatsRow) => r.depth === 1,
    label: 'Rule',
    transform: (rows: StatsRow[], totalTime: number) =>
      rows.map((r: StatsRow) => ({
        ...r,
        pct: totalTime > 0 ? (r.totalTime / totalTime) * 100 : 0,
      })),
  },
  file: {
    filter: (r: StatsRow) => r.depth === 0,
    extra: sparklineForFile,
    label: 'File',
  },
  'file-rule': {
    filter: () => true,
    label: 'File/Rule',
    interleave: true,
    extra: sparklineForFile,
  },
};

// Pure table renderer
function renderTableRows(
  entries: StatsRow[],
  options: TableViewOptions,
  headerLabel: string,
  extraTimeCell?: CellExtras<StatsRow>
): string[] {
  const { sortBy = 'totalTime', sortDirection = 'desc', take = [10] } = options;
  const sorted = sortEntries(entries, sortBy, sortDirection);

  // Compute maxima
  const maxes: Maxima = {
    totalTime: max(sorted, (d) => d.totalTime) ?? 1,
    pct: max(sorted, (d) => d.pct) ?? 1,
    err: max(sorted, (d) => d.errorCount) ?? 1,
    warn: max(sorted, (d) => d.warningCount) ?? 1,
  };

  // Apply top-level take limit
  const limited = take[0] > 0 ? sorted.slice(0, take[0]) : sorted;

  // Build rows using formatRow helper
  const rows = limited.map((e) =>
    formatRow(e, maxes, headerLabel, extraTimeCell)
  );

  return [
    renderTable(rows, {
      headers: getTableHeaders(headerLabel, { sortBy, sortDirection }),
    }),
  ];
}

export function renderInteractiveEsLintStatsView(
  state: EslintStatsViewOptions,
  detailedStats: RootStatsNode
): string[] {
  const {
    viewName = 'file-rule',
    sortBy = 'totalTime',
    sortDirection = 'desc',
    take = [10],
  } = state;

  const totalTime = detailedStats.children.reduce(
    (sum, n) => sum + n.totalTime,
    0
  );
  const tree = buildTree(detailedStats, totalTime);
  const root = buildHierarchy(tree, totalTime);
  const allRows = flattenNodeStats(root);

  // Data-driven view configuration
  const cfg = VIEWS[viewName] || VIEWS['file-rule'];
  let items = allRows.filter(cfg.filter);

  // Apply transform if needed
  if (cfg.transform) {
    items = cfg.transform(items, totalTime);
  }

  // File-rule interleave logic
  if (cfg.interleave) {
    const files = items.filter((r): r is FileRow => r.depth === 0);
    const ruleRows = items.filter((r): r is RuleRow => r.depth === 1);
    const rulesByFile = group(ruleRows, (r: RuleRow) => r.parent);

    // Handle hierarchical take limits: [fileLimit, ruleLimit]
    const [fileLimit, ruleLimit = fileLimit] = take;
    const limitedFiles = fileLimit > 0 ? files.slice(0, fileLimit) : files;

    items = limitedFiles.flatMap((file) => {
      const kids = rulesByFile.get(file.identifier) ?? [];
      const limitedKids = ruleLimit > 0 ? kids.slice(0, ruleLimit) : kids;
      return [file, ...limitedKids];
    });
  }

  return renderTableRows(
    items,
    { sortBy, sortDirection, take },
    cfg.label,
    cfg.extra
  );
}

export function getTableHeaders(
  first: string,
  opts: TableHeaderOptions = {}
): string[] {
  const { sortBy = 'totalTime', sortDirection = 'desc' } = opts;
  const arrow = (col: string) =>
    sortBy === col ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '';

  return [
    `${first}${arrow('identifier')}`,
    `Time${arrow('totalTime')}`,
    `%${arrow('totalTime')}`,
    `🚨 Errors${arrow('errorCount')}`,
    `⚠️ Warnings${arrow('warningCount')}`,
  ];
}
