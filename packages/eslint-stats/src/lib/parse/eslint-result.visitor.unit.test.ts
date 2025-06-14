import {
  createProcessEslintResultVisitor,
  processEslintResults,
} from './eslint-result.visitor';
import type { ESLint } from 'eslint';
import { describe, it, expect } from 'vitest';

const messageNoUnusedVars = {
  ruleId: 'no-unused-vars',
  message: 'error',
  severity: 2 as const,
  line: 1,
  column: 1,
  nodeType: 'Identifier',
};

const statsNoUnusedVars = {
  ['no-unused-vars']: { total: 20 },
};

const messageNoConsole = {
  ruleId: 'no-console',
  message: 'warning',
  severity: 1 as const,
  line: 2,
  column: 1,
  nodeType: 'CallExpression',
};

const statsNoConsole = {
  ['no-console']: { total: 20 },
};

const file1: ESLint.LintResult = {
  filePath: 'file1.js',
  messages: [messageNoUnusedVars, messageNoConsole],
  errorCount: 0,
  warningCount: 0,
  fixableErrorCount: 0,
  fixableWarningCount: 0,
  suppressedMessages: [],
  fatalErrorCount: 0,
  usedDeprecatedRules: [],
  stats: {
    fixPasses: 0,
    times: {
      passes: [
        {
          parse: { total: 10 },
          fix: { total: 40 },
          total: 100,
          rules: {
            ...statsNoUnusedVars,
            ...statsNoConsole,
          },
        },
      ],
    },
  },
};

describe('createProcessEslintResultVisitor', () => {
  it('should create a visitor with proper methods', () => {
    const visitor = createProcessEslintResultVisitor();

    expect(visitor.visitFile).toBeDefined();
    expect(visitor.visitMessage).toBeDefined();
    expect(visitor.visitRule).toBeDefined();
    expect(visitor.getResults).toBeDefined();
  });

  it('should return results with the correct structure', () => {
    const visitor = createProcessEslintResultVisitor();
    const result = visitor.getResults();

    expect(result).toEqual({
      violations: {},
      times: {},
      files: [],
    });
  });
});

describe('processEslintResults', () => {
  it('should process violations and organize by file and rule', () => {
    expect(processEslintResults([file1])).toStrictEqual([
      {
        filePath: 'file1.js',
        times: {
          parse: 10,
          fix: 40,
          total: 100,
          rules: {
            'no-unused-vars': 20,
            'no-console': 20,
          },
        },
        violations: {
          errorCount: 0,
          warningCount: 0,
          fixableErrorCount: 0,
          fixableWarningCount: 0,
          fatalErrorCount: 0,
          fixPasses: 0,
        },
        rules: [
          {
            ruleId: 'no-unused-vars',
            time: 20,
            violations: {
              warningMessages: [
                {
                  ruleId: 'no-unused-vars',
                  severity: 2,
                },
              ],
            },
          },
          {
            ruleId: 'no-console',
            time: 20,
            violations: {
              errorMessages: [
                {
                  ruleId: 'no-console',
                  severity: 1,
                },
              ],
            },
          },
        ],
      },
    ]);
  });

  it('should handle missing timing stats gracefully', () => {
    const fileWithoutStats: ESLint.LintResult = {
      filePath: 'file-no-stats.js',
      messages: [],
      errorCount: 0,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
      suppressedMessages: [],
      fatalErrorCount: 0,
      usedDeprecatedRules: [],
      // No stats property
    };

    const result = processEslintResults([fileWithoutStats]);

    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toEqual({
      filePath: 'file-no-stats.js',
      times: {
        parse: 0,
        fix: 0,
        total: 0,
        rules: {},
      },
    });
  });

  it('should properly calculate timing totals across multiple files', () => {
    const file2: ESLint.LintResult = {
      filePath: 'file2.js',
      messages: [],
      errorCount: 0,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
      suppressedMessages: [],
      fatalErrorCount: 0,
      usedDeprecatedRules: [],
      stats: {
        fixPasses: 0,
        times: {
          passes: [
            {
              parse: { total: 5 },
              fix: { total: 15 },
              total: 50,
              rules: {},
            },
          ],
        },
      },
    };

    const result = processEslintResults([file1, file2]);

    expect(result.files).toHaveLength(2);
    expect(result.files[1]).toEqual({
      filePath: 'file2.js',
      times: {
        parse: 5,
        fix: 15,
        total: 50,
        rules: {},
      },
    });
  });
});
