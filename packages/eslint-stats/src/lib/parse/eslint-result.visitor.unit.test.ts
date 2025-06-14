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
      times: { total: 0 },
      files: [],
    });
  });
});

describe('processEslintResults', () => {
  it('should process violations and organize by file and rule', () => {
    const processedResult = processEslintResults([file1]);
    expect(processedResult.files[0].filePath).toBe('file1.js');
    expect(processedResult.files[0].rules.length).toBe(2);
    expect(processedResult.times.total).toBe(100);
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
    expect(result.files[0].filePath).toBe('file-no-stats.js');
    expect(result.files[0].times.total).toBe(0);
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
    expect(result.files[1].filePath).toBe('file2.js');
    expect(result.files[1].times.total).toBe(50);
    expect(result.times.total).toBe(150);
  });
});
