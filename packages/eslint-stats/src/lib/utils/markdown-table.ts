import ansis from 'ansis';
import { getStringWidth } from './string-width';
import { max } from 'd3-array';

type Opts = {
  headers: string[];
  borderColor?: (s: string) => string;
  width?: number[];
  maxWidth?: number; // Maximum width for any column
};

// regex that matches either an ANSI escape or a single code unit
// eslint-disable-next-line no-control-regex
const ANSI_OR_CHAR = /\u001b\[[0-9;]*m|[\s\S]/g;

/** truncate a raw ANSI-string to at most maxWidth visible chars, preserving escapes */
function truncateAnsi(raw: string, maxWidth: number): string {
  if (getStringWidth(raw) <= maxWidth) return raw;

  let visible = 0;
  let out = '';
  let match;

  while ((match = ANSI_OR_CHAR.exec(raw)) !== null) {
    const tok = match[0];
    if (tok.startsWith('\u001b[')) {
      // copy ANSI
      out += tok;
    } else {
      if (visible < maxWidth - 1) {
        out += tok;
        visible++;
      } else if (visible === maxWidth - 1) {
        out += '…';
        break;
      }
    }
  }

  // Reset the regex
  ANSI_OR_CHAR.lastIndex = 0;
  return out;
}

/** pad the raw ANSI string to width (visible spaces) */
function alignCell(raw: string, width: number, dir: 'left' | 'right'): string {
  const len = getStringWidth(raw);
  const pad = Math.max(0, width - len);
  const spaces = ' '.repeat(pad);
  return dir === 'right' ? spaces + raw : raw + spaces;
}

/** recompute every column's width from the raw grid */
function computeWidths(
  grid: string[][],
  forced?: number[],
  maxWidth?: number
): number[] {
  const cols = grid[0].length;
  return Array.from({ length: cols }, (_, c) => {
    if (forced?.[c] != null) return forced[c] ?? 0;
    const nat = max(grid.map((row) => getStringWidth(row[c]))) ?? 0;
    return maxWidth != null ? Math.min(nat, maxWidth) : nat;
  });
}

/**
 * Render a markdown table for the terminal.
 */
export function renderTable(
  rows: string[][],
  { headers, borderColor = ansis.dim.gray, width: forced, maxWidth }: Opts
): string {
  if (!rows.length) return 'No data to display.';

  const grid = [headers, ...rows];
  const widths = computeWidths(grid, forced, maxWidth);
  const sep = borderColor(' | ');
  const pipeBorder = borderColor('|');

  const makeLine = (row: string[], isHeader: boolean) =>
    pipeBorder +
    ' ' +
    row
      .map((cell, ci) => {
        let txt = cell;
        if (maxWidth != null) txt = truncateAnsi(cell, widths[ci]);
        const dir: 'left' | 'right' = isHeader || ci === 0 ? 'left' : 'right';
        return alignCell(txt, widths[ci], dir);
      })
      .join(sep) +
    ' ' +
    pipeBorder;

  const headerLine = makeLine(headers, true);
  const separator = borderColor(
    '|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|'
  );
  const dataLines = rows.map((r) => makeLine(r, false));

  return [headerLine, separator, ...dataLines].join('\n');
}

// Keep these for backward compatibility if needed elsewhere
export function alignLeft(str: string, len: number, ch?: string): string {
  return str + new Array(len - str.length + 1).join(ch || ' ');
}

export function alignRight(str: string, len: number, ch?: string): string {
  return new Array(len - str.length + 1).join(ch || ' ') + str;
}
