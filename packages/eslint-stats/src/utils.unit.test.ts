import { describe, it, expect } from 'vitest';
import {
  aggregatePerRule,
  aggregatePerFile,
  calculateProcessedTimeEntries,
  formatAggregatedTimesForDisplay,
} from './utils';
import type { LintResults } from './types';

describe('aggregatePerRule', () => {
  it('should return empty object for empty results', () => {
    expect(aggregatePerRule([])).toEqual({});
  });

  it('should aggregate times from multiple files and rules', () => {
    expect(
      aggregatePerRule([
        {
          filePath: 'file0.js',
          stats: {
            times: {
              passes: [
                {
                  rules: {
                    '@typescript-eslint/no-unused-vars': { total: 10 },
                  },
                },
              ],
            },
          },
        },
        {
          filePath: 'file1.js',
          stats: {
            times: {
              passes: [
                {
                  rules: {
                    '@typescript-eslint/no-unused-vars': { total: 10 },
                    'no-misleading-character-class': { total: 10 },
                  },
                },
              ],
            },
          },
        },
        {
          filePath: 'file2.js',
          stats: {
            times: {
              passes: [
                {
                  rules: {
                    '@typescript-eslint/no-unused-vars': { total: 10 },
                    'no-misleading-character-class': { total: 10 },
                    '@nx/dependency-checks': { total: 10 },
                  },
                },
              ],
            },
          },
        },
      ] as unknown as LintResults)
    ).toStrictEqual({
      '@typescript-eslint/no-unused-vars': 30,
      'no-misleading-character-class': 20,
      '@nx/dependency-checks': 10,
    });
  });

  it.each([
    {
      case: 'times is null',
      stats: { times: null },
    },
    {
      case: 'times is undefined',
      stats: { times: undefined },
    },
    {
      case: 'passes is null',
      stats: { times: { passes: null } },
    },
    {
      case: 'passes is undefined',
      stats: { times: { passes: undefined } },
    },
    {
      case: 'passes is an empty array',
      stats: { times: { passes: [] } },
    },
    {
      case: 'a pass entry in passes is null',
      stats: { times: { passes: [null] } },
    },
    {
      case: 'a pass entry in passes is undefined',
      stats: { times: { passes: [undefined] } },
    },
    {
      case: 'rules is null in a pass',
      stats: { times: { passes: [{ rules: null }] } },
    },
    {
      case: 'rules is undefined in a pass',
      stats: { times: { passes: [{ rules: undefined }] } },
    },
    {
      case: 'rules is an empty object in a pass',
      stats: { times: { passes: [{ rules: {} }] } },
    },
  ])(
    'should return empty when handling deeper customTimingStats paths: $case',
    ({ stats }) => {
      expect(
        aggregatePerRule([{ stats: stats }] as unknown as LintResults)
      ).toStrictEqual({});
    }
  );
});

describe('aggregatePerFile', () => {
  it('should return empty object for empty results', () => {
    expect(aggregatePerFile([])).toEqual({});
  });

  it('should aggregate times from multiple files', () => {
    expect(
      aggregatePerFile([
        {
          filePath: 'eslint-stats.types.ts',
          stats: { times: { passes: [{ total: 125.5 }] } },
        },
        {
          filePath: 'eslint-stats.json',
          stats: { times: { passes: [{ total: 50.25 }, { total: 25.75 }] } },
        },
        {
          filePath: 'bin.js',
          stats: { times: { passes: [{ total: 0 }] } },
        },
        {
          filePath: 'src/app/components/some.component.ts',
          stats: { times: { passes: [{ total: 33.33 }] } },
        },
        {
          filePath: 'eslint-stats.types.ts',
          stats: { times: { passes: [{ total: 74.5 }] } },
        },
      ] as unknown as LintResults)
    ).toStrictEqual({
      'eslint-stats.types.ts': 200,
      'eslint-stats.json': 76,
      'bin.js': 0,
      'src/app/components/some.component.ts': 33.33,
    });
  });

  it.each([
    {
      case: 'times is null',
      stats: { times: null },
    },
    {
      case: 'times is undefined',
      stats: { times: undefined },
    },
    {
      case: 'passes is null',
      stats: { times: { passes: null } },
    },
    {
      case: 'passes is undefined',
      stats: { times: { passes: undefined } },
    },
    {
      case: 'passes is an empty array',
      stats: { times: { passes: [] } },
    },
    {
      case: 'a pass entry in passes is null',
      stats: { times: { passes: [null] } },
    },
    {
      case: 'a pass entry in passes is undefined',
      stats: { times: { passes: [undefined] } },
    },
    {
      case: 'total is null in a pass',
      stats: { times: { passes: [{ total: null }] } },
    },
    {
      case: 'total is undefined in a pass',
      stats: { times: { passes: [{ total: undefined }] } },
    },
  ])(
    'should return empty when handling deeper customTimingStats paths: $case',
    ({ stats }) => {
      expect(
        aggregatePerFile([
          { filePath: 'file.js', stats: stats },
        ] as unknown as LintResults)
      ).toStrictEqual({ 'file.js': 0 });
    }
  );
});

