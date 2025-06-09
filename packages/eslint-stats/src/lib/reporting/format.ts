import {
  ProcessedFileResult,
  ProcessedRuleResult,
  RuleViolations,
} from '../parse/processed-eslint-result.types';
import { ProcessedEslintResultTotals } from '../parse/totals';
import { alignRight } from './render-table';
import ansis from 'ansis';

// Make all primitive values strings
// do not turn arrays into strings
export type Stringify<T> = {
  [K in keyof T]: T[K] extends (infer U)[]
    ? T[K]
    : T[K] extends object
    ? T[K]
    : string;
};

// String versions of the input types
export type StringifiedProcessedFileResult = Stringify<ProcessedFileResult>;
export type StringifiedProcessedRuleResult = Stringify<ProcessedRuleResult>;

export type FormattedDisplayEntry = {
  identifier: string;
  timeMs: string;
  rawTimeMs: number;
  relativePercent: string;
  warningCount: string;
  errorCount: string;
  fixable: boolean;
  manuallyFixable: boolean;
  children?: FormattedDisplayEntry[];
};

// Color utilities
export const colors = {
  blue: ansis.blue,
  yellow: ansis.yellow,
  gray: ansis.blue,
  magenta: ansis.magenta,
  red: ansis.red,
  dim: ansis.dim,
  bold: ansis.bold,
};

function getTimeColor(timeRatio: number) {
  if (timeRatio > 0.5) {
    return ansis.bold.blue; // Bold blue for high usage
  } else if (timeRatio > 0.1) {
    return ansis.blue; // Standard blue for medium-high
  } else if (timeRatio > 0.01) {
    return ansis.blue; // Standard blue for medium
  } else if (timeRatio > 0) {
    return ansis.dim.blue; // Dim blue for low usage
  } else {
    return ansis.dim.gray; // Dim gray for zero values
  }
}

function findCommonBasePath(paths: string[]): string {
  if (!paths || paths.length <= 1) {
    return '';
  }
  const sortedPaths = [...paths].sort();
  const firstPath = sortedPaths[0];
  const lastPath = sortedPaths[sortedPaths.length - 1];
  let i = 0;
  while (
    i < firstPath.length &&
    i < lastPath.length &&
    firstPath[i] === lastPath[i]
  ) {
    i++;
  }
  const common = firstPath.substring(0, i);
  const lastSlash = common.lastIndexOf('/');
  if (lastSlash > -1) {
    // Includes the slash
    return common.substring(0, lastSlash + 1);
  }
  return '';
}

export function shortenPath(
  fullPath: string,
  commonBasePath: string,
  maxLength = 50
): string {
  const path = fullPath.startsWith(commonBasePath)
    ? fullPath.substring(commonBasePath.length)
    : fullPath;

  if (path.length <= maxLength) {
    return path;
  }

  const separator = '/';
  const parts = path.split(separator);
  if (parts.length === 1) {
    // It's just a long filename, so truncate it
    return '...' + path.slice(path.length - maxLength + 3);
  }

  const fileName = parts.pop() || '';

  if (fileName.length >= maxLength) {
    return '...' + fileName.slice(fileName.length - maxLength + 3);
  }

  let shortPath = fileName;

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (shortPath.length + part.length + 2 > maxLength) {
      // +2 for '/...'
      shortPath = '...' + separator + shortPath;
      return shortPath;
    }
    shortPath = part + separator + shortPath;
  }

  return shortPath;
}

export function createIdentifierFormatter(
  processedEntries: (ProcessedFileResult | ProcessedRuleResult)[]
) {
  const fileIdentifiers: string[] = [];

  const isFileIdentifier = (identifier: string): boolean =>
    identifier.includes('/') && identifier.includes('.');

  function collectFileIdentifiers(
    entries: (ProcessedFileResult | ProcessedRuleResult)[]
  ) {
    for (const entry of entries) {
      const identifier = 'filePath' in entry ? entry.filePath : entry.ruleId;
      if (isFileIdentifier(identifier)) {
        fileIdentifiers.push(identifier);
      }
      if ('rules' in entry && entry.rules) {
        collectFileIdentifiers(entry.rules);
      }
    }
  }

  collectFileIdentifiers(processedEntries);
  const commonBasePath = findCommonBasePath(fileIdentifiers);

  return (entry: ProcessedFileResult | ProcessedRuleResult): string => {
    const identifier = 'filePath' in entry ? entry.filePath : entry.ruleId;
    const isFileLike = isFileIdentifier(identifier) || 'rules' in entry;

    if (isFileLike) {
      return shortenPath(identifier, commonBasePath);
    }
    return identifier;
  };
}

export function formatDuration(duration: number, granularity = 2): string {
  if (duration < 1000) {
    return `${duration.toFixed(granularity)} ms`;
  }
  return `${(duration / 1000).toFixed(2)} s`;
}

export function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}

