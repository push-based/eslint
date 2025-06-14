import ansis from 'ansis';

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
const ALIGN: ((str: string, len: number, ch?: string) => string)[] = [
  alignLeft,
  alignRight,
  alignRight,
  alignRight,
  alignRight,
];

export function renderTable(
  displayRows: string[][],
  options: {
    headers: string[];
    borderColor?: (str: string) => string;
    width?: number[];
  }
): string {
  const { headers, borderColor = ansis.dim.gray, width } = options;

  if (displayRows.length === 0) {
    return 'No data to display.';
  }

  displayRows.unshift(headers);

  const widths: number[] = [];
  let violationsNumWidth = 0;
  let violationsIconWidth = 0;

  displayRows.forEach((row) => {
    row.forEach((cell, i) => {
      const cleanCell = cell.replace(/%%SEP%%/g, '');
      const cellLength = stripAnsi(cleanCell).length;

      // Use provided width if available, otherwise calculate from content
      if (width && width[i] !== undefined) {
        widths[i] = width[i];
      } else if (!widths[i] || cellLength > widths[i]) {
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

  // Helper function to apply border color
  const applyBorderColor = (text: string): string => {
    return borderColor ? borderColor(text) : text;
  };

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
        const padding = Math.max(0, width - lenForAlign);

        if (cellToAlign.length > lenForAlign) {
          // has ANSI
          if (alignFn === alignRight) {
            return ' '.repeat(padding) + cellToAlign;
          }
          return cellToAlign + ' '.repeat(padding);
        }
        return alignFn(cellToAlign, width);
      })
      .join(applyBorderColor(' | '));
  });

  if (displayRows.length > 1) {
    // If there's more than just HEADERS
    const separatorLine = widths
      .map((width, index) => {
        const separatorCharPadding =
          index === 0 || index === widths.length - 1 ? 1 : 2;
        const separator = ALIGN[index](
          ':',
          widths[index] + separatorCharPadding,
          '-'
        );
        return applyBorderColor(separator);
      })
      .join(applyBorderColor('|'));
    tableLines.splice(1, 0, separatorLine);
  }

  return tableLines.join('\n');
}
