import { it, expect, describe } from 'vitest';
import {
  createIdentifierFormatter,
  formatProcessedResultsForDisplay,
  shortenPath,
} from './format';
import type { ProcessedTimeEntry } from '../models/eslint-stats.schema';

describe('shortenPath', () => {
  it('should not shorten path if it is already under max length', () => {
    const path = 'a/b/c.ts';
    expect(shortenPath(path, '', 20)).toBe(path);
  });

  it('should remove common base path without shortening', () => {
    const path = 'a/b/c.ts';
    const basePath = 'a/';
    expect(shortenPath(path, basePath, 20)).toBe('b/c.ts');
  });

  it('should shorten a long path by replacing start with ellipsis', () => {
    const path = 'a/b/c/d/e/f/g.ts';
    expect(shortenPath(path, 'a/', 20)).toBe('b/c/d/e/f/g.ts');
  });

  it('should shorten a long filename by replacing start with ellipsis', () => {
    const path = 'a/b/this-is-a-very-long-filename-that-will-be-truncated.ts';
    expect(shortenPath(path, 'a/b/', 40)).toBe(
      '...ng-filename-that-will-be-truncated.ts'
    );
  });

  it('should return the full path if maxLength is not exceeded after removing common base path', () => {
    const path =
      'src/app/features/some-feature/components/some-component/some-component.component.ts';
    const basePath = 'src/app/features/';
    expect(shortenPath(path, basePath, 80)).toBe(
      'some-feature/components/some-component/some-component.component.ts'
    );
  });
});

describe('createIdentifierFormatter', () => {
  it('should find common base path and shorten file identifiers', () => {
    const entries = [
      {
        identifier: 'src/app/componentA.ts',
        timeMs: 1,
        relativePercent: 1,
        warningCount: 0,
        errorCount: 0,
      },
      {
        identifier: 'src/app/componentB.ts',
        timeMs: 1,
        relativePercent: 1,
        warningCount: 0,
        errorCount: 0,
      },
    ] as ProcessedTimeEntry[];
    const formatter = createIdentifierFormatter(entries);
    expect(formatter(entries[0])).toBe('componentA.ts');
    expect(formatter(entries[1])).toBe('componentB.ts');
  });

  it('should not shorten non-file identifiers', () => {
    const entries = [
      {
        identifier: 'src/app/componentA.ts',
        timeMs: 1,
        relativePercent: 1,
        warningCount: 0,
        errorCount: 0,
      },
    ] as ProcessedTimeEntry[];
    const formatter = createIdentifierFormatter(entries);
    const ruleEntry = {
      identifier: 'my-eslint-rule',
      timeMs: 1,
      relativePercent: 1,
      warningCount: 0,
      errorCount: 0,
    } as ProcessedTimeEntry;
    expect(formatter(ruleEntry)).toBe('my-eslint-rule');
  });

  it('should treat identifiers with children as file-like and shorten them', () => {
    const entries = [
      {
        identifier: 'src/app/files/componentA.ts',
        timeMs: 1,
        relativePercent: 1,
        warningCount: 0,
        errorCount: 0,
      },
    ] as ProcessedTimeEntry[];
    const formatter = createIdentifierFormatter(entries);
    const entryWithChildren = {
      identifier: 'src/app/files/componentB', // No extension
      timeMs: 1,
      relativePercent: 1,
      warningCount: 0,
      errorCount: 0,
      children: [],
    } as ProcessedTimeEntry;
    expect(formatter(entryWithChildren)).toBe('src/app/files/componentB');
  });

  it('should handle paths with no common base path', () => {
    const entries = [
      {
        identifier: 'one/componentA.ts',
        timeMs: 1,
        relativePercent: 1,
        warningCount: 0,
        errorCount: 0,
      },
      {
        identifier: 'two/componentB.ts',
        timeMs: 1,
        relativePercent: 1,
        warningCount: 0,
        errorCount: 0,
      },
    ] as ProcessedTimeEntry[];
    const formatter = createIdentifierFormatter(entries);
    expect(formatter(entries[0])).toBe('one/componentA.ts');
    expect(formatter(entries[1])).toBe('two/componentB.ts');
  });

  it('should find file identifiers in nested children to determine common path', () => {
    const entries = [
      {
        identifier: 'group1',
        children: [
          {
            identifier: 'src/app/nested/componentA.ts',
            timeMs: 1,
            relativePercent: 1,
            warningCount: 0,
            errorCount: 0,
          },
        ],
      },
    ] as ProcessedTimeEntry[];
    const formatter = createIdentifierFormatter(entries);
    const fileEntry = {
      identifier: 'src/app/componentB.ts',
      timeMs: 1,
      relativePercent: 1,
      warningCount: 0,
      errorCount: 0,
    } as ProcessedTimeEntry;
    expect(formatter(fileEntry)).toBe('src/app/componentB.ts');
  });
});

