import ansis from 'ansis';

export const colors = {
  blue: ansis.blue,
  yellow: ansis.yellow,
  magenta: ansis.magenta,
  red: ansis.red,
  dim: ansis.dim,
  bold: ansis.bold,
};

/**
 * Applies terminal colors to formatted display entries for better readability.
 * @param entries - The array of entries to format.
 * @param stats - The processed ESLint rules statistics.
 * @returns A new array of entries with color-formatted strings.

export function terminalFormat(
  entries: (ProcessedFileResult | ProcessedRuleResult)[],
  stats: ProcessedEslintRulesStats
): (ProcessedFileResult | ProcessedRuleResult)[] {
  const { totalTimeMs, totalErrors, totalWarnings } = stats;

  function formatRecursive(
    currentEntries: (ProcessedFileResult | ProcessedRuleResult)[]
  ): (StringifiedProcessedFileResult | StringifiedProcessedRuleResult)[] {
    return currentEntries.map((entry) => {
      const isFile = isFileResult(entry);

      // Get the correct properties based on entry type
      const errors = isFile ? entry.errors : entry.errors;
      const warnings = isFile ? entry.warnings : entry.warnings;
      const identifier = isFile ? entry.filePath : entry.ruleId;
      const timeMs = isFile ? entry.totalMs : entry.totalMs;
      const rawTimeMs = timeMs; // Use the same value since we don't have separate raw time

      const hasErrors = errors !== 0;
      const hasWarnings = warnings !== 0;
      const hasViolations = hasErrors || hasWarnings;

      // Dim the identifier if it has no violations, otherwise color it blue.
      const coloredIdentifier = hasViolations
        ? colors.blue(identifier)
        : colors.dim.blue(identifier);

      const timeRatio = totalTimeMs > 0 ? rawTimeMs / totalTimeMs : 0;
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

      const errorRatio = totalErrors > 0 ? errors / totalErrors : 0;
      const errorColor = errorRatio < 0.1 ? colors.dim.red : colors.red;

      const warningRatio = totalWarnings > 0 ? warnings / totalWarnings : 0;
      const warningColor = warningRatio < 0.1 ? ansis.dim.yellow : ansis.yellow;

      // Format duration
      const formattedTime =
        timeMs < 1000
          ? `${timeMs.toFixed(2)} ms`
          : `${(timeMs / 1000).toFixed(2)} s`;

      // Format error and warning counts with icons
     const fixable = isFile
        ? entry.fixableErrors > 0 || entry.fixableWarnings > 0
        : entry.fixable;
      const fixableIcon = fixable ? ' 🔧' : '';

      const formattedErrors = hasErrors ? `${errors}` : '0';
      const formattedWarnings = hasWarnings ? `${warnings}` : '0';

      const coloredErrors = hasErrors
        ? errorColor(formattedErrors)
        : formattedErrors;

      const coloredWarnings = hasWarnings
        ? warningColor(formattedWarnings)
        : formattedWarnings;

      // Handle children/rules recursively
      const children =
        isFile && entry.rules && entry.rules.length > 0
          ? formatRecursive(entry.rules)
          : undefined;

      if (isFile) {
        return {
          filePath: coloredIdentifier,
          parseMs: '0 ms', // Default since not available
          rulesMs: '0 ms', // Default since not available
          fixMs: '0 ms', // Default since not available
          totalMs: timeColor(formattedTime),
          totalErrors: coloredErrors,
          totalWarnings: coloredWarnings,
          fixableErrors: '0', // Default since not tracked separately
          fixableWarnings: '0', // Default since not tracked separately
          rules: children,
        };
      } else {
        return }
          ruleId: coloredIdentifier,
          timeMs: timeColor(formattedTime),
          errors: coloredErrors,
          warnings: coloredWarnngs,
          fixable: fixable.toString(),
        }
      }
    };

  return formatRecursive(entries);
}
*/
