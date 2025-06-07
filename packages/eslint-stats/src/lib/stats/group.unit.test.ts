import { describe, it, expect } from 'vitest';
import { groupByRule, groupByFileAndRule } from './group';
import { type DetailedRuleStat } from '../models/eslint-stats.schema';

describe('groupByRule', () => {
  it('should return empty array for empty stats', () => {
    const detailedStats: DetailedRuleStat[] = [];
    const aggregated = groupByRule(detailedStats);
    expect(aggregated).toEqual([]);
  });

  it('should aggregate stats by rule ID', () => {
    const detailedStats: DetailedRuleStat[] = [
      {
        ruleId: 'rule-a',
        timeMs: 100,
        filePath: 'file1.js',
        fixable: true,
        manuallyFixable: false,
        severity: 2,
        isTestFile: false,
      },
      {
        ruleId: 'rule-b',
        timeMs: 50,
        filePath: 'file1.js',
        fixable: false,
        manuallyFixable: true,
        severity: 1,
        isTestFile: false,
      },
      {
        ruleId: 'rule-a',
        timeMs: 20,
        filePath: 'file2.js',
        fixable: true,
        manuallyFixable: false,
        severity: 2,
        isTestFile: true,
      },
    ];
    const aggregated = groupByRule(detailedStats);
    expect(aggregated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identifier: 'rule-a',
          timeMs: 120,
          fixable: true,
          manuallyFixable: false,
          severities: ['error'],
          occurredInTestFiles: true,
          occurredInNonTestFiles: true,
        }),
        expect.objectContaining({
          identifier: 'rule-b',
          timeMs: 50,
          fixable: false,
          manuallyFixable: true,
          severities: ['warning'],
          occurredInTestFiles: false,
          occurredInNonTestFiles: true,
        }),
      ])
    );
  });

  it('should handle entries with severity 0', () => {
    const detailedStats: DetailedRuleStat[] = [
      {
        ruleId: 'rule-a',
        timeMs: 100,
        filePath: 'file1.js',
        fixable: true,
        manuallyFixable: true,
        severity: 0,
        isTestFile: false,
      },
    ];
    const aggregated = groupByRule(detailedStats);
    expect(aggregated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identifier: 'rule-a',
          timeMs: 100,
          severities: [],
        }),
      ])
    );
  });

  it('should correctly update fixable and manuallyFixable flags', () => {
    const detailedStats: DetailedRuleStat[] = [
      {
        ruleId: 'rule-a',
        timeMs: 10,
        filePath: 'file1.js',
        fixable: true,
        manuallyFixable: true,
        severity: 2,
        isTestFile: false,
      },
      {
        ruleId: 'rule-a',
        timeMs: 20,
        filePath: 'file2.js',
        fixable: false,
        manuallyFixable: true,
        severity: 2,
        isTestFile: false,
      },
      {
        ruleId: 'rule-b',
        timeMs: 30,
        filePath: 'file1.js',
        fixable: true,
        manuallyFixable: false,
        severity: 1,
        isTestFile: false,
      },
    ];
    const aggregated = groupByRule(detailedStats);
    expect(aggregated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identifier: 'rule-a',
          fixable: false,
          manuallyFixable: true,
        }),
        expect.objectContaining({
          identifier: 'rule-b',
          fixable: true,
          manuallyFixable: false,
        }),
      ])
    );
  });
});

