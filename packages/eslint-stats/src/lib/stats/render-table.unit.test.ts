import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderTable } from './render-table'; 

describe('render-table', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let testData: Record<string, unknown>[];

  beforeEach(() => {
    // Reset test data before each test
    testData = [];
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should print a formatted table with a single entry', () => {
    const testData = [
      {
        identifier: 'rule-A',
        timeMs: '100 ms',
        rawTimeMs: 100,
        relativePercent: '100.0%',
        warningCount: '0',
        errorCount: '0',
        fixable: true,
        manuallyFixable: false,
      },
    ];
    renderTable(testData, { headers: ['Rule', 'Time (ms)', '%'] });
    const output = consoleSpy.mock.calls[0][0] as string;
    const expectedOutput = [
      'Rule   | Time (ms) | %     ',
      ':-----|:---------|--------:',
      'rule-A | 100 ms    | 100.0%',
    ].join('\n');
    expect(output).toBe(expectedOutput);
  });

  it('should print a formatted table with multiple entries', () => {
    const testData = [
      {
        identifier: 'rule-A',
        timeMs: '100 ms',
        rawTimeMs: 100,
        relativePercent: '50.0%',
        warningCount: '0',
        errorCount: '0',
        fixable: true,
        manuallyFixable: false,
      },
      {
        identifier: 'rule-B',
        timeMs: '100 ms',
        rawTimeMs: 100,
        relativePercent: '50.0%',
        warningCount: '0',
        errorCount: '0',
        fixable: true,
        manuallyFixable: false,
      },
    ];
    renderTable(testData, { headers: ['Rule', 'Time (ms)', '%'] });
    const output = consoleSpy.mock.calls[0][0] as string;
    const expectedOutput = [
      'Rule   | Time (ms) | %    ',
      ':-----|:---------|------:',
      'rule-A | 100 ms    | 50.0%',
      'rule-B | 100 ms    | 50.0%',
    ].join('\n');
    expect(output).toBe(expectedOutput);
  });

  it('should print a formatted table with nested entries', () => {
    const testData = [
      {
        identifier: 'file-A',
        timeMs: '200 ms',
        rawTimeMs: 200,
        relativePercent: '100.0%',
        warningCount: '0',
        errorCount: '0',
        fixable: true,
        manuallyFixable: false,
        children: [
          {
            identifier: 'rule-A',
            timeMs: '100 ms',
            rawTimeMs: 100,
            relativePercent: '50.0%',
            warningCount: '0',
            errorCount: '0',
            fixable: true,
            manuallyFixable: false,
          },
          {
            identifier: 'rule-B',
            timeMs: '100 ms',
            rawTimeMs: 100,
            relativePercent: '50.0%',
            warningCount: '0',
            errorCount: '0',
            fixable: true,
            manuallyFixable: false,
          },
        ],
      },
    ];
    renderTable(testData, { headers: ['Rule', 'Time (ms)', '%'] });
    const output = consoleSpy.mock.calls[0][0] as string;
    const expectedOutput = [
      'Rule     | Time (ms) | %     ',
      ':--------|:---------|-------:',
      '  rule-A   | 100 ms    | 50.0%',
      '  rule-B   | 100 ms    | 50.0%',
    ].join('\n');
    expect(output).toBe(expectedOutput);
  });

  it('should correctly align columns based on content width', () => {
    const testData = [
      {
        identifier: 'a-very-long-rule-name',
        timeMs: '10.123 ms',
        rawTimeMs: 10.123,
        relativePercent: '18.8%',
        warningCount: '0',
        errorCount: '0',
        fixable: true,
        manuallyFixable: false,
      },
    ];
    renderTable(testData, { headers: ['Rule', 'Time (ms)', '%'] });
    const output = consoleSpy.mock.calls[0][0] as string;
    const expectedOutput = [
      'Rule                  | Time (ms) | %    ',
      ':---------------------|:---------|------:',
      'a-very-long-rule-name | 10.123 ms | 18.8%',
    ].join('\n');
    expect(output).toBe(expectedOutput);
  });

  it('should handle empty data array', () => {
    const testData = [];
    renderTable(testData);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith('No data to display.');
  });

  it('should handle entries with empty children array', () => {
    const testData = [
      {
        identifier: 'file-A',
        timeMs: '200 ms',
        rawTimeMs: 200,
        relativePercent: '100.0%',
        warningCount: '0',
        errorCount: '0',
        fixable: true,
        manuallyFixable: false,
        children: [],
      },
    ];
    renderTable(testData, { headers: ['Rule', 'Time (ms)', '%'] });
    const output = consoleSpy.mock.calls[0][0] as string;
    const expectedOutput = [
      'Rule   | Time (ms) | %     ',
      ':-----|:---------|-------:',
      'file-A | 200 ms    | 100.0%',
    ].join('\n');
    expect(output).toBe(expectedOutput);
  });
});
