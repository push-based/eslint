import path from 'path';
import { renderTable } from '../../../../reporting';
import { ProcessedEslintResult } from '../../../../parse/eslint-result-visitor';
import { takeFirst } from '../../../../stats/filter';
import ansis from 'ansis';

export function flattenFormattedEntriesToRows(
  entries: any[],
  indentLevel = 0,
  indentPrefix = '  '
): string[][] {
  const rows: string[][] = [];
  for (const entry of entries) {
    const prefix = indentPrefix.repeat(indentLevel);

    // Check if it's a file entry or rule entry
    const isFile = entry.type === 'file';
    const identifier = entry.identifier;
    const timeMs = entry.ms;
    const errorCount = entry.errors;
    const warningCount = entry.warnings;

    rows.push([
      `${prefix}${identifier}`,
      timeMs,
      entry.relativePercent,
      errorCount,
      warningCount,
    ]);

    // Handle children (rules within files)
    if (isFile && entry.children && entry.children.length > 0) {
      rows.push(
        ...flattenFormattedEntriesToRows(
          entry.children,
          indentLevel + 1,
          indentPrefix
        )
      );
    }
  }
  return rows;
}

function formatErrorCount(count: number, maxErrors: number): string {
  if (count === 0) return ansis.dim.gray('0');
  const ratio = maxErrors > 0 ? count / maxErrors : 0;
  const countStr = count.toString();
  return ratio > 0.99 ? ansis.bold.red(countStr) : ansis.dim.red(countStr);
}

