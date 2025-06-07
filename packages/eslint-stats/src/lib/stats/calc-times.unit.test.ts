import { describe, it, expect } from 'vitest';
import { calculateMsAndRelativePercent } from './calc-times';
import type { TimeEntry } from '../models/eslint-stats.schema';

describe('calculateMsAndRelativePercent', () => {
  it('should return empty array for empty input', () => {
    expect(calculateMsAndRelativePercent([])).toEqual([]);
  });

  it('should calculate percentages for flat list entries', () => {
    const aggregatedTimes = [
      { identifier: 'ruleA', timeMs: 75 } as TimeEntry,
      { identifier: 'ruleB', timeMs: 25 } as TimeEntry,
    ];
    // totalTime = 75 + 25 = 100
    expect(calculateMsAndRelativePercent(aggregatedTimes)).toStrictEqual([
      {
        identifier: 'ruleA',
        timeMs: 75,
        relativePercent: 75, // (75 / 100) * 100
      },
      {
        identifier: 'ruleB',
        timeMs: 25,
        relativePercent: 25, // (25 / 100) * 100
      },
    ]);
  });

  it('should handle zero total time for flat list', () => {
    expect(
      calculateMsAndRelativePercent([{ identifier: 'ruleA', timeMs: 0 }])
    ).toStrictEqual([{ identifier: 'ruleA', timeMs: 0, relativePercent: -1 }]);
    expect(
      calculateMsAndRelativePercent([
        { identifier: 'ruleA', timeMs: 0 },
        { identifier: 'ruleB', timeMs: 0 },
      ])
    ).toStrictEqual([
      { identifier: 'ruleA', timeMs: 0, relativePercent: -1 },
      { identifier: 'ruleB', timeMs: 0, relativePercent: -1 },
    ]);
  });

  it('should calculate percentages for hierarchical entries', () => {
    const aggregatedTimes: TimeEntry[] = [
      {
        identifier: 'file/path/to/component.ts',
        timeMs: 50, // Exclusive time for this file path
        children: [
          { identifier: '@typescript-eslint/no-unused-vars', timeMs: 30 },
          {
            identifier: '@nx/enforce-module-boundaries',
            timeMs: 20, // Exclusive time for this rule in this file
            children: [{ identifier: 'internal-check-type-A', timeMs: 10 }], // hypothetical sub-check
          },
        ],
      },
      { identifier: 'file/path/to/another.ts', timeMs: 40 },
    ];
    // grandTotalTime = 50 (file1) + 30 (rule1) + 20 (rule2) + 10 (sub-check) + 40 (file2) = 150

    const result = calculateMsAndRelativePercent(aggregatedTimes);
    expect(result.length).toBe(2);

    // Check file/path/to/component.ts and its children
    expect(result[0].identifier).toBe('file/path/to/component.ts');
    expect(result[0].timeMs).toBe(50);
    expect(result[0].relativePercent).toBeCloseTo((50 / 150) * 100);
    expect(result[0].children?.length).toBe(2);

    const rule1 = result[0].children?.[0];
    expect(rule1?.identifier).toBe('@typescript-eslint/no-unused-vars');
    expect(rule1?.timeMs).toBe(30);
    expect(rule1?.relativePercent).toBeCloseTo((30 / 150) * 100);

    const rule2 = result[0].children?.[1];
    expect(rule2?.identifier).toBe('@nx/enforce-module-boundaries');
    expect(rule2?.timeMs).toBe(20);
    expect(rule2?.relativePercent).toBeCloseTo((20 / 150) * 100);
    expect(rule2?.children?.length).toBe(1);

    const subCheck = rule2?.children?.[0];
    expect(subCheck?.identifier).toBe('internal-check-type-A');
    expect(subCheck?.timeMs).toBe(10);
    expect(subCheck?.relativePercent).toBeCloseTo((10 / 150) * 100);

    // Check file/path/to/another.ts
    expect(result[1].identifier).toBe('file/path/to/another.ts');
    expect(result[1].timeMs).toBe(40);
    expect(result[1].relativePercent).toBeCloseTo((40 / 150) * 100);
    expect(result[1].children).toBeUndefined();
  });

  it('should handle zero total time with hierarchical entries', () => {
    const aggregatedTimes: TimeEntry[] = [
      {
        identifier: 'file/A.ts',
        timeMs: 0,
        children: [
          { identifier: '@typescript-eslint/no-explicit-any', timeMs: 0 },
        ],
      },
      { identifier: 'file/B.ts', timeMs: 0 },
    ];
    expect(calculateMsAndRelativePercent(aggregatedTimes)).toStrictEqual([
      {
        identifier: 'file/A.ts',
        timeMs: 0,
        relativePercent: -1,
        children: [
          {
            identifier: '@typescript-eslint/no-explicit-any',
            timeMs: 0,
            relativePercent: -1,
          },
        ],
      },
      {
        identifier: 'file/B.ts',
        timeMs: 0,
        relativePercent: -1,
      },
    ]);
  });
});
