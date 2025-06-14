import { renderTable } from '../../../../reporting';
import {
  ProcessedEslintResult,
  ProcessedRule,
} from '../../../../parse/eslint-result-visitor';
import { extent } from 'd3-array';
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

function makeTableView(
  entries: (RuleEntry | FileEntry | HierarchicalEntry)[],
  { sortBy = 'time', sortDirection = 'desc', take = [10] }: TableViewOptions,
  headerLabel: string
): string[] {
  const sorted = sortEntries(entries, sortBy, sortDirection);

  // Calculate max values using all entries
  const [maxTime, maxPct, maxErr, maxWarn] = getMaxes(sorted, [
    (d) => d.time,
    (d) => d.percentage,
    (d) => d.errors,
    (d) => d.warnings,
  ]);

  // For hierarchical data, handle file and rule limits using parentIdentifier
  const hasHierarchy = entries.some((e) => 'depth' in e);
  let limited: (RuleEntry | FileEntry | HierarchicalEntry)[];

  if (hasHierarchy) {
    const [fileLimit, ruleLimit = fileLimit] = take;
    const files = sorted.filter(
      (e): e is HierarchicalEntry => 'depth' in e && e.depth === 0
    );
    const limitedFiles = fileLimit > 0 ? files.slice(0, fileLimit) : files;
    limited = limitedFiles.flatMap((file) => {
      const rules = sorted.filter((e): e is HierarchicalEntry => {
        if (!('depth' in e) || e.depth !== 1) return false;
        const hierarchicalEntry = e as HierarchicalEntry;
        return hierarchicalEntry.parentIdentifier === file.identifier;
      });
      const limitedRules = ruleLimit > 0 ? rules.slice(0, ruleLimit) : rules;
      return [file, ...limitedRules];
    });
  } else {
    limited = take[0] > 0 ? sorted.slice(0, take[0]) : sorted;
  }

  const maxTimeStrLength = limited.reduce((max, e) => {
    const timeStr = formatTimeColored(e.time, maxTime);
    return Math.max(max, stripAnsi(timeStr).length);
  }, 0);

  const rows = limited.map((e) => {
    let timeStr = formatTimeColored(e.time, maxTime);

    // Add sparkline only for file entries (depth 0)
    if (
      'parseTime' in e &&
      e.parseTime !== undefined &&
      (!('depth' in e) || e.depth === 0)
    ) {
      const times = [
        Math.round(e.parseTime * 1000),
        Math.round((e.rulesTime || 0) * 1000),
        Math.round((e.fixTime || 0) * 1000),
      ];
      const spark = sparkline(times, {
        max: Math.round(e.time * 1000), // Convert total time to ms
        colors: [
          (str) => ansis.dim.green(str), // parse time in green (like file names)
          (str) => ansis.dim.cyan(str), // rules time in cyan (like rule IDs)
          (str) => ansis.dim.magenta(str), // fix time in magenta
        ],
      });
      timeStr = `${spark} ${stripAnsi(timeStr)
        .padStart(maxTimeStrLength)
        .replace(
          stripAnsi(timeStr).trim(),
          (match) => `${formatTimeColored(e.time, maxTime)}`
        )}`;
    }

    return [
      `${'depth' in e ? '  '.repeat(e.depth) : ''}${
        'depth' in e && e.depth === 1
          ? formatRuleId(e.identifier)
          : formatFilePath(e.identifier)
      }`,
      timeStr,
      formatPercentageColored(e.percentage, maxPct),
      formatErrorCount(e.errors, maxErr),
      formatWarningCount(e.warnings, maxWarn),
    ];
  });

  // Calculate the longest identifier length from all entries
  const longestIdentifierLength = sorted.reduce((max, e) => {
    const formattedPath =
      'depth' in e && (e as HierarchicalEntry).depth === 1
        ? formatRuleId(e.identifier)
        : formatFilePath(e.identifier);
    const depthPadding = 'depth' in e ? (e as HierarchicalEntry).depth * 2 : 0;
    const strippedLength = stripAnsi(formattedPath).length + depthPadding;
    return Math.max(max, strippedLength);
  }, 0);

  const longestTimeLength = rows.reduce((max, row) => {
    const strippedLength = stripAnsi(row[1]).length;
    return Math.max(max, strippedLength);
  }, 0);

  return [
    renderTable(rows, {
      headers: getTableHeaders(headerLabel, { sortBy, sortDirection }),
      width: [
        longestIdentifierLength, // First column: identifier
        longestTimeLength, // Second column: time
        8, // Third column: percentage
      ],
    }),
  ];
}

function renderEsLintRulesView(
  results: ProcessedEslintResult,
  options: TableViewOptions
): string[] {
  const totalTime = results.times.total || 0;
  const entries = extractRuleEntries(results, totalTime);
  return makeTableView(entries, options, 'Rule');
}

function renderEsLintFilesView(
  results: ProcessedEslintResult,
  options: TableViewOptions
): string[] {
  const totalTime = results.times.total || 0;
  const entries = extractFileEntries(results, totalTime);
  return makeTableView(entries, options, 'File');
}

function renderEsLintFilesAndRulesView(
  results: ProcessedEslintResult,
  options: TableViewOptions
): string[] {
  const totalTime = results.times.total || 0;
  const rawEntries = extractHierarchicalEntries(results, totalTime);

  const entries = rawEntries.flatMap((entry) => {
    const { identifier, file, ...stats } = entry;
    if (!file) {
      return [stats as FileEntry];
    }

    const fileEntry: HierarchicalEntry = {
      ...stats,
      identifier,
      depth: 0,
      file,
    };

    const ruleEntries: HierarchicalEntry[] = file.rules.map(
      (rule: ProcessedRule) => ({
        identifier: rule.ruleId,
        time: rule.time,
        errors: rule.violations.errorMessages.length,
        warnings: rule.violations.warningMessages.length,
        percentage:
          file.times.total > 0 ? (rule.time / file.times.total) * 100 : 0,
        depth: 1,
        parentIdentifier: identifier,
      })
    );

    return [fileEntry, ...ruleEntries];
  });

  return makeTableView(entries, options, 'File/Rule');
}

export function renderInteractiveEsLintStatsView(
  state: EslintStatsViewOptions,
  detailedStats: ProcessedEslintResult
): string[] {
  const {
    sortBy = 'time',
    sortDirection = 'desc',
    take = [10],
    lastAction = 'showView',
    viewName = 'file-rule',
  } = state;

  // Create options for table view helpers
  const tableOptions = {
    sortBy,
    sortDirection,
    take: Array.isArray(take) && take.length > 0 ? [take[0], take[1]] : [10],
    lastAction,
  } as EslintStatsViewOptions;

  // Create table rows based on viewName setting using helper functions
  if (viewName === 'rule') {
    return renderEsLintRulesView(detailedStats, tableOptions);
  } else if (viewName === 'file') {
    return renderEsLintFilesView(detailedStats, tableOptions);
  } else {
    return renderEsLintFilesAndRulesView(detailedStats, tableOptions);
  }
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
      return `${label} (Time, Errors, Warnings)${getArrow(column)}`;
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
