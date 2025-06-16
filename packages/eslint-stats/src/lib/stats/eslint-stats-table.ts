import { renderTable } from '../utils/markdown-table';
import { max } from 'd3-array';
import {
  formatTimeColored,
  formatPercentageColored,
  formatErrorCountWithFixable,
  formatWarningCountWithFixable,
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
import { getStringWidth } from '../utils/string-width';
import theme from './theme';

function formatIdentifier(e: StatsRow, header: string): string {
  const base =
    header === 'Rule' || e.depth === 1
      ? formatRuleId(e.identifier)
      : formatFilePath(e.identifier, 25);
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
  const extraValue = extra ? extra(e) : undefined;

  // Ensure consistent width for time cells with sparklines
  let tcell: string;
  if (extraValue) {
    // Create a fixed-width cell with sparkline on left and time on right
    const timeStr = time;
    const sparklineWidth = 6; // sparkline is padded to 6 chars
    const timeWidth = getStringWidth(timeStr); // Get visual width accounting for ANSI codes
    const totalWidth = 16; // Fixed total width for the time column
    const availableSpace = totalWidth - sparklineWidth - timeWidth;
    const spacing = Math.max(1, availableSpace); // At least 1 space

    tcell = `${extraValue}${' '.repeat(spacing)}${timeStr}`;
  } else {
    tcell = time;
  }

  return [
    id,
    tcell,
    formatPercentageColored(e.pct, maxes.pct),
    formatErrorCountWithFixable(e.errorCount, e.errorsFixable, maxes.err),
    formatWarningCountWithFixable(
      e.warningCount,
      e.warningsFixable,
      maxes.warn
    ),
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
    transform: (rows: StatsRow[], totalTime: number) => {
      // First filter to get only rule rows
      const ruleRows = rows.filter((r): r is RuleRow => r.depth === 1);
      // Aggregate rules by identifier
      const aggregatedRules = aggregateRulesByIdentifier(ruleRows);
      // Calculate percentages based on total time
      return aggregatedRules.map((r: StatsRow) => ({
        ...r,
        pct: totalTime > 0 ? (r.totalTime / totalTime) * 100 : 0,
      }));
    },
  },
  file: {
    filter: (r: StatsRow) => r.depth === 0,
    extra: sparklineForFile,
    label: 'File',
  },
  'file-rule': {
    filter: () => true,
    label: `File → ${theme.icons.rule} Rule`,
    interleave: true,
    extra: sparklineForFile,
  },
};

// Helper function to limit entries
function limitEntries(
  entries: StatsRow[],
  take: [number, number?]
): StatsRow[] {
  const [limit] = take;
  return limit > 0 ? entries.slice(0, limit) : entries;
}

/**
 * Aggregates rule entries by identifier, summing up their stats
 * @param ruleRows Array of rule rows to aggregate
 * @returns Array of aggregated rule rows
 */
function aggregateRulesByIdentifier(ruleRows: RuleRow[]): RuleRow[] {
  const ruleMap = new Map<string, RuleRow>();

  ruleRows.forEach((rule) => {
    const existing = ruleMap.get(rule.identifier);
    if (existing) {
      // Aggregate the stats
      existing.totalTime += rule.totalTime;
      existing.errorCount += rule.errorCount;
      existing.warningCount += rule.warningCount;
      // Keep the depth and type consistent
    } else {
      // Create a new aggregated rule entry
      ruleMap.set(rule.identifier, {
        ...rule,
        parent: 'aggregated', // Mark as aggregated
      });
    }
  });

  return Array.from(ruleMap.values());
}

// Pure table renderer for pre-formatted data - no sorting, no limiting
function renderStatsTable(
  entries: StatsRow[],
  headerLabel: string,
  extraTimeCell?: CellExtras<StatsRow>,
  headerOptions?: TableHeaderOptions
): string[] {
  // Compute maxima
  const maxes: Maxima = {
    totalTime: max(entries, (d) => d.totalTime) ?? 1,
    pct: max(entries, (d) => d.pct) ?? 1,
    err: max(entries, (d) => d.errorCount) ?? 1,
    warn: max(entries, (d) => d.warningCount) ?? 1,
  };

  // Build rows using formatRow helper
  const rows = entries.map((e) =>
    formatRow(e, maxes, headerLabel, extraTimeCell)
  );

  return [
    renderTable(rows, {
      headers: getTableHeaders(headerLabel, headerOptions),
    }),
  ];
}

// Convenience function for sorted and limited data
function renderSortedTable(
  entries: StatsRow[],
  options: TableViewOptions,
  headerLabel: string,
  extraTimeCell?: CellExtras<StatsRow>
): string[] {
  const { sortBy = 'totalTime', sortDirection = 'desc', take = [10] } = options;

  const sorted = sortEntries(entries, sortBy, sortDirection);
  const limited = limitEntries(sorted, take);

  return renderStatsTable(limited, headerLabel, extraTimeCell, {
    sortBy,
    sortDirection,
  });
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

    // Sort files by the specified criteria
    const sortedFiles = sortEntries(files, sortBy, sortDirection);

    // Handle hierarchical take limits: [fileLimit, ruleLimit]
    const [fileLimit, ruleLimit = fileLimit] = take;
    const limitedFiles = limitEntries(sortedFiles, [fileLimit]);

    items = limitedFiles.flatMap((file) => {
      const kids = rulesByFile.get(file.identifier) ?? [];
      // Sort rules within each file by the specified criteria
      const sortedKids = sortEntries(kids, sortBy, sortDirection);
      const limitedKids = limitEntries(sortedKids, [ruleLimit]);
      return [file, ...limitedKids];
    });

    // Use renderStatsTable for pre-sorted and pre-limited hierarchical data
    return renderStatsTable(items, cfg.label, cfg.extra, {
      sortBy,
      sortDirection,
    });
  }

  // Use renderSortedTable for non-hierarchical data that needs sorting
  return renderSortedTable(
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

  // Helper function to show arrow for the correct column
  const arrow = (col: string) => {
    let showArrow = false;

    // Map sortBy values to column identifiers
    switch (sortBy) {
      case 'totalTime':
        showArrow = col === 'totalTime';
        break;
      case 'errorCount':
        showArrow = col === 'errorCount';
        break;
      case 'warningCount':
        showArrow = col === 'warningCount';
        break;
      case 'identifier':
        showArrow = col === 'identifier';
        break;
    }

    return showArrow ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '';
  };

  // Simplified approach: use emojis with consistent spacing
  const getFirstColumnHeader = () => {
    if (first === 'File') {
      return `${theme.icons.files} ${first}${arrow('identifier')}`;
    } else if (first === 'Rule') {
      return `${theme.icons.rule}  ${first}${arrow('identifier')}`;
    } else if (first === `File → ${theme.icons.rule} Rule`) {
      return `${theme.icons.files} ${first}${arrow('identifier')}`;
    }
    return `${first}${arrow('identifier')}`;
  };

  return [
    getFirstColumnHeader(),
    `${theme.icons.time} Time${arrow('totalTime')}`,
    `%${arrow('totalTime')}`, // Percentage follows time sorting
    `${theme.icons.error} Errors${arrow('errorCount')}`,
    `${theme.icons.warning}  Warnings${arrow('warningCount')}`,
  ];
}
