import {
  createProcessEslintResultVisitor,
  processEslintResults,
} from './eslint-result.visitor';
import type { ESLint } from 'eslint';
import { describe, it, expect } from 'vitest';
import { ProcessEslintResultVisitor } from '../stats';

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
  it('should visitFile and getResults', () => {
    const visitor =
      createProcessEslintResultVisitor() as ProcessEslintResultVisitor & {
        visitFile: (file: ESLint.LintResult) => void;
      };

    expect(visitor.visitFile).toBeDefined();
    expect(visitor.visitFile(file1)).toBeUndefined();

    expect(visitor.getResults()).toStrictEqual(
      expect.objectContaining({
        totalFiles: 1,
        totalRules: 0,
        processedFileResults: [
          expect.objectContaining({
            filePath: 'file1.js',
          }),
        ],
      })
    );

    expect(
      visitor.visitRule({
        ruleId: 'no-unused-vars',
        messages: [messageNoUnusedVars],
        timeMs: statsNoUnusedVars['no-unused-vars'].total,
      })
    ).toBeUndefined();

    expect(visitor.getResults()).toStrictEqual(
      expect.objectContaining({
        totalFiles: 1,
        totalRules: 1,
        processedFileResults: [
          expect.objectContaining({
            filePath: 'file1.js',
            rules: [
              expect.objectContaining({
                ruleId: 'no-unused-vars',
              }),
            ],
          }),
        ],
      })
    );

    expect(visitor.visitMessage(messageNoUnusedVars)).toBeUndefined();

    expect(visitor.getResults()).toStrictEqual({
      totalFiles: 1,
      totalRules: 1,
      totalErrors: 1,
      totalWarnings: 0,
      totalFixableErrors: 0,
      totalFixableWarnings: 0,
      totalFileErrors: 0,
      totalFileWarnings: 0,
      totalTimeMs: 100,
      processedFileResults: [
        {
          filePath: 'file1.js',
          parseMs: 10,
          rulesMs: 40,
          fixMs: 40,
          totalMs: 100,
          totalErrors: 0,
          totalWarnings: 0,
          fixableErrors: 0,
          fixableWarnings: 0,
          rules: [
            {
              ruleId: 'no-unused-vars',
              timeMs: 20,
              errors: 1,
              warnings: 0,
              fixable: false,
            },
          ],
        },
      ],
    });
  });

  it('should properly extract timing data from ESLint stats', () => {
    const visitor = createProcessEslintResultVisitor();

    if (visitor.visitFile) {
      visitor.visitFile(file1);
    }
    const result = visitor.getResults();

    expect(result.processedResults[0]).toEqual(
      expect.objectContaining({
        parseMs: 10, // from stats.times.passes[0].parse.total
        fixMs: 40, // from stats.times.passes[0].fix.total
        totalMs: 100, // from stats.times.passes[0].total
        rulesMs: 40, // calculated from rules timing (20+20)
      })
    );
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

    const visitor = createProcessEslintResultVisitor();
    if (visitor.visitFile) {
      visitor.visitFile(fileWithoutStats);
    }
    const result = visitor.getResults();

    expect(result.processedResults[0]).toEqual(
      expect.objectContaining({
        parseMs: 0,
        rulesMs: 0,
        fixMs: 0,
        totalMs: 0,
      })
    );
  });
});

describe('processEslintResults', () => {
  it('should process violations and organize by file and rule', () => {
    expect(processEslintResults([file1])).toStrictEqual({
      totalFiles: 1,
      totalRules: 2,
      totalErrors: 1,
      totalWarnings: 1,
      totalFixableErrors: 0,
      totalFixableWarnings: 0,
      totalFileErrors: 0,
      totalFileWarnings: 0,
      totalTimeMs: 100,
      processedFileResults: [
        {
          filePath: 'file1.js',
          parseMs: 10,
          rulesMs: 40,
          fixMs: 40,
          totalMs: 100,
          totalErrors: 0,
          totalWarnings: 0,
          fixableErrors: 0,
          fixableWarnings: 0,
          rules: [
            {
              ruleId: 'no-unused-vars',
              timeMs: 20,
              errors: 1,
              warnings: 0,
              fixable: false,
            },
            {
              ruleId: 'no-console',
              timeMs: 20,
              errors: 0,
              warnings: 1,
              fixable: false,
            },
          ],
        },
      ],
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

    expect(result.totalTimeMs).toBe(150); // 100 + 50
    expect(result.processedResults).toHaveLength(2);
    expect(result.processedResults[1]).toEqual(
      expect.objectContaining({
        filePath: 'file2.js',
        parseMs: 5,
        rulesMs: 0,
        fixMs: 15,
        totalMs: 50,
      })
    );
  });
});