function formatWarningCount(count: number, maxWarnings: number): string {
  if (count === 0) return ansis.dim.gray('0');
  const ratio = maxWarnings > 0 ? count / maxWarnings : 0;
  const countStr = count.toString();
  return ratio > 0.99
    ? ansis.bold.yellow(countStr)
    : ansis.dim.yellow(countStr);
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

function sortEntries<T extends { [key: string]: any }>(
  entries: T[],
  sortBy: string,
  sortDirection: 'asc' | 'desc'
): T[] {
  return [...entries].sort((a, b) => {
    let aVal: any, bVal: any;
    switch (sortBy) {
      case 'errors':
        aVal = a['errors'];
        bVal = b['errors'];
        break;
      case 'warnings':
        aVal = a['warnings'];
        bVal = b['warnings'];
        break;
      case 'identifier':
        return sortDirection === 'asc'
          ? a['filePath']?.localeCompare?.(
              b['filePath'] ?? a['ruleId']?.localeCompare?.(b['ruleId'])
            )
          : b['filePath']?.localeCompare?.(
              a['filePath'] ?? b['ruleId']?.localeCompare?.(a['ruleId'])
            );
      case 'time':
      default:
        aVal = a['time'];
        bVal = b['time'];
        break;
    }
    const diff = bVal - aVal;
    return sortDirection === 'desc' ? diff : -diff;
  });
}

/**
 * Formats a file path with colored directory and filename
 * @param filePath The full file path to format
 * @returns Formatted string with gray directory and green filename
 */
function formatFilePath(filePath: string): string {
  // Get relative path from CWD
  const relativePath = path.relative(process.cwd(), filePath);
  const dirname = path.dirname(relativePath);
  const basename = path.basename(relativePath);

  // If path is too long, truncate the directory part
  const maxDirLength = 20;
  let truncatedDir = dirname;

  if (dirname.length > maxDirLength) {
    // Split path into segments and keep only the last segment
    const segments = dirname.split(path.sep);
    if (segments.length > 1) {
      truncatedDir = '...' + path.sep + segments[segments.length - 1];
    } else {
      truncatedDir = '...' + dirname.slice(-maxDirLength);
    }
  }

  return dirname === '.'
    ? ansis.green(basename)
    : `${ansis.dim.gray(truncatedDir)}${path.sep}${ansis.green(basename)}`;
}

function formatRuleId(
  ruleId: string,
  time: number,
  errors: number,
  warnings: number
): string {
  const parts = ruleId.split('/');
  const shouldDim = time === 0 || (errors === 0 && warnings === 0);

  if (parts.length > 1) {
    const formatted = `${ansis.dim.gray(parts[0])}${ansis.gray(
      '/'
    )}${ansis.cyan(parts[1])}`;
    return shouldDim ? ansis.dim(formatted) : formatted;
  }
  const formatted = ansis.cyan(ruleId);
  return shouldDim ? ansis.dim(formatted) : formatted;
}

/**
 * Creates table rows grouped by rule (flat list of rules with aggregated stats)
 */
function createRuleGroupedTableView(
  results: ProcessedEslintResult,
  options: EslintStatsViewOptions = {}
): string[][] {
  const { sortBy = 'time', sortDirection = 'desc', take = [10] } = options;
  const [limit] = take; // Extract the first number from take array

  const ruleGroups = new Map<
    string,
    { time: number; errors: number; warnings: number }
  >();

  results.files.forEach((file) => {
    file.rules.forEach((rule) => {
      if (!ruleGroups.has(rule.ruleId)) {
        ruleGroups.set(rule.ruleId, {
          time: 0,
          errors: 0,
          warnings: 0,
        });
      }
      const ruleData = ruleGroups.get(rule.ruleId)!;
      ruleData.time += rule.time;
      ruleData.errors += rule.violations.errorMessages.length;
      ruleData.warnings += rule.violations.warningMessages.length;
    });
  });

  // Use total time from results
  const totalTime = results.times.total || 0;

  // Convert to table rows with sorting
  let ruleEntries = Array.from(ruleGroups.entries()).map(([ruleId, data]) => ({
    ruleId,
    time: data.time,
    errors: data.errors,
    warnings: data.warnings,
    percentage: (data.time / totalTime) * 100,
  }));

  // Apply sorting
  ruleEntries = sortEntries(ruleEntries, sortBy, sortDirection);

  // Apply limit
  if (limit > 0) {
    ruleEntries = ruleEntries.slice(0, limit);
  }

  // Find max time and max percentage for grayscale
  const maxTime = Math.max(...ruleEntries.map((e) => e.time), 1);
  const maxPercentage = Math.max(...ruleEntries.map((e) => e.percentage), 1);
  const maxErrors = Math.max(...ruleEntries.map((e) => e.errors), 1);
  const maxWarnings = Math.max(...ruleEntries.map((e) => e.warnings), 1);
  // Convert to string array format
  return ruleEntries.map((entry) => [
    formatRuleId(entry.ruleId, entry.time, entry.errors, entry.warnings),
    formatTimeColored(entry.time, maxTime),
    formatPercentageColored(entry.percentage, maxPercentage),
    formatErrorCount(entry.errors, maxErrors),
    formatWarningCount(entry.warnings, maxWarnings),
  ]);
}

/**
 * Creates table rows grouped by file (flat list of files with aggregated stats)
 */
function createFileGroupedTableView(
  results: ProcessedEslintResult,
  options: TableViewOptions = {}
): string[][] {
  const { sortBy = 'time', sortDirection = 'desc', take = [10] } = options;

  // Use total time from results
  const totalTime = results.times.total || 0;

  // Map files to display entries
  let fileEntries = results.files.map((file) => ({
    filePath: file.filePath,
    time: file.times.total,
    errors: file.violations.errorCount,
    warnings: file.violations.warningCount,
    percentage: (file.times.total / totalTime) * 100,
  }));

  // Sort files
  fileEntries = sortEntries(fileEntries, sortBy, sortDirection);

  // Limit files
  if (take[0] > 0) {
    fileEntries = takeFirst(fileEntries, take);
  }

  // Find max time and max percentage for grayscale
  const maxTime = Math.max(...fileEntries.map((e) => e.time), 1);
  const maxPercentage = Math.max(...fileEntries.map((e) => e.percentage), 1);
  const maxErrors = Math.max(...fileEntries.map((e) => e.errors), 1);
  const maxWarnings = Math.max(...fileEntries.map((e) => e.warnings), 1);
  // Convert to string array format using the helper function
  return fileEntries.map((entry) => [
    formatFilePath(entry.filePath),
    formatTimeColored(entry.time, maxTime),
    formatPercentageColored(entry.percentage, maxPercentage),
    formatErrorCount(entry.errors, maxErrors),
    formatWarningCount(entry.warnings, maxWarnings),
  ]);
}

/**
 * Creates hierarchical table rows with files and their rules (file-rule grouping)
 */
function createFileRuleHierarchicalTableView(
  results: ProcessedEslintResult,
  options: TableViewOptions = {}
): string[][] {
  const { sortBy = 'time', sortDirection = 'desc', take = [10, 4] } = options;
  const [fileLimit, ruleLimit = fileLimit] = take; // Use the same limit for rules if not specified

  // Use total time from results
  const totalTime = results.times.total || 0;

  // Convert to sortable format first
  let fileEntries = results.files.map((file) => {
    const fileTime = file.times.total;

    // Prepare rule entries for this file
    const ruleGroups = new Map<
      string,
      { time: number; errors: number; warnings: number }
    >();
    file.rules.forEach((rule) => {
      if (!ruleGroups.has(rule.ruleId)) {
        ruleGroups.set(rule.ruleId, { time: 0, errors: 0, warnings: 0 });
      }
      const ruleData = ruleGroups.get(rule.ruleId)!;
      ruleData.time += rule.time;
      ruleData.errors += rule.violations.errorMessages.length;
      ruleData.warnings += rule.violations.warningMessages.length;
    });

    // Convert ruleGroups to sorted array for easier limiting
    let ruleEntries = Array.from(ruleGroups.entries()).map(
      ([ruleId, data]) => ({
        ruleId,
        time: data.time,
        errors: data.errors,
        warnings: data.warnings,
        percentage: fileTime ? (data.time / fileTime) * 100 : 0,
      })
    );

    // Sort rules within each file
    ruleEntries = sortEntries(ruleEntries, sortBy, sortDirection);

    // Apply rule limit
    if (ruleLimit > 0) {
      ruleEntries = ruleEntries.slice(0, ruleLimit);
    }

    return {
      filePath: file.filePath,
      time: fileTime,
      errors: file.violations.errorCount,
      warnings: file.violations.warningCount,
      percentage: (fileTime / totalTime) * 100,
      rules: ruleEntries,
    };
  });

  // Apply sorting to files
  fileEntries = sortEntries(fileEntries, sortBy, sortDirection);

  // Apply file limit
  if (fileLimit > 0) {
    fileEntries = fileEntries.slice(0, fileLimit);
  }

  // Find max time and max percentage for grayscale
  const maxTime = Math.max(...fileEntries.map((e) => e.time), 1);
  const maxPercentage = Math.max(...fileEntries.map((e) => e.percentage), 1);
  const maxErrors = Math.max(...fileEntries.map((e) => e.errors), 1);
  const maxWarnings = Math.max(...fileEntries.map((e) => e.warnings), 1);
  // Build hierarchical display rows
  const displayRows: string[][] = [];

  fileEntries.forEach((fileEntry) => {
    // Add file row using the helper function
    displayRows.push([
      formatFilePath(fileEntry.filePath),
      formatTimeColored(fileEntry.time, maxTime),
      formatPercentageColored(fileEntry.percentage, maxPercentage),
      formatErrorCount(fileEntry.errors, maxErrors),
      formatWarningCount(fileEntry.warnings, maxWarnings),
    ]);

    // Add rule rows (indented)
    // Find max time and percentage for rules in this file
    const ruleMaxTime = Math.max(...fileEntry.rules.map((r) => r.time), 1);
    const ruleMaxPercentage = Math.max(
      ...fileEntry.rules.map((r) => r.percentage),
      1
    );
    const ruleMaxErrors = Math.max(...fileEntry.rules.map((r) => r.errors), 1);
    const ruleMaxWarnings = Math.max(
      ...fileEntry.rules.map((r) => r.warnings),
      1
    );
    fileEntry.rules.forEach((ruleEntry) => {
      displayRows.push([
        `  ${formatRuleId(
          ruleEntry.ruleId,
          ruleEntry.time,
          ruleEntry.errors,
          ruleEntry.warnings
        )}`,
        formatTimeColored(ruleEntry.time, ruleMaxTime),
        formatPercentageColored(ruleEntry.percentage, ruleMaxPercentage),
        formatErrorCount(ruleEntry.errors, ruleMaxErrors),
        formatWarningCount(ruleEntry.warnings, ruleMaxWarnings),
      ]);
    });
  });

  return displayRows;
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
  let displayRows: string[];
  if (viewName === 'rule') {
    displayRows = renderEsLintRulesView(detailedStats, tableOptions);
  } else if (viewName === 'file') {
    displayRows = renderEsLintFilesView(detailedStats, tableOptions);
  } else {
    displayRows = renderEsLintFilesAndRulesView(detailedStats, tableOptions);
  }

  return [...displayRows];
}

function renderEsLintRulesView(
  results: ProcessedEslintResult,
  state: TableViewOptions
): string[] {
  const { sortBy = 'time', sortDirection = 'desc', take } = state;

  const data = createRuleGroupedTableView(results, {
    sortDirection,
    sortBy,
    take,
  });

  return [
    renderTable(data, {
      headers: getTableHeaders('Rule', { sortBy, sortDirection }),
    }),
  ];
}

function renderEsLintFilesView(
  results: ProcessedEslintResult,
  state: TableViewOptions
): string[] {
  const { sortBy = 'time', sortDirection = 'desc', take } = state;

  const data = createFileGroupedTableView(results, {
    sortDirection,
    sortBy,
    take,
  });

  return [
    renderTable(data, {
      headers: getTableHeaders('File', { sortBy, sortDirection }),
    }),
  ];
}

function renderEsLintFilesAndRulesView(
  results: ProcessedEslintResult,
  state: TableViewOptions
): string[] {
  const { sortBy = 'time', sortDirection = 'desc', take } = state;

  const data = createFileRuleHierarchicalTableView(results, {
    sortDirection,
    sortBy,
    take,
  });

  return [
    renderTable(data, {
      headers: getTableHeaders('File/Rule', { sortBy, sortDirection }),
    }),
  ];
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

  return [
    `${firstColumn}${getArrow('identifier')}`,
    `Time${getArrow('time')}`,
    `%${getArrow('time')}`,
    `🚨 Errors${getArrow('errors')}`,
    `⚠️ Warnings${getArrow('warnings')}`,
  ];
}

function interpolateGrayHex(ratio: number): (str: string) => string {
  // Clamp ratio between 0 and 1
  ratio = Math.max(0, Math.min(1, ratio));
  // Bright gray: #dddddd, Dark gray: #222222
  const from = 0xdd;
  const to = 0x22;
  const value = Math.round(from * ratio + to * (1 - ratio));
  const hex = `#${value.toString(16).padStart(2, '0').repeat(3)}`;
  // Make max value bold
  return ratio > 0.99 ? ansis.bold.hex(hex) : ansis.hex(hex);
}

function formatTimeColored(timeMs: number, maxTime: number): string {
  if (timeMs <= 0.001) return ansis.dim.gray('0 ms');
  const ratio = maxTime > 0 ? timeMs / maxTime : 0;
  return interpolateGrayHex(ratio)(`${timeMs.toFixed(2)} ms`);
}

function formatPercentageColored(
  percentage: number,
  maxPercentage: number
): string {
  if (percentage <= 0.001) return ansis.dim.gray('0.0%');
  const ratio = maxPercentage > 0 ? percentage / maxPercentage : 0;
  return interpolateGrayHex(ratio)(`${percentage.toFixed(1)}%`);
}
