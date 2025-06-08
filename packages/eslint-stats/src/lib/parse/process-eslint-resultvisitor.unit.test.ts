import {
  ProcessEslintResultVisitor,
  processEslintResults,
} from './process-eslint-result.visitor';
import { walkEslintResult } from './eslint-result.walk';
import type { ESLint } from 'eslint';
import { describe, it, expect } from 'vitest';

describe('ProcessEslintResultVisitor', () => {
  it('should process violations and organize by file and rule', () => {
    const mockResults: ESLint.LintResult[] = [
      {
        filePath: 'file1.js',
        messages: [
          {
            ruleId: 'no-unused-vars',
            severity: 2,
            message: 'error',
            line: 1,
            column: 1,
            nodeType: 'Identifier',
          },
          {
            ruleId: 'no-console',
            severity: 1,
            message: 'warning',
            line: 2,
            column: 1,
            nodeType: 'CallExpression',
          },
        ],
        errorCount: 1,
        warningCount: 1,
        fixableErrorCount: 0,
        fixableWarningCount: 1,
      } as ESLint.LintResult,
    ];

    const visitor = new ProcessEslintResultVisitor();
    walkEslintResult(mockResults, visitor);
    const results = visitor.getResults();

    expect(results).toHaveLength(1);
    expect(results[0].filePath).toBe('file1.js');
    expect(results[0].errors).toBe(1);
    expect(results[0].warnings).toBe(1);
    expect(results[0].fixableWarnings).toBe(1);
    expect(results[0].rules).toHaveLength(2);
    expect(results[0].rules[0].ruleId).toBe('no-unused-vars');
    expect(results[0].rules[1].ruleId).toBe('no-console');
  });

  it('should process timing data from stats', () => {
    const mockResults: ESLint.LintResult[] = [
      {
        filePath: 'file1.js',
        messages: [],
        errorCount: 0,
        warningCount: 0,
        fatalErrorCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
        suppressedMessages: [],
        usedDeprecatedRules: [],
        stats: {
          times: {
            passes: [
              {
                rules: {
                  'no-unused-vars': { total: 10 },
                  'no-console': { total: 5 },
                },
              },
            ],
          },
        },
      } as unknown as ESLint.LintResult,
    ];

    const results = processEslintResults(mockResults);

    expect(results[0].timeMs).toBe(15);
    expect(results[0].rules[0].timeMs).toBe(10);
    expect(results[0].rules[1].timeMs).toBe(5);
  });
});
