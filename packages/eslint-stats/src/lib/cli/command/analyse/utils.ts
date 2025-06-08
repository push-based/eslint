export function reprintSection(newTexts: string[]): void {
  const output = newTexts.join('\n');
  process.stdout.write('\u001B[2J\u001B[0;0H' + output + '\u001B[0;0H');
}
