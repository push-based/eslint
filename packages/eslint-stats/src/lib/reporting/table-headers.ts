export function getFirstColumnHeader(
  groupBy: 'rule' | 'file' | 'file-rule'
): string {
  if (groupBy === 'rule') {
    return 'Rule';
  }
  if (groupBy === 'file') {
    return 'File';
  }
  return 'File / Rule';
}

export function getTableHeaders(firstColumn: string): string[] {
  return [firstColumn, 'Time', '%', `🚨 Errors`, `⚠️ Warnings`];
}
