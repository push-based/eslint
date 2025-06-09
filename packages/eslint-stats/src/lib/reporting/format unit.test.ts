import { FormattedDisplayEntry } from './format';
import { formatProcessedResultsForDisplay } from './format';
describe('formatAggregatedTimesForDisplay', () => {
  it('should return empty array for empty input', () => {
    expect(formatProcessedResultsForDisplay([])).toEqual([]);
  });

  it('should sort entries by timeMs descending and format (flat list)', () => {
    const unsortedEntries: ProcessedTimeEntry[] = [
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

    const expectedFormattedOutput: FormattedDisplayEntry[] = [
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
    ];
    expect(formatProcessedResultsForDisplay(unsortedEntries)).toStrictEqual(
      expectedFormattedOutput
    );
  });

  it('should format timeMs and relativePercent strings correctly (flat list)', () => {
    const entry: ProcessedTimeEntry[] = [
      {
        identifier: 'ruleA',
        timeMs: 50.1234,
        relativePercent: 50.12,
      } as ProcessedTimeEntry,
    ];
    const expectedOutput: FormattedDisplayEntry[] = [
      { identifier: 'ruleA', timeMs: '50.123', relativePercent: '50.1%' },
    ];
    expect(formatProcessedResultsForDisplay(entry)).toEqual(expectedOutput);
  });

  it('should format and sort hierarchical entries correctly, preserving structure', () => {
    const hierarchicalEntries: ProcessedTimeEntry[] = [
      {
        identifier: 'file/C.ts', // Lower time, to test top-level sorting
        timeMs: 20,
        relativePercent: 10,
      },
      {
        identifier: 'file/A.ts',
        timeMs: 100,
        relativePercent: 50,
        children: [
          {
            identifier: 'ruleA2', // Lower time, to test child sorting
            timeMs: 40,
            relativePercent: 20,
            children: [
              { identifier: 'subRuleA2.2', timeMs: 15, relativePercent: 7.5 }, // Lower time
              { identifier: 'subRuleA2.1', timeMs: 25, relativePercent: 12.5 },
            ],
          },
          { identifier: 'ruleA1', timeMs: 60, relativePercent: 30 },
        ],
      },
      {
        identifier: 'file/B.ts',
        timeMs: 80,
        relativePercent: 40,
        children: [{ identifier: 'ruleB1', timeMs: 80, relativePercent: 40 }],
      },
    ];

    const expectedFormattedOutput: FormattedDisplayEntry[] = [
      {
        identifier: 'file/A.ts',
        timeMs: '100.000',
        relativePercent: '50.0%',
        children: [
          { identifier: 'ruleA1', timeMs: '60.000', relativePercent: '30.0%' },
          {
            identifier: 'ruleA2',
            timeMs: '40.000',
            relativePercent: '20.0%',
            children: [
              {
                identifier: 'subRuleA2.1',
                timeMs: '25.000',
                relativePercent: '12.5%',
              },
              {
                identifier: 'subRuleA2.2',
                timeMs: '15.000',
                relativePercent: '7.5%',
              },
            ],
          },
        ],
      },
      {
        identifier: 'file/B.ts',
        timeMs: '80.000',
        relativePercent: '40.0%',
        children: [
          { identifier: 'ruleB1', timeMs: '80.000', relativePercent: '40.0%' },
        ],
      },
      { identifier: 'file/C.ts', timeMs: '20.000', relativePercent: '10.0%' },
    ];

    expect(formatProcessedResultsForDisplay(hierarchicalEntries)).toStrictEqual(
      expectedFormattedOutput
    );
  });

  it('should handle empty children array and undefined children correctly in hierarchical structure', () => {
    const entries: ProcessedTimeEntry[] = [
      {
        identifier: 'parent2', // To test sorting
        timeMs: 5,
        relativePercent: 50,
      },
      {
        identifier: 'parent1',
        timeMs: 10,
        relativePercent: 100,
        children: [], // Empty children array
      },
    ];
    const expected: FormattedDisplayEntry[] = [
      {
        identifier: 'parent1',
        timeMs: '10.000',
        relativePercent: '100.0%',
        children: [],
      },
      { identifier: 'parent2', timeMs: '5.000', relativePercent: '50.0%' },
    ];
    expect(formatProcessedResultsForDisplay(entries)).toStrictEqual(expected);
  });

  it('should handle relativePercent -1 correctly in hierarchical structure', () => {
    const entries: ProcessedTimeEntry[] = [
      {
        identifier: 'parent',
        timeMs: 0,
        relativePercent: -1,
        children: [{ identifier: 'child', timeMs: 0, relativePercent: -1 }],
      },
    ];
    const expected: FormattedDisplayEntry[] = [
      {
        identifier: 'parent',
        timeMs: '0.000',
        relativePercent: 'N/A',
        children: [
          { identifier: 'child', timeMs: '0.000', relativePercent: 'N/A' },
        ],
      },
    ];
    expect(formatProcessedResultsForDisplay(entries)).toStrictEqual(expected);
  });
});