describe('formatAggregatedTimesForDisplay', () => {
  it('should return empty array for empty input', () => {
    expect(formatProcessedResultsForDisplay([])).toEqual([]);
  });

  it('should format entries and not change order (flat list)', () => {
    expect(
      formatProcessedResultsForDisplay([
        {
          identifier: '@typescript-eslint/no-unused-vars',
          timeMs: 71.412,
          relativePercent: 39.3,
          warningCount: 0,
          errorCount: 0,
        },
        {
          identifier: '@nx/dependency-checks',
          timeMs: 47.268,
          relativePercent: 26.0,
          warningCount: 0,
          errorCount: 0,
        },
        {
          identifier: 'no-useless-escape',
          timeMs: 0.5,
          relativePercent: -1,
          warningCount: 0,
          errorCount: 0,
        },
      ])
    ).toStrictEqual([
      {
        identifier: '@typescript-eslint/no-unused-vars',
        timeMs: '71.41 ms',
        rawTimeMs: 71.412,
        relativePercent: '39.3%',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
      },
      {
        identifier: '@nx/dependency-checks',
        timeMs: '47.27 ms',
        rawTimeMs: 47.268,
        relativePercent: '26.0%',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
      },
      {
        identifier: 'no-useless-escape',
        timeMs: '0.50 ms',
        rawTimeMs: 0.5,
        relativePercent: 'N/A',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
      },
    ]);
  });

  it('should format timeMs and relativePercent strings correctly (flat list)', () => {
    expect(
      formatProcessedResultsForDisplay([
        {
          identifier: 'ruleA',
          timeMs: 50.1234,
          relativePercent: 50.12,
          warningCount: 0,
          errorCount: 0,
        } as ProcessedTimeEntry,
      ])
    ).toEqual([
      {
        identifier: 'ruleA',
        timeMs: '50.12 ms',
        rawTimeMs: 50.1234,
        relativePercent: '50.1%',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
      },
    ]);
  });

  it('should format hierarchical entries correctly and not change order, preserving structure', () => {
    expect(
      formatProcessedResultsForDisplay([
        {
          identifier: 'file/A.ts',
          timeMs: 100,
          relativePercent: 50,
          warningCount: 0,
          errorCount: 0,
          children: [
            {
              identifier: 'ruleA1',
              timeMs: 60,
              relativePercent: 30,
              warningCount: 0,
              errorCount: 0,
            },
            {
              identifier: 'ruleA2',
              timeMs: 40,
              relativePercent: 20,
              warningCount: 0,
              errorCount: 0,
              children: [
                {
                  identifier: 'subRuleA2.1',
                  timeMs: 25,
                  relativePercent: 12.5,
                  warningCount: 0,
                  errorCount: 0,
                },
                {
                  identifier: 'subRuleA2.2',
                  timeMs: 15,
                  relativePercent: 7.5,
                  warningCount: 0,
                  errorCount: 0,
                },
              ],
            },
          ],
        },
        {
          identifier: 'file/B.ts',
          timeMs: 80,
          relativePercent: 40,
          warningCount: 0,
          errorCount: 0,
          children: [
            {
              identifier: 'ruleB1',
              timeMs: 80,
              relativePercent: 40,
              warningCount: 0,
              errorCount: 0,
            },
          ],
        },
        {
          identifier: 'file/C.ts',
          timeMs: 20,
          relativePercent: 10,
          warningCount: 0,
          errorCount: 0,
        },
      ])
    ).toStrictEqual([
      {
        identifier: 'A.ts',
        timeMs: '100.00 ms',
        rawTimeMs: 100,
        relativePercent: '50.0%',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
        children: [
          {
            identifier: 'ruleA1',
            timeMs: '60.00 ms',
            rawTimeMs: 60,
            relativePercent: '30.0%',
            warningCount: '',
            errorCount: '',
            fixable: false,
            manuallyFixable: false,
          },
          {
            identifier: 'ruleA2',
            timeMs: '40.00 ms',
            rawTimeMs: 40,
            relativePercent: '20.0%',
            warningCount: '',
            errorCount: '',
            fixable: false,
            manuallyFixable: false,
            children: [
              {
                identifier: 'subRuleA2.1',
                timeMs: '25.00 ms',
                rawTimeMs: 25,
                relativePercent: '12.5%',
                warningCount: '',
                errorCount: '',
                fixable: false,
                manuallyFixable: false,
              },
              {
                identifier: 'subRuleA2.2',
                timeMs: '15.00 ms',
                rawTimeMs: 15,
                relativePercent: '7.5%',
                warningCount: '',
                errorCount: '',
                fixable: false,
                manuallyFixable: false,
              },
            ],
          },
        ],
      },
      {
        identifier: 'B.ts',
        timeMs: '80.00 ms',
        rawTimeMs: 80,
        relativePercent: '40.0%',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
        children: [
          {
            identifier: 'ruleB1',
            timeMs: '80.00 ms',
            rawTimeMs: 80,
            relativePercent: '40.0%',
            warningCount: '',
            errorCount: '',
            fixable: false,
            manuallyFixable: false,
          },
        ],
      },
      {
        identifier: 'C.ts',
        timeMs: '20.00 ms',
        rawTimeMs: 20,
        relativePercent: '10.0%',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
      },
    ]);
  });

  it('should handle empty children array and undefined children correctly in hierarchical structure', () => {
    expect(
      formatProcessedResultsForDisplay([
        {
          identifier: 'parent1.ts',
          timeMs: 10,
          relativePercent: 100,
          warningCount: 0,
          errorCount: 0,
          children: [], // Empty children array
        },
        {
          identifier: 'parent2',
          timeMs: 5,
          relativePercent: 50,
          warningCount: 0,
          errorCount: 0,
        },
      ])
    ).toStrictEqual([
      {
        identifier: 'parent1.ts',
        timeMs: '10.00 ms',
        rawTimeMs: 10,
        relativePercent: '100.0%',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
        children: [],
      },
      {
        identifier: 'parent2',
        timeMs: '5.00 ms',
        rawTimeMs: 5,
        relativePercent: '50.0%',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
      },
    ]);
  });

  it('should add icons for fixable and manuallyFixable entries', () => {
    expect(
      formatProcessedResultsForDisplay([
        {
          identifier: 'rule-fixable',
          timeMs: 10,
          relativePercent: 24,
          fixable: true,
          manuallyFixable: false,
          warningCount: 1,
          errorCount: 0,
        },
        {
          identifier: 'rule-manual-fix',
          timeMs: 20,
          relativePercent: 50,
          fixable: false,
          manuallyFixable: true,
          warningCount: 0,
          errorCount: 1,
        },
        {
          identifier: 'rule-both-fix',
          timeMs: 5,
          relativePercent: 12.5,
          fixable: true,
          manuallyFixable: true,
          warningCount: 0,
          errorCount: 0,
        },
        {
          identifier: 'rule-no-fix',
          timeMs: 5,
          relativePercent: 12.5,
          fixable: false,
          manuallyFixable: false,
          warningCount: 0,
          errorCount: 0,
        },
      ])
    ).toStrictEqual([
      {
        identifier: 'rule-fixable',
        timeMs: '10.00 ms',
        rawTimeMs: 10,
        relativePercent: '24.0%',
        warningCount: '1 🔧',
        errorCount: '',
        fixable: true,
        manuallyFixable: false,
      },
      {
        identifier: 'rule-manual-fix',
        timeMs: '20.00 ms',
        rawTimeMs: 20,
        relativePercent: '50.0%',
        warningCount: '',
        errorCount: '1 💡',
        fixable: false,
        manuallyFixable: true,
      },
      {
        identifier: 'rule-both-fix',
        timeMs: '5.00 ms',
        rawTimeMs: 5,
        relativePercent: '12.5%',
        warningCount: '',
        errorCount: '',
        fixable: true,
        manuallyFixable: true,
      },
      {
        identifier: 'rule-no-fix',
        timeMs: '5.00 ms',
        rawTimeMs: 5,
        relativePercent: '12.5%',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
      },
    ]);
  });

  it('should handle relativePercent -1 correctly in hierarchical structure', () => {
    expect(
      formatProcessedResultsForDisplay([
        {
          identifier: 'parent.ts',
          timeMs: 0,
          relativePercent: -1,
          warningCount: 0,
          errorCount: 0,
          children: [
            {
              identifier: 'child',
              timeMs: 0,
              relativePercent: -1,
              warningCount: 0,
              errorCount: 0,
            },
          ],
        },
      ])
    ).toStrictEqual([
      {
        identifier: 'parent.ts',
        timeMs: '0.00 ms',
        rawTimeMs: 0,
        relativePercent: 'N/A',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
        children: [
          {
            identifier: 'child',
            timeMs: '0.00 ms',
            rawTimeMs: 0,
            relativePercent: 'N/A',
            warningCount: '',
            errorCount: '',
            fixable: false,
            manuallyFixable: false,
          },
        ],
      },
    ]);
  });
});
