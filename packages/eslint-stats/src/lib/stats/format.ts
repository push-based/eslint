import path from 'path';
import theme from './theme';
import { StatsRow } from './stats-hierarchy';
import { asciiSparkline } from '../utils/ascii-sparkline';
import ansis from 'ansis';
import { format } from 'd3-format';

const defaultMaxLen = 50;

/**
 * Smartly truncate a directory path to at most `maxLen` characters,
 * preserving the first segment, an ellipsis, and the last two segments.
 */
export function smartTruncateDir(
  dir: string,
  maxLen: number = defaultMaxLen
): string {
  if (dir.length <= maxLen) return dir;

  const parts = dir.split(path.sep);
  if (parts.length <= 3) {
    // e.g. ["a","b","c"] → collapse just the first if still too long
    const collapsed = ['…', ...parts.slice(-2)].join(path.sep);
    return collapsed.length <= maxLen
      ? collapsed
      : collapsed.slice(0, maxLen - 1) + '…';
  }

  // keep first + last two segments
  const collapsed = [parts[0], '…', ...parts.slice(-2)].join(path.sep);
  return collapsed.length <= maxLen
    ? collapsed
    : collapsed.slice(0, maxLen - 1) + '…';
}

/**
 * Formats a file path with colored directory and filename
 * @param filePath The full file path to format
 * @param maxLen Optional maximum length for the directory part
 * @returns Formatted string with gray directory and green filename
 */
export function formatFilePath(filePath: string, maxLen = 40): string {
  const displayDir = smartTruncateDir(path.dirname(filePath), maxLen - 15);
  const basename = path.basename(filePath);
  return `${theme.text.secondary(displayDir)}${theme.text.file(basename)}`;
}

/**
 * Formats a rule ID with plugin prefix dimmed
 * @param ruleId The rule ID to format
 * @returns Formatted rule ID string
 */
export function formatRuleId(ruleId: string): string {
  if (!ruleId.includes('/')) {
    return theme.text.rule(ruleId);
  }
  const [plugin, rule] = ruleId.split('/');
  return `${theme.text.secondary(plugin + '/')}${theme.text.rule(rule)}`;
}

// Use the shared theme formatters directly
export const formatTimeColored = theme.formatters.time;
export const formatPercentageColored = theme.formatters.percentage;
export const formatErrorCount = theme.formatters.errors;
export const formatWarningCount = theme.formatters.warnings;

/**
 * Formats error count with fixable indicator
 * @param errorCount Total error count
 * @param isFixable Whether ALL errors are fixable
 * @param maxErrorCount Maximum error count for scaling
 * @returns Formatted error count string with 🔧 icon if all errors are fixable
 */
export function formatErrorCountWithFixable(
  errorCount: number,
  isFixable: boolean,
  maxErrorCount: number
): string {
  const baseFormatted = theme.formatters.errors(errorCount, maxErrorCount);
  return errorCount > 0 && isFixable
    ? `${baseFormatted} ${theme.icons.fixable}`
    : baseFormatted;
}

/**
 * Formats warning count with fixable indicator
 * @param warningCount Total warning count
 * @param isFixable Whether ALL warnings are fixable
 * @param maxWarningCount Maximum warning count for scaling
 * @returns Formatted warning count string with 🔧 icon if all warnings are fixable
 */
export function formatWarningCountWithFixable(
  warningCount: number,
  isFixable: boolean,
  maxWarningCount: number
): string {
  const baseFormatted = theme.formatters.warnings(
    warningCount,
    maxWarningCount
  );
  return warningCount > 0 && isFixable
    ? `${baseFormatted} ${theme.icons.fixable}`
    : baseFormatted;
}

/**
 * Formats time in a human-readable format with SI prefixes
 * @param time Time in milliseconds
 * @returns Formatted time string with appropriate SI prefix
 */
export function formatTime(time: number): string {
  const fmtSI = format('.1s');
  return fmtSI(time / 1000) + 's';
}

