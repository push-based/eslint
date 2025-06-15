import path from 'path';
import theme from './theme';
import { StatsRow } from './stats-hierarchy';
import { asciiSparkline } from '../utils/ascii-sparkline';

/**
 * Formats a file path with colored directory and filename
 * @param filePath The full file path to format
 * @returns Formatted string with gray directory and green filename
 */
export function formatFilePath(filePath: string): string {
  const relativePath = path.relative(process.cwd(), filePath);
  const dirname = path.dirname(relativePath);
  const basename = path.basename(relativePath);

  const maxDirLength = 20;
  let truncatedDir = dirname;

  if (dirname.length > maxDirLength) {
    const segments = dirname.split(path.sep);
    if (segments.length > 1) {
      truncatedDir = '...' + path.sep + segments[segments.length - 1];
    } else {
      truncatedDir = '...' + dirname.slice(-maxDirLength);
    }
  }

  return dirname === '.'
    ? theme.text.file(basename)
    : `${theme.text.dim(truncatedDir)}${path.sep}${theme.text.file(basename)}`;
}

/**
 * Formats a rule ID with colored stats
 * @param ruleId The rule ID to format
 * @returns Formatted string with colored rule ID and stats
 */
export function formatRuleId(ruleId: string): string {
  if (!ruleId.includes('/')) {
    return theme.text.rule(ruleId);
  }
  const [plugin, rule] = ruleId.split('/');
  return `${theme.text.dim(plugin + '/')}${theme.text.rule(rule)}`;
}

// Use the shared theme formatters directly
export const formatTimeColored = theme.fmt.timeFmt;
export const formatPercentageColored = theme.fmt.pctFmt;
export const formatErrorCount = theme.fmt.errFmt;
export const formatWarningCount = theme.fmt.warnFmt;

export function sparklineForFile(e: StatsRow): string | undefined {
  if (e.depth !== 0) return undefined;
  const { rulesTime, fixTime, totalTime, parseTime } = e;
  const otherTime = Math.max(0, totalTime - rulesTime - fixTime - parseTime);

  const timesMs = [
    Math.round(parseTime * 1000),
    Math.round(rulesTime * 1000),
    Math.round(fixTime * 1000),
    Math.round(otherTime * 1000),
  ];

  const sparkline = asciiSparkline(timesMs, {
    min: 0,
    max: Math.round(totalTime * 1000),
    colors: [
      (s: string) => theme.text.file(s), // Parse time (file processing) - use file color
      (s: string) => theme.text.rule(s), // Rules time (rule execution) - use rule color
      (s: string) => theme.text.dim(s), // Fix time (applying fixes) - use dim color (no direct error color in theme.text)
      (s: string) => theme.text.dim(s), // Other time (misc operations) - use dim color
    ],
  });

  // Pad sparkline to ensure consistent alignment - sparkline is 4 chars, pad to 6 total width
  return sparkline.padEnd(6, ' ');
}