function isFileResult(
  entry: ProcessedFileResult | ProcessedRuleResult
): entry is ProcessedFileResult {
  return 'filePath' in entry;
}

export type NormalizedResult = Stringify<Omit<RuleViolations, 'fixable'>> & {
  identifier: string;
  type: 'file' | 'rule';
  ms: string;
  relativePercent: string;
  children?: NormalizedResult[];
};

export function formatProcessedResultsForDisplay(
  processedEntries: (ProcessedFileResult | ProcessedRuleResult)[],
  stats?: ProcessedEslintResultTotals,
  useColors = true
): NormalizedResult[] {
  // Calculate the maximum time width for alignment only if stats are provided
  let maxTimeWidth = 0;
  let maxTime = 0;

  if (stats) {
    const maxTimeMs = Math.max(
      stats.totalTimeMs,
      ...processedEntries.map((entry) => entry.totalMs),
      ...processedEntries.flatMap((entry) =>
        'rules' in entry && entry.rules
          ? entry.rules.map((rule) => rule.totalMs)
          : []
      )
    );
    const maxTimeString = formatDuration(maxTimeMs);
    maxTimeWidth = maxTimeString.length;

    // Use the overall maximum time for color scaling
    maxTime = Math.max(
      ...processedEntries.map((entry) => entry.totalMs),
      ...processedEntries.flatMap((entry) =>
        'rules' in entry && entry.rules
          ? entry.rules.map((rule) => rule.totalMs)
          : []
      )
    );
  }

  function applyColors(text: string, colorFn: (str: string) => string): string {
    return useColors ? colorFn(text) : text;
  }

  function formatEntryRecursive(
    entry: ProcessedFileResult | ProcessedRuleResult
  ): NormalizedResult {
    const isFile = isFileResult(entry);

    if (isFile) {
      const commonBasePath = findCommonBasePath(
        processedEntries.filter(isFileResult).map((entry) => entry.filePath)
      );
      const timeString = formatDuration(entry.totalMs);
      const alignedTimeString =
        stats && maxTimeWidth > 0
          ? alignRight(timeString, maxTimeWidth)
          : timeString;

      // Color logic for files
      const hasErrors = entry.totalErrors > 0;
      const hasWarnings = entry.totalWarnings > 0;
      const hasViolations = hasErrors || hasWarnings;

      const identifier = shortenPath(entry.filePath, commonBasePath);
      const coloredIdentifier = hasViolations
        ? applyColors(identifier, colors.blue)
        : applyColors(identifier, colors.dim.blue);

      // Time coloring based on overall max time
      const timeRatio = maxTime > 0 ? entry.totalMs / maxTime : 0;
      const timeColor = getTimeColor(timeRatio);
      const coloredTime = applyColors(alignedTimeString, timeColor);

      // Error and warning coloring
      const errorRatio =
        stats && stats.totalErrors > 0
          ? entry.totalErrors / stats.totalErrors
          : 0;
      const errorColor = errorRatio < 0.1 ? colors.dim.red : colors.red;
      const coloredErrors = hasErrors
        ? applyColors(entry.totalErrors.toString(), errorColor)
        : applyColors(entry.totalErrors.toString(), colors.dim.red);

      const warningRatio =
        stats && stats.totalWarnings > 0
          ? entry.totalWarnings / stats.totalWarnings
          : 0;
      const warningColor =
        warningRatio < 0.1 ? colors.dim.yellow : colors.yellow;
      const coloredWarnings = hasWarnings
        ? applyColors(entry.totalWarnings.toString(), warningColor)
        : applyColors(entry.totalWarnings.toString(), colors.dim.yellow);

      const normalizedFile: NormalizedResult = {
        identifier: coloredIdentifier,
        type: 'file',
        ms: `${sparkline([entry.parseMs, entry.rulesMs, entry.fixMs], {
          max: entry.totalMs,
          colors: useColors
            ? [
                (tick) => colors.dim.blue(tick),
                (tick) => ansis.cyan(tick),
                (tick) => ansis.hex('#CCCCCC')(tick),
              ]
            : undefined,
        })}${coloredTime}`,
        errors: coloredErrors,
        warnings: coloredWarnings,
        relativePercent:
          stats && stats.totalTimeMs > 0
            ? applyColors(
                formatPercentage((entry.totalMs / stats.totalTimeMs) * 100),
                timeColor
              )
            : 'N/A',
      };

      if (entry.rules && entry.rules.length > 0) {
        normalizedFile.children = entry.rules.map((rule) => {
          const ruleTimeString = formatDuration(rule.totalMs);
          const alignedRuleTimeString =
            stats && maxTimeWidth > 0
              ? alignRight(ruleTimeString, maxTimeWidth)
              : ruleTimeString;

          // Rule coloring based on overall max time
          const ruleHasErrors = rule.errors > 0;
          const ruleHasWarnings = rule.warnings > 0;
          const ruleHasViolations = ruleHasErrors || ruleHasWarnings;

          const coloredRuleId = ruleHasViolations
            ? applyColors(rule.ruleId, colors.blue)
            : applyColors(rule.ruleId, colors.dim.blue);

          const ruleTimeRatio = maxTime > 0 ? rule.totalMs / maxTime : 0;
          const ruleTimeColor = getTimeColor(ruleTimeRatio);
          const coloredRuleTime = applyColors(
            alignedRuleTimeString,
            ruleTimeColor
          );

          const ruleErrorRatio =
            stats && stats.totalErrors > 0
              ? rule.errors / stats.totalErrors
              : 0;
          const ruleErrorColor =
            ruleErrorRatio < 0.1 ? colors.dim.red : colors.red;
          const coloredRuleErrors = ruleHasErrors
            ? applyColors(rule.errors.toString(), ruleErrorColor)
            : applyColors(rule.errors.toString(), colors.dim.red);

          const ruleWarningRatio =
            stats && stats.totalWarnings > 0
              ? rule.warnings / stats.totalWarnings
              : 0;
          const ruleWarningColor =
            ruleWarningRatio < 0.1 ? colors.dim.yellow : colors.yellow;
          const coloredRuleWarnings = ruleHasWarnings
            ? applyColors(rule.warnings.toString(), ruleWarningColor)
            : applyColors(rule.warnings.toString(), colors.dim.yellow);

          return {
            identifier: coloredRuleId,
            type: 'rule',
            ms: coloredRuleTime,
            errors: coloredRuleErrors,
            warnings: coloredRuleWarnings,
            relativePercent:
              stats && stats.totalTimeMs > 0
                ? applyColors(
                    formatPercentage((rule.totalMs / stats.totalTimeMs) * 100),
                    ruleTimeColor
                  )
                : 'N/A',
          };
        });
      }

      return normalizedFile;
    } else {
      const timeString = formatDuration(entry.totalMs);
      const alignedTimeString =
        stats && maxTimeWidth > 0
          ? alignRight(timeString, maxTimeWidth)
          : timeString;

      // Rule coloring (for top-level rules) based on overall max time
      const hasErrors = entry.errors > 0;
      const hasWarnings = entry.warnings > 0;
      const hasViolations = hasErrors || hasWarnings;

      const coloredRuleId = hasViolations
        ? applyColors(entry.ruleId, colors.blue)
        : applyColors(entry.ruleId, colors.dim.blue);

      const timeRatio = maxTime > 0 ? entry.totalMs / maxTime : 0;
      const timeColor = getTimeColor(timeRatio);
      const coloredTime = applyColors(alignedTimeString, timeColor);

      const errorRatio =
        stats && stats.totalErrors > 0 ? entry.errors / stats.totalErrors : 0;
      const errorColor = errorRatio < 0.1 ? colors.dim.red : colors.red;
      const coloredErrors = hasErrors
        ? applyColors(entry.errors.toString(), errorColor)
        : applyColors(entry.errors.toString(), colors.dim.red);

      const warningRatio =
        stats && stats.totalWarnings > 0
          ? entry.warnings / stats.totalWarnings
          : 0;
      const warningColor =
        warningRatio < 0.1 ? colors.dim.yellow : colors.yellow;
      const coloredWarnings = hasWarnings
        ? applyColors(entry.warnings.toString(), warningColor)
        : applyColors(entry.warnings.toString(), colors.dim.yellow);

      return {
        identifier: coloredRuleId,
        type: 'rule',
        ms: coloredTime,
        errors: coloredErrors,
        warnings: coloredWarnings,
        relativePercent:
          stats && stats.totalTimeMs > 0
            ? applyColors(
                formatPercentage((entry.totalMs / stats.totalTimeMs) * 100),
                timeColor
              )
            : 'N/A',
      };
    }
  }

  return processedEntries.map(formatEntryRecursive);
}

/**
 * Generates a sparkline from an array of numbers.
 * Inspired by https://github.com/holman/spark
 *
 * Example:
 *   sparkline([1, 5, 22, 13, 53]) => '▁▁▃▂█'
 */
const ticks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function sparkline(
  data: number[],
  options: {
    min?: number;
    max?: number;
    colors?: ((str: string) => string)[];
  } = {}
): string {
  if (!data.length) return '';

  const { min = Math.min(...data), max = Math.max(...data), colors } = options;

  // If all values are equal, return mid-high ticks
  const tickSet = min === max ? ['▅', '▆'] : ticks;

  const scale = max - min || 1;
  const steps = tickSet.length - 1;

  return data
    .map((n, dataIndex) => {
      const index = Math.floor(((n - min) / scale) * steps);
      const tick = tickSet[index];

      if (colors && colors.length > 0) {
        const colorIndex = Math.min(dataIndex, colors.length - 1);
        const colorFn = colors[colorIndex];
        return colorFn(tick);
      }

      return tick;
    })
    .join('');
}