/**
 * Formats a date as MM/DD/YY HH:MM:SS
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const formattedDate = date.toLocaleDateString('en-US', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${formattedDate} ${formattedTime}`;
}

/**
 * Formats a command with the command prompt prefix
 * @param command The command string to format
 * @returns Formatted command string with ❯ prefix
 */
export function formatCommand(command: string): string {
  return `❯ ${command}`;
}

/**
 * Interface for totals data used in formatting
 */
export interface TotalsData {
  fileCount: number;
  ruleCount: number;
  totalTime: number;
  parseTime: number;
  rulesTime: number;
  fixTime: number;
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
  fixableCount: number;
}

/**
 * Creates a sparkline for totals data
 * @param totals The totals data
 * @returns Formatted sparkline string
 */
export function createTotalsSparkline(totals: TotalsData): string {
  const otherTime = Math.max(
    0,
    totals.totalTime - totals.rulesTime - totals.fixTime - totals.parseTime
  );

  const timesMs = [
    totals.parseTime,
    totals.rulesTime,
    totals.fixTime,
    otherTime,
  ];

  const sparkline = asciiSparkline(timesMs, {
    min: 0,
    max: totals.totalTime,
    colors: [
      (s: string) => theme.text.secondary(theme.text.file(s)), // Parse time - dimmed file processing (green)
      (s: string) => theme.text.secondary(theme.text.rule(s)), // Rules time - dimmed rule execution (cyan)
      (s: string) => theme.text.secondary(ansis.red(s)), // Fix time - dimmed error fixing (red)
      (s: string) => theme.text.secondary(s), // Other time - already dim
    ],
  });

  return sparkline.padEnd(6, ' ');
}

/**
 * Formats the totals line for different view types
 * @param totals The totals data
 * @param viewType The current view type ('rule', 'file', or 'file-rule')
 * @param filePath Optional file path to display at the start of the totals line
 * @param decodedCommand Optional decoded command to display
 * @returns Formatted totals line string
 */
export function formatTotalsLine(
  totals: TotalsData,
  viewType: 'rule' | 'file' | 'file-rule',
  filePath?: string,
  decodedCommand?: string
): string {
  const sparkline = createTotalsSparkline(totals);
  const percentPart = formatPercentPart(totals);
  const errorPart = formatErrorPart(totals);
  const warningPart = formatWarningPart(totals);

  const commandLine = decodedCommand
    ? `${formatCommand(decodedCommand)}\n`
    : '';

  const prefix = commandLine;

  switch (viewType) {
    case 'rule': {
      const ruleStats = formatRuleStats(totals, percentPart);
      return prefix + ruleStats + errorPart + warningPart;
    }

    case 'file': {
      const timePart = formatTimePart(totals, sparkline);
      const fileStats = formatFileStats(totals, percentPart);
      return prefix + fileStats + timePart + errorPart + warningPart;
    }

    case 'file-rule': {
      const timePart = formatTimePart(totals, sparkline);
      const fileRuleStats = formatFileRuleStats(totals, percentPart);
      return prefix + fileRuleStats + timePart + errorPart + warningPart;
    }

    default:
      return prefix;
  }
}

/**
 * Formats the time breakdown part of the totals line
 * @param totals The totals data
 * @param sparkline The sparkline to include with the time breakdown
 * @returns Formatted time breakdown string
 */
export function formatTimePart(totals: TotalsData, sparkline: string): string {
  const otherTime = Math.max(
    0,
    totals.totalTime - totals.rulesTime - totals.fixTime - totals.parseTime
  );
  return ` · ${theme.text.file(formatTime(totals.parseTime))}/${theme.text.rule(
    formatTime(totals.rulesTime)
  )}/${ansis.red(formatTime(totals.fixTime))}/${theme.text.secondary(
    formatTime(otherTime)
  )} ${sparkline}`;
}

/**
 * Formats the error count part with fixable indicators
 * @param totals The totals data
 * @returns Formatted error part string
 */