describe('groupByFileAndRule', () => {
  it('should group by file and then by rule', () => {
    const detailedStats: DetailedRuleStat[] = [
      {
        filePath: 'path/to/file1.ts',
        ruleId: 'rule1',
        timeMs: 10,
        severity: 2,
        fixable: true,
        manuallyFixable: false,
        isTestFile: false,
      },
      {
        filePath: 'path/to/file1.ts',
        ruleId: 'rule2',
        timeMs: 20,
        severity: 1,
        fixable: false,
        manuallyFixable: true,
        isTestFile: false,
      },
      {
        filePath: 'path/to/file2.ts',
        ruleId: 'rule1',
        timeMs: 5,
        severity: 2,
        fixable: true,
        manuallyFixable: false,
        isTestFile: false,
      },
      {
        filePath: 'path/to/file1.ts',
        ruleId: 'rule1',
        timeMs: 15,
        severity: 2,
        fixable: true,
        manuallyFixable: false,
        isTestFile: false,
      },
    ];

    const result = groupByFileAndRule(detailedStats);

    expect(result).toHaveLength(2);

    const file1Result = result.find(
      (r) => r.identifier === 'path/to/file1.ts'
    )!;
    expect(file1Result).toBeDefined();
    expect(file1Result.timeMs).toBe(45);
    expect(file1Result.warningCount).toBe(1);
    expect(file1Result.errorCount).toBe(2);
    expect(file1Result.manuallyFixable).toBe(true);

    expect(file1Result.children).toHaveLength(2);

    const file1Rule1 = file1Result.children?.find(
      (r) => r.identifier === 'rule1'
    );
    expect(file1Rule1).toBeDefined();
    expect(file1Rule1?.timeMs).toBe(25);
    expect(file1Rule1?.errorCount).toBe(2);
    expect(file1Rule1?.warningCount).toBe(0);
    expect(file1Rule1?.fixable).toBe(true);
    expect(file1Rule1?.manuallyFixable).toBe(false);

    const file1Rule2 = file1Result.children?.find(
      (r) => r.identifier === 'rule2'
    );
    expect(file1Rule2).toBeDefined();
    expect(file1Rule2?.timeMs).toBe(20);
    expect(file1Rule2?.errorCount).toBe(0);
    expect(file1Rule2?.warningCount).toBe(1);
    expect(file1Rule2?.fixable).toBe(false);
    expect(file1Rule2?.manuallyFixable).toBe(true);

    const file2Result = result.find(
      (r) => r.identifier === 'path/to/file2.ts'
    )!;
    expect(file2Result).toBeDefined();
    expect(file2Result.timeMs).toBe(5);
  });

  it('file should be fixable if all problems are fixable', () => {
    const detailedStats: DetailedRuleStat[] = [
      {
        filePath: 'path/to/file1.ts',
        ruleId: 'rule1',
        timeMs: 10,
        severity: 2,
        fixable: true,
        manuallyFixable: false,
        isTestFile: false,
      },
      {
        filePath: 'path/to/file1.ts',
        ruleId: 'rule2',
        timeMs: 20,
        severity: 1,
        fixable: true,
        manuallyFixable: false,
        isTestFile: false,
      },
    ];

    const result = groupByFileAndRule(detailedStats);
    const file1Result = result.find(
      (r) => r.identifier === 'path/to/file1.ts'
    )!;
    expect(file1Result.fixable).toBe(true);
  });

  it('file should NOT be fixable if one of the problems is not fixable', () => {
    const detailedStats: DetailedRuleStat[] = [
      {
        filePath: 'path/to/file1.ts',
        ruleId: 'rule1',
        timeMs: 10,
        severity: 2,
        fixable: true,
        manuallyFixable: false,
        isTestFile: false,
      },
      {
        filePath: 'path/to/file1.ts',
        ruleId: 'rule2',
        timeMs: 20,
        severity: 1,
        fixable: false,
        manuallyFixable: false,
        isTestFile: false,
      },
    ];

    const result = groupByFileAndRule(detailedStats);
    const file1Result = result.find(
      (r) => r.identifier === 'path/to/file1.ts'
    )!;
    expect(file1Result.fixable).toBe(false);
  });

  it('file should NOT be fixable if it has no problems', () => {
    const detailedStats: DetailedRuleStat[] = [
      {
        filePath: 'path/to/file1.ts',
        ruleId: 'rule1',
        timeMs: 10,
        severity: 0,
        fixable: true,
        manuallyFixable: false,
        isTestFile: false,
      },
    ];

    const result = groupByFileAndRule(detailedStats);
    const file1Result = result.find(
      (r) => r.identifier === 'path/to/file1.ts'
    )!;
    expect(file1Result.fixable).toBe(false);
  });
});
