import { renderTable } from './render-table';
import { ProcessedEslintResult } from '../parse';
import { extent, max, group } from 'd3-array';
import {
  formatTimeColored,
  formatPercentageColored,
  formatErrorCount,
  formatWarningCount,
  formatFilePath,
  formatRuleId,
} from './format';
import {
  extractRuleEntries,
  extractFileEntries,
  extractHierarchicalEntries,
  RuleEntry,
  FileEntry,
} from './extract';
import { sortEntries } from './sort';
import { sparkline } from './spark-line';
import ansis from 'ansis';

const stripAnsi = (str: string) => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
};

function maxStrLen<T>(data: T[], toStr: (d: T) => string): number {
  return max(data, (d) => stripAnsi(toStr(d)).length) ?? 0;
}

type SortableEntry = RuleEntry | FileEntry | HierarchicalEntry;

function formatIdentifier(e: SortableEntry, headerLabel: string): string {
  const depth = 'depth' in e ? e.depth : undefined;
  const base =
    headerLabel === 'Rule' || depth === 1
      ? formatRuleId(e.identifier)
      : formatFilePath(e.identifier);
  return depth !== undefined ? '  '.repeat(depth) + base : base;
}

function sparklineForFile(e: FileEntry): string | undefined {
  if (
    'parseTime' in e &&
    e.parseTime !== undefined &&
    (!('depth' in e) || ('depth' in e && e.depth === 0))
  ) {
    const times = [
      Math.round(e.parseTime * 1000),
      Math.round((e.rulesTime || 0) * 1000),
      Math.round((e.fixTime || 0) * 1000),
    ];
    return sparkline(times, {
      max: Math.round(e.time * 1000), // Convert total time to ms
      colors: [
        (str) => ansis.dim.green(str), // parse time in green (like file names)
        (str) => ansis.dim.cyan(str), // rules time in cyan (like rule IDs)
        (str) => ansis.dim.magenta(str), // fix time in magenta
      ],
    });
  }
  return undefined;
}

export type HierarchicalEntry = FileEntry & {
  depth: number;
  parentIdentifier?: string;
  file?: ProcessedEslintResult['files'][0];
};

function getMaxes<T>(data: T[], accessors: ((d: T) => number)[]): number[] {
  return accessors.map((fn) => {
    const [, m = 1] = extent(data, fn) as [number, number?];
    return m || 1;
  });
}

export type TableViewOptions = {
  sortBy?: 'time' | 'errors' | 'warnings' | 'identifier';
  sortDirection?: 'asc' | 'desc';
  take?: [number, number?];
};

export type EslintStatsViewOptions = TableViewOptions & {
  lastAction?: 'showView' | 'sortBy' | 'sortDirection' | 'take';
  viewName?: 'rule' | 'file' | 'file-rule';
};

