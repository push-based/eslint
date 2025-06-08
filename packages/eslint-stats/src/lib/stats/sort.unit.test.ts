import { describe, it, expect } from 'vitest';
import { sortRules } from './sort';
import type { ProcessedTimeEntry } from '../models/eslint-stats.schema';

const createMockEntries = (): ProcessedTimeEntry[] => [
  {
    identifier: 'rule-c',
    timeMs: 100,
    relativePercent: 10,
    warningCount: 5,
    errorCount: 5,
  },
  {
    identifier: 'rule-a',
    timeMs: 300,
    relativePercent: 30,
    warningCount: 1,
    errorCount: 1,
  },
  {
    identifier: 'rule-b',
    timeMs: 200,
    relativePercent: 20,
    warningCount: 10,
    errorCount: 10,
    children: [
      {
        identifier: 'child-b2',
        timeMs: 50,
        warningCount: 2,
        errorCount: 3,
        relativePercent: 5,
      },
      {
        identifier: 'child-b1',
        timeMs: 150,
        warningCount: 8,
        errorCount: 7,
        relativePercent: 15,
      },
    ],
  },
  {
    identifier: 'rule-d',
    timeMs: 100,
    relativePercent: 10,
    warningCount: 20,
    errorCount: 0,
  },
];

describe('sortRules', () => {
  it('should sort by time in descending order by default', () => {
    const entries = createMockEntries();
    const sorted = sortRules(entries);
    expect(sorted.map((e) => e.identifier)).toEqual([
      'rule-a',
      'rule-b',
      'rule-c',
      'rule-d',
    ]);
    // Check secondary sort for equal times
    expect(sorted[2].identifier).toBe('rule-c');
    expect(sorted[3].identifier).toBe('rule-d');
  });

  it('should sort by time in ascending order', () => {
    const entries = createMockEntries();
    const sorted = sortRules(entries, { key: 'time', order: 'asc' });
    expect(sorted.map((e) => e.identifier)).toEqual([
      'rule-c',
      'rule-d',
      'rule-b',
      'rule-a',
    ]);
  });

  it('should sort by violations in descending order', () => {
    const entries = createMockEntries();
    const sorted = sortRules(entries, { key: 'violations', order: 'desc' });
    expect(sorted.map((e) => e.identifier)).toEqual([
      'rule-b',
      'rule-d',
      'rule-c',
      'rule-a',
    ]);
  });

  it('should sort by violations in ascending order', () => {
    const entries = createMockEntries();
    const sorted = sortRules(entries, { key: 'violations', order: 'asc' });
    expect(sorted.map((e) => e.identifier)).toEqual([
      'rule-a',
      'rule-c',
      'rule-b',
      'rule-d',
    ]);
  });

  it('should recursively sort children', () => {
    const entries = createMockEntries();
    const sorted = sortRules(entries, { key: 'time', order: 'desc' });
    const ruleB = sorted.find((e) => e.identifier === 'rule-b');
    expect(
      ruleB?.children?.map((c: ProcessedTimeEntry) => c.identifier)
    ).toEqual(['child-b1', 'child-b2']);
  });

  it('should handle missing violation counts', () => {
    const entries: ProcessedTimeEntry[] = [
      {
        identifier: 'rule-a',
        timeMs: 100,
        relativePercent: 50,
        errorCount: 1,
        warningCount: 1,
      },
      {
        identifier: 'rule-b',
        timeMs: 100,
        errorCount: 1,
        relativePercent: 50,
        warningCount: 1,
      },
      {
        identifier: 'rule-c',
        timeMs: 100,
        relativePercent: 50,
        errorCount: 1,
        warningCount: 1,
      },
    ];
    const sorted = sortRules(entries, { key: 'violations', order: 'desc' });
    expect(sorted.map((e) => e.identifier)).toEqual([
      'rule-a',
      'rule-b',
      'rule-c',
    ]);
  });
});