export function formatErrorPart(totals: TotalsData): string {
  // Use the same formatting as the table for consistency
  const errorText =
    totals.errorCount === 0
      ? theme.text.secondary(totals.errorCount.toString())
      : ansis.bold.red(totals.errorCount);

  const fixableText =
    totals.fixableErrorCount === 0
      ? theme.text.secondary(totals.fixableErrorCount.toString())
      : ansis.bold(theme.text.file(totals.fixableErrorCount));

  return ` · 🚨 ${errorText}(🔧 ${fixableText})`;
}

/**
 * Formats the warning count part with fixable indicators
 * @param totals The totals data
 * @returns Formatted warning part string
 */
export function formatWarningPart(totals: TotalsData): string {
  // Use the same formatting as the table for consistency
  const warningText =
    totals.warningCount === 0
      ? theme.text.secondary(totals.warningCount.toString())
      : ansis.bold.yellow(totals.warningCount);

  const fixableText =
    totals.fixableWarningCount === 0
      ? theme.text.secondary(totals.fixableWarningCount.toString())
      : ansis.bold(theme.text.file(totals.fixableWarningCount));

  return ` · ⚠️ ${warningText}(🔧 ${fixableText})`;
}

/**
 * Formats the rules time percentage part
 * @param totals The totals data
 * @returns Formatted percentage part string
 */
export function formatPercentPart(totals: TotalsData): string {
  const rulesTimePercent =
    totals.totalTime > 0
      ? ((totals.rulesTime / totals.totalTime) * 100).toFixed(1)
      : '0.0';
  return `(${ansis.bold.blue(rulesTimePercent)}%)`;
}

/**
 * Formats the rule view stats part
 * @param totals The totals data
 * @param percentPart The formatted percentage part
 * @returns Formatted rule stats string
 */
export function formatRuleStats(
  totals: TotalsData,
  percentPart: string
): string {
  return `⚙️ ${ansis.bold(
    theme.text.rule(totals.ruleCount)
  )} · ⏱ ${ansis.bold.blue(formatTime(totals.totalTime))} ${percentPart}`;
}

/**
 * Formats the file view stats part
 * @param totals The totals data
 * @param percentPart The formatted percentage part
 * @returns Formatted file stats string
 */
export function formatFileStats(
  totals: TotalsData,
  percentPart: string
): string {
  return `${theme.icons.file} ${ansis.bold(
    theme.text.file(totals.fileCount)
  )} · ⏱ ${ansis.bold.blue(formatTime(totals.totalTime))} ${percentPart}`;
}

/**
 * Formats the file-rule view stats part
 * @param totals The totals data
 * @param percentPart The formatted percentage part
 * @returns Formatted file-rule stats string
 */
export function formatFileRuleStats(
  totals: TotalsData,
  percentPart: string
): string {
  return `${theme.icons.file} ${ansis.bold(
    theme.text.file(totals.fileCount)
  )} · ⚙️ ${ansis.bold(
    theme.text.rule(totals.ruleCount)
  )} · ⏱ ${ansis.bold.blue(formatTime(totals.totalTime))} ${percentPart}`;
}

export function sparklineForFile(e: StatsRow): string | undefined {
  if (e.depth !== 0) return undefined;
  const { rulesTime, fixTime, totalTime, parseTime } = e;
  const otherTime = Math.max(0, totalTime - rulesTime - fixTime - parseTime);

  const timesMs = [parseTime, rulesTime, fixTime, otherTime];

  const sparkline = asciiSparkline(timesMs, {
    min: 0,
    max: totalTime,
    colors: [
      (s: string) => theme.text.secondary(theme.text.file(s)),
      (s: string) => theme.text.secondary(theme.text.rule(s)),
      (s: string) => theme.text.secondary(ansis.red(s)),
      (s: string) => theme.text.secondary(s),
    ],
  });

  // Pad sparkline to ensure consistent alignment - sparkline is 4 chars, pad to 6 total width
  return sparkline.padEnd(6, ' ');
}