export type TableHeaderOptions = {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

type CellExtras<T> = (entry: T) => string | undefined;

function makeTableView<T extends SortableEntry>(
  entries: T[],
  { sortBy = 'time', sortDirection = 'desc', take = [10] }: TableViewOptions,
  headerLabel: string,
  extraTimeCell?: CellExtras<T>
): string[] {
  const sorted = sortEntries(entries, sortBy, sortDirection) as T[];

  // Calculate max values using all entries
  const [maxTime, maxPct, maxErr, maxWarn] = getMaxes(sorted, [
    (d) => d.time,
    (d) => d.percentage,
    (d) => d.errors,
    (d) => d.warnings,
  ]);

  // For hierarchical data, handle file and rule limits using parentIdentifier
  const hasHierarchy = entries.some((e) => 'depth' in e);
  let limited: T[];

  if (hasHierarchy) {
    const [fileLimit, ruleLimit = fileLimit] = take;

    const childrenMap = group(
      sorted.filter((e) => 'depth' in e && e.depth === 1),
      (d) => ('parentIdentifier' in d ? d.parentIdentifier : '')
    );

    const files = sorted.filter((e): e is T => 'depth' in e && e.depth === 0);
    const limitedFiles = fileLimit > 0 ? files.slice(0, fileLimit) : files;

    limited = limitedFiles.flatMap((file) => {
      const kids = childrenMap.get(file.identifier) ?? [];
      const limitedKids = ruleLimit > 0 ? kids.slice(0, ruleLimit) : kids;
      return [file, ...limitedKids];
    }) as T[];
  } else {
    limited = take[0] > 0 ? sorted.slice(0, take[0]) : sorted;
  }

  const [maxIdLen, maxTimeLen] = [
    maxStrLen(limited, (e) => formatIdentifier(e, headerLabel)),
    maxStrLen(limited, (e) => formatTimeColored(e.time, maxTime)),
  ];

  const rows = limited.map((e) => {
    const identifier = formatIdentifier(e, headerLabel);
    const timeStr = formatTimeColored(e.time, maxTime);
    let timeCell = timeStr;

    if (extraTimeCell) {
      const more = extraTimeCell(e);
      if (more) {
        timeCell = `${more} ${stripAnsi(timeStr)
          .padStart(maxTimeLen)
          .replace(stripAnsi(timeStr).trim(), timeStr)}`;
      }
    }

    return [
      identifier,
      timeCell,
      formatPercentageColored(e.percentage, maxPct),
      formatErrorCount(e.errors, maxErr),
      formatWarningCount(e.warnings, maxWarn),
    ];
  });

  // Calculate the longest time length from all rows including sparklines
  const longestTimeLength = maxStrLen(rows, (row) => row[1]);

  return [
    renderTable(rows, {
      headers: getTableHeaders(headerLabel, { sortBy, sortDirection }),
      width: [
        maxIdLen, // First column: identifier
        longestTimeLength, // Second column: time
        8, // Third column: percentage
      ],
    }),
  ];
}

type ViewConfig = {
  extractor: (r: ProcessedEslintResult, t: number) => SortableEntry[];
  header: string;
  extra?: CellExtras<SortableEntry>;
};

const viewConfigs: Record<string, ViewConfig> = {
  rule: {
    extractor: extractRuleEntries,
    header: 'Rule',
  },
  file: {
    extractor: extractFileEntries,
    header: 'File',
    extra: sparklineForFile,
  },
  'file-rule': {
    extractor: extractHierarchicalEntries,
    header: 'File/Rule',
    extra: sparklineForFile,
  },
};

export function renderInteractiveEsLintStatsView(
  state: EslintStatsViewOptions,
  detailedStats: ProcessedEslintResult
): string[] {
  const {
    sortBy = 'time',
    sortDirection = 'desc',
    take = [10],
    viewName = 'file-rule',
  } = state;

  const tableOptions: TableViewOptions = {
    sortBy,
    sortDirection,
    take,
  };

  const cfg = viewConfigs[viewName] ?? viewConfigs['file-rule'];
  const totalTime = detailedStats.times.total || 0;
  const entries = cfg.extractor(detailedStats, totalTime);

  return makeTableView(
    entries,
    tableOptions,
    cfg.header,
    cfg.extra as CellExtras<SortableEntry> | undefined
  );
}

export function getTableHeaders(
  firstColumn: string,
  options: TableHeaderOptions = {}
): string[] {
  const { sortBy, sortDirection } = options;
  const getArrow = (column: string) => {
    if (sortBy !== column) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const formatHeader = (label: string, column: string) => {
    if (label === 'Rule') {
      return `${label}`;
    }
    return `${label}${getArrow(column)}`;
  };

  return [
    formatHeader(firstColumn, 'identifier'),
    formatHeader('Time', 'time'),
    formatHeader('%', 'time'),
    formatHeader('🚨 Errors', 'errors'),
    formatHeader('⚠️ Warnings', 'warnings'),
  ];
}
