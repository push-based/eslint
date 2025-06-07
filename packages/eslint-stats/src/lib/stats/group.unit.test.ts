import { describe, it, expect } from 'vitest';
import { groupByRule, groupByFileAndRule } from './group';

describe('groupByRule', () => {
  it('should return empty array for empty stats', () => {
    expect(groupByRule([])).toEqual([]);
  });

  it('should aggregate stats by rule ID', () => {
    expect(
      groupByRule([
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
      ])
    ).toStrictEqual([
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
    ]);
  });

  it('should handle entries with severity 0', () => {
    expect(
      groupByRule([
        {
          ruleId: 'rule-a',
          timeMs: 100,
          filePath: 'file1.js',
          fixable: true,
          manuallyFixable: true,
          severity: 0,
          isTestFile: false,
        },
      ])
    ).toStrictEqual([
      expect.objectContaining({
        identifier: 'rule-a',
        timeMs: 100,
        severities: [],
      }),
    ]);
  });

  it('should correctly update fixable and manuallyFixable flags', () => {
    expect(
      groupByRule([
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
      ])
    ).toStrictEqual([
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
    ]);
  });
});

describe('groupByFileAndRule', () => {
  it('should group by file and then by rule', () => {
    const result = groupByFileAndRule([
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
    ]);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identifier: 'path/to/file1.ts',
          timeMs: 45,
          warningCount: 1,
          errorCount: 2,
          manuallyFixable: true,
          fixable: false, // one rule is not fixable
          children: expect.arrayContaining([
            expect.objectContaining({ identifier: 'rule1', timeMs: 25 }),
            expect.objectContaining({ identifier: 'rule2', timeMs: 20 }),
          ]),
        }),
        expect.objectContaining({
          identifier: 'path/to/file2.ts',
          timeMs: 5,
        }),
      ])
    );

    const file1Result = result.find((r) => r.identifier === 'path/to/file1.ts');
    expect(file1Result?.children).toHaveLength(2);
  });

  it('file should be fixable if all problems are fixable', () => {
    expect(
      groupByFileAndRule([
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
      ])
    ).toEqual([expect.objectContaining({ fixable: true })]);
  });

  it('file should NOT be fixable if one of the problems is not fixable', () => {
    expect(
      groupByFileAndRule([
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
      ])
    ).toEqual([expect.objectContaining({ fixable: false })]);
  });

  it('file should NOT be fixable if it has no problems', () => {
    expect(
      groupByFileAndRule([
        {
          filePath: 'path/to/file1.ts',
          ruleId: 'rule1',
          timeMs: 10,
          severity: 0,
          fixable: true,
          manuallyFixable: false,
          isTestFile: false,
        },
      ])
    ).toEqual([expect.objectContaining({ fixable: false })]);
  });
});
