import { FormattedDisplayEntry } from './format';

/**
 * Flattens an array of FormattedDisplayEntry objects (including children) into a 2D string array for table rendering,
 * applying indentation to represent hierarchy.
 * @param {FormattedDisplayEntry[]} entries - The array of entries to flatten.
 * @param {number} [indentLevel=0] - The current level of indentation.
 * @param {string} [indentPrefix='  '] - The string to use for one level of indentation.
 * @returns {string[][]} A 2D array of strings, where each inner array is [indentedIdentifier, timeMsStr, relativePercentStr].
 */
export function flattenFormattedEntriesToRows(
  entries: FormattedDisplayEntry[],
  indentLevel = 0,
  indentPrefix = '  '
): string[][] {
  const rows: string[][] = [];
  for (const entry of entries) {
    const prefix = indentPrefix.repeat(indentLevel);
    rows.push([
      `${prefix}${entry.identifier}`,
      entry.timeMs,
      entry.relativePercent,
      entry.errorCount,
      entry.warningCount,
    ]);
    if (entry.children && entry.children.length > 0) {
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

/**
 * Align the string to left
 * @param {string} str string to evaluate
 * @param {number} len length of the string
 * @param {string} ch delimiter character
 * @returns {string} modified string
 * @private
 */
export function alignLeft(str: string, len: number, ch?: string): string {
  return str + new Array(len - str.length + 1).join(ch || ' ');
}

/**
 * Align the string to right
 * @param {string} str string to evaluate
 * @param {number} len length of the string
 * @param {string} ch delimiter character
 * @returns {string} modified string
 * @private
 */
export function alignRight(str: string, len: number, ch?: string): string {
  return new Array(len - str.length + 1).join(ch || ' ') + str;
}

const stripAnsi = (str: string) => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
};

const defaultHeaders = ['Rule', 'Time (ms)', '%', 'Warnings', 'Errors']; // Added '%'
const ALIGN: ((str: string, len: number, ch?: string) => string)[] = [
  alignLeft,
  alignRight,
  alignRight,
  alignRight,
  alignRight,
]; // Added alignRight for '%'

/**
 * display the data
 * @param {FormattedDisplayEntry[]} data Array of pre-formatted display entries.
 * @returns {void} prints modified string with console.log
 * @private
 */
export function display(
  data: FormattedDisplayEntry[],
  headers: string[] = defaultHeaders
): void {
  // Data is assumed to be pre-sorted and pre-sliced if necessary by the caller.
  // The flattenFormattedEntriesToRows function will handle hierarchy.
  const displayRows: string[][] = flattenFormattedEntriesToRows(data);

  if (displayRows.length === 0) {
    // Handle case with no data to display after flattening (e.g. empty input array)
    // Optionally, print just headers or a specific message.
    // For now, we can let it proceed, which might print only headers if HEADERS is unshifted later.
    // Or, handle it explicitly:
    if (data.length === 0) {
      // Check original data length, as flatten may return empty for non-empty input if structure is odd
      console.log('No data to display.');
      return;
    }
  }

  displayRows.unshift(headers);

  const widths: number[] = [];
  displayRows.forEach((row) => {
    row.forEach((cell, i) => {
      const cellLength = cell.length;
      if (!widths[i] || cellLength > widths[i]) {
        widths[i] = cellLength;
      }
    });
  });

  const tableLines: string[] = displayRows.map((row) =>
    row.map((cell, index) => ALIGN[index](cell, widths[index])).join(' | ')
  );

  if (displayRows.length > 1) {
    // If there's more than just HEADERS
    const separatorLine = widths
      .map((width, index) => {
        const separatorCharPadding =
          index === 0 || index === widths.length - 1 ? 1 : 2;
        return ALIGN[index](':', widths[index] + separatorCharPadding, '-');
      })
      .join('|');
    tableLines.splice(1, 0, separatorLine);
  }

  console.log(tableLines.join('\n'));
}

export function renderTable(
  data: FormattedDisplayEntry[],
  options: {
    headers?: string[];
  }
): string {
  const { headers = defaultHeaders } = options;
  // Data is assumed to be pre-sorted and pre-sliced if necessary by the caller.
  // The flattenFormattedEntriesToRows function will handle hierarchy.
  const displayRows: string[][] = flattenFormattedEntriesToRows(data);

  if (displayRows.length === 0) {
    if (data.length === 0) {
      return 'No data to display.';
    }
  }

  displayRows.unshift(headers);

  const widths: number[] = [];
  let violationsNumWidth = 0;
  let violationsIconWidth = 0;

  displayRows.forEach((row) => {
    row.forEach((cell, i) => {
      const cleanCell = cell.replace(/%%SEP%%/g, '');
      const cellLength = stripAnsi(cleanCell).length;
      if (!widths[i] || cellLength > widths[i]) {
        widths[i] = cellLength;
      }
      if (i === 3 || i === 4) {
        const parts = stripAnsi(cell).split('%%SEP%%');
        const numPart = parts[0].match(/\d+/) ? parts[0] : '';
        const iconPart = stripAnsi(parts[1] || '');
        if (numPart.length > violationsNumWidth) {
          violationsNumWidth = numPart.length;
        }
        if (iconPart.length > violationsIconWidth) {
          violationsIconWidth = iconPart.length;
        }
      }
    });
  });

  const tableLines: string[] = displayRows.map((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    return row
      .map((cell, index) => {
        const alignFn = ALIGN[index] || alignLeft;

        // Special handling for numeric columns to align numbers and icons
        if (
          !isHeader &&
          (index === 3 || index === 4) &&
          (violationsNumWidth > 0 || violationsIconWidth > 0)
        ) {
          const parts = cell.split('%%SEP%%');
          const coloredNum = parts[0];
          const icons = parts[1] || '';

          const strippedNum = stripAnsi(coloredNum);
          const numValue = strippedNum.match(/\d+/) ? strippedNum : '';

          const numPadding = ' '.repeat(violationsNumWidth - numValue.length);
          const paddedNum = numPadding + coloredNum;

          const strippedIcons = stripAnsi(icons);
          const iconPadding = ' '.repeat(
            violationsIconWidth - strippedIcons.length
          );
          const paddedIcons = icons + iconPadding;

          const content = paddedNum + paddedIcons;
          const strippedContent = stripAnsi(content);
          const padding = widths[index] - strippedContent.length;

          if (padding > 0) {
            if (alignFn === alignRight) {
              return ' '.repeat(padding) + content;
            }
            return content + ' '.repeat(padding);
          }
          return content;
        }

        const cellToAlign = cell.replace(/%%SEP%%/g, '');
        const strippedForAlign = stripAnsi(cellToAlign);
        const lenForAlign = strippedForAlign.length;
        const width = widths[index];
        const padding = width - lenForAlign;

        if (cellToAlign.length > lenForAlign) {
          // has ANSI
          if (alignFn === alignRight) {
            return ' '.repeat(padding) + cellToAlign;
          }
          return cellToAlign + ' '.repeat(padding);
        }
        return alignFn(cellToAlign, width);
      })
      .join(' | ');
  });

  if (displayRows.length > 1) {
    // If there's more than just HEADERS
    const separatorLine = widths
      .map((width, index) => {
        const separatorCharPadding =
          index === 0 || index === widths.length - 1 ? 1 : 2;
        return ALIGN[index](':', widths[index] + separatorCharPadding, '-');
      })
      .join('|');
    tableLines.splice(1, 0, separatorLine);
  }

  return tableLines.join('\n');
}
