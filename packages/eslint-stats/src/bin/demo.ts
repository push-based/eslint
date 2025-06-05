/**
 * @fileoverview Script to read ESLint performance statistics from a JSON file,
 * aggregate the rule timings, and display them in a formatted table.
 */

import {
  aggregatePerRule,
  NumericAggregatedTimes,
  calculateProcessedTimeEntries,
  formatAggregatedTimesForDisplay,
  ProcessedTimeEntry,
  aggregatePerFile,
} from '../utils';

import { readFileSync } from 'node:fs';

import { URL } from 'node:url';
import type { LintResults } from '../types';
import { basename } from 'node:path';

const file = process.argv[2] ?? 'eslint-stats.json';

const groupBy = process.argv[3] ?? 'rule';

const statsPath: URL = new URL(file, import.meta.url);
const statsString: string = readFileSync(statsPath, 'utf-8');
const lintResultsArray: LintResults = JSON.parse(statsString);

let aggregate: NumericAggregatedTimes = {};
if (groupBy === 'rule') {
  aggregate = aggregatePerRule(lintResultsArray);
} else if (groupBy === 'file') {
  aggregate = aggregatePerFile(lintResultsArray);
} else {
  console.error('Invalid groupBy value. Must be "rule" or "file".');
  process.exit(1);
}
const total = Object.values(aggregate).reduce((sum, time) => sum + time, 0);
const processedEntries: ProcessedTimeEntry<string>[] =
  calculateProcessedTimeEntries(aggregate, total);

if (processedEntries.length === 0) {
  console.log('No rule times to display.');
  process.exit(0);
}

let finalEntries = processedEntries;
if (groupBy === 'file') {
  finalEntries = processedEntries.map(({ identifier, ...rest }) => ({
    identifier: basename(identifier),
    ...rest,
  }));
}

console.table(formatAggregatedTimesForDisplay(finalEntries.slice(0, 10)));
