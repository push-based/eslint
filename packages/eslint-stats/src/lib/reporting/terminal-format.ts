import { FormattedDisplayEntry } from './format';

import ansis from 'ansis';

export const colors = {
  blue: ansis.blue,
  yellow: ansis.yellow,
  magenta: ansis.magenta,
  red: ansis.red,
  dim: ansis.dim,
  bold: ansis.bold,
};

function getTotals(entries: FormattedDisplayEntry[]): {
  totalTime: number;
  maxTime: number;
  totalErrorCount: number;
  totalWarningCount: number;
} {
  let totalTime = 0;
  let maxTime = 0;
  let totalErrorCount = 0;
  let totalWarningCount = 0;

  function recurse(currentEntries: FormattedDisplayEntry[]) {
    for (const entry of currentEntries) {
      totalTime += entry.rawTimeMs;
      if (entry.rawTimeMs > maxTime) {
        maxTime = entry.rawTimeMs;
      }
      if (entry.errorCount) {
        totalErrorCount += parseInt(entry.errorCount, 10) || 0;
      }
      if (entry.warningCount) {
        totalWarningCount += parseInt(entry.warningCount, 10) || 0;
      }
      if (entry.children) {
        recurse(entry.children);
      }
    }
  }
  recurse(entries);
  return { totalTime, maxTime, totalErrorCount, totalWarningCount };
}

/**
 * Applies terminal colors to formatted display entries for better readability.
 * @param {FormattedDisplayEntry[]} entries - The array of entries to format.
 * @returns {FormattedDisplayEntry[]} A new array of entries with color-formatted strings.
 */
export function terminalFormat(
  entries: FormattedDisplayEntry[]
): FormattedDisplayEntry[] {
  const { maxTime, totalErrorCount, totalWarningCount } = getTotals(entries);

  function formatRecursive(
    currentEntries: FormattedDisplayEntry[]
  ): FormattedDisplayEntry[] {
    return currentEntries.map((entry) => {
      const { errorCount, warningCount } = entry;
      const hasErrors = errorCount !== '' && errorCount !== '0';
      const hasWarnings = warningCount !== '' && warningCount !== '0';
      const hasViolations = hasErrors || hasWarnings;

      // Dim the identifier if it has no violations, otherwise color it blue.
      const identifier = hasViolations
        ? colors.blue(entry.identifier)
        : colors.dim.blue(entry.identifier);

      const timeRatio = maxTime > 0 ? entry.rawTimeMs / maxTime : 0;
      let timeColor;

      if (timeRatio > 0.5) {
        timeColor = ansis.bold.hex('#FFFFFF'); // Bold, White
      } else if (timeRatio > 0.1) {
        timeColor = ansis.hex('#CCCCCC'); // Bright Gray
      } else if (timeRatio > 0.01) {
        timeColor = ansis.hex('#999999'); // Medium Gray
      } else if (timeRatio > 0) {
        timeColor = ansis.dim.hex('#999999'); // Dim, Medium Gray
      } else {
        timeColor = ansis.dim.hex('#666666'); // Dim, Dark Gray
      }

      const errorNum = parseInt(entry.errorCount, 10) || 0;
      const errorRatio = totalErrorCount > 0 ? errorNum / totalErrorCount : 0;
      const errorColor = errorRatio < 0.1 ? colors.dim.red : colors.red;

      const warningNum = parseInt(entry.warningCount, 10) || 0;
      const warningRatio =
        totalWarningCount > 0 ? warningNum / totalWarningCount : 0;
      const warningColor = warningRatio < 0.1 ? ansis.dim.yellow : ansis.yellow;

      return {
        ...entry,
        identifier,
        // Color-code time based on its value
        timeMs: timeColor(entry.timeMs),
        // Color-code relative percentage
        relativePercent: timeColor(entry.relativePercent),
        // Color-code error and warning counts
        errorCount: (() => {
          if (!hasErrors) return entry.errorCount;
          const [num, ...rest] = entry.errorCount.split(/(?=\s)/);
          return `${errorColor(num)}%%SEP%%${errorColor(rest.join(''))}`;
        })(),
        warningCount: (() => {
          if (!hasWarnings) return entry.warningCount;
          const [num, ...rest] = entry.warningCount.split(/(?=\s)/);
          return `${warningColor(num)}%%SEP%%${warningColor(rest.join(''))}`;
        })(),
        children: entry.children ? formatRecursive(entry.children) : undefined,
      };
    });
  }
  return formatRecursive(entries);
}
