/**
 * Strip ANSI escape codes from a string
 * @param str string to evaluate
 * @returns string without ANSI codes
 */
export const stripAnsi = (str: string): string => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
};

/**
 * Check if a Unicode character is wide (takes 2 columns in terminal)
 * This covers CJK characters, emojis, and other wide symbols
 */
export function isWideCharacter(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0x9fff) || // CJK
    (code >= 0xac00 && code <= 0xd7af) || // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility
    (code >= 0xfe30 && code <= 0xfe4f) || // CJK Compatibility Forms
    (code >= 0x1f000 && code <= 0x1f9ff) || // Emoji and symbols
    (code >= 0x20000 && code <= 0x2fffd) || // CJK Extension B-F
    (code >= 0x30000 && code <= 0x3fffd) // CJK Extension G
  );
}

/**
 * Get the visible width of a string (ANSI stripped, accounting for wide characters)
 * @param str string to measure
 * @returns visible width in terminal columns
 */
export function getStringWidth(str: string): number {
  const clean = stripAnsi(str);
  let width = 0;

  for (const char of clean) {
    const code = char.codePointAt(0) || 0;
    width += isWideCharacter(code) ? 2 : 1;
  }

  return width;
}
