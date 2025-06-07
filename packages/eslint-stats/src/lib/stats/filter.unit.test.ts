import { describe, it, expect } from 'vitest';
import { getFirst } from './filter';
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

describe('getFirst', () => {
  it('should return the top N entries', () => {
    const entries = createMockEntries();
    const sorted = sortRules(entries);
    const first2 = getFirst(sorted, [2]);
    expect(first2.map((e) => e.identifier)).toEqual([
      'rule-a',
      'rule-b',
      '...',
    ]);
    expect(first2.length).toBe(3); // 2 + '...'
  });

  it('should not add "..." if limit is not reached', () => {
    const entries = createMockEntries().slice(0, 2);
    const first3 = getFirst(entries, [3]);
    expect(first3.length).toBe(2);
    expect(first3.find((e) => e.identifier === '...')).toBeUndefined();
  });

  it('should recursively get the first N children', () => {
    const entries = createMockEntries();
    const sorted = sortRules(entries);
    const result = getFirst(sorted, [4, 1]);
    const ruleB = result.find((e) => e.identifier === 'rule-b');
    expect(
      ruleB?.children?.map((c: ProcessedTimeEntry) => c.identifier)
    ).toEqual(['child-b1', '...']);
    expect(ruleB?.children?.length).toBe(2);
  });
});