describe('calculateProcessedTimeEntries', () => {
  it('should return empty array for empty input', () => {
    expect(calculateProcessedTimeEntries({})).toEqual([]);
  });

  it('should calculate percentages for entries', () => {
    const aggregatedTimes = {
      '@nx/dependency-checks': 47.268,
      '@typescript-eslint/no-unused-vars': 71.412,
      '@nx/enforce-module-boundaries': 18.608,
    };
    const totalTime = Object.values(aggregatedTimes).reduce(
      (sum, time) => sum + time,
      0
    );

    expect(calculateProcessedTimeEntries(aggregatedTimes)).toStrictEqual([
      {
        identifier: '@typescript-eslint/no-unused-vars',
        timeMs: 71.412,
        relativePercent: (71.412 / totalTime) * 100,
      },
      {
        identifier: '@nx/dependency-checks',
        timeMs: 47.268,
        relativePercent: (47.268 / totalTime) * 100,
      },
      {
        identifier: '@nx/enforce-module-boundaries',
        timeMs: 18.608,
        relativePercent: (18.608 / totalTime) * 100,
      },
      {
        identifier: 'no-misleading-character-class',
        timeMs: 2.998,
        relativePercent: (2.998 / totalTime) * 100,
      },
    ]);
  });

  it('should handle zero total time', () => {
    expect(
      calculateProcessedTimeEntries({
        ruleA: 0,
      })
    ).toStrictEqual([{ identifier: 'ruleA', timeMs: 0, relativePercent: -1 }]);
  });
});

describe('formatAggregatedTimesForDisplay', () => {
  it('should return empty array for empty input', () => {
    expect(formatAggregatedTimesForDisplay([])).toEqual([]);
  });

  it('should sort entries by timeMs descending', () => {
    const unsortedEntries = [
      {
        identifier: '@nx/dependency-checks',
        timeMs: 47.268,
        relativePercent: 26.0,
      },
      { identifier: 'no-useless-escape', timeMs: 0.5, relativePercent: -1 },
      {
        identifier: '@typescript-eslint/no-unused-vars',
        timeMs: 71.412,
        relativePercent: 39.3,
      },
    ];

    expect(formatAggregatedTimesForDisplay(unsortedEntries)).toStrictEqual([
      {
        identifier: '@typescript-eslint/no-unused-vars',
        timeMs: '71.412',
        relativePercent: '39.3%',
      },
      {
        identifier: '@nx/dependency-checks',
        timeMs: '47.268',
        relativePercent: '26.0%',
      },
      {
        identifier: 'no-useless-escape',
        timeMs: '0.500',
        relativePercent: 'N/A',
      },
    ]);
  });

  it('should format timeMs and relativePercent strings correctly', () => {
    expect(
      formatAggregatedTimesForDisplay([
        { identifier: 'ruleA', timeMs: 50.1234, relativePercent: 50.12 },
      ])
    ).toEqual([
      { identifier: 'ruleA', timeMs: '50.123', relativePercent: '50.1%' },
    ]);
  });
});
