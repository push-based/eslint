import { walkEslintResult } from './eslint-result.walk';
import type { ESLint } from 'eslint';
import { describe, it, expect, vi } from 'vitest';

describe('walkEslintResult', () => {
  it('should visit files, messages, and rules', () => {
    const mockResults: ESLint.LintResult[] = [
      {
        filePath: 'test.js',
        messages: [
          {
            ruleId: 'no-unused-vars',
            severity: 2,
            message: 'unused var',
            line: 1,
            column: 1,
            nodeType: 'Identifier',
          },
        ],
        errorCount: 1,
        fatalErrorCount: 0,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
        source: '',
        usedDeprecatedRules: [],
      } as unknown as ESLint.LintResult,
    ];

    const visitor = {
      visitFile: vi.fn(),
      visitMessage: vi.fn(),
      visitRule: vi.fn(),
    };
    walkEslintResult(mockResults, visitor);

    expect(visitor.visitFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: 'test.js',
        violations: expect.objectContaining({
          errorCount: 1,
          fatalErrorCount: 0,
          warningCount: 0,
          fixableErrorCount: 0,
          fixableWarningCount: 0,
        }),
        times: expect.objectContaining({
          parse: 0,
          fix: 0,
          total: 0,
          rules: {},
        }),
        rules: [],
      })
    );
    expect(visitor.visitFile).toHaveBeenCalledTimes(1);
    expect(visitor.visitMessage).toHaveBeenCalledWith(
      mockResults[0].messages[0],
      expect.objectContaining({ filePath: 'test.js' })
    );
    expect(visitor.visitMessage).toHaveBeenCalledTimes(1);
    expect(visitor.visitRule).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'no-unused-vars',
        violations: expect.objectContaining({
          errorMessages: [],
          warningMessages: [mockResults[0].messages[0]],
          offMessages: [],
        }),
        time: 0,
      }),
      expect.objectContaining({ filePath: 'test.js' })
    );
    expect(visitor.visitRule).toHaveBeenCalledTimes(1);
  });

  it('should stop early when visitor returns false and stopOnFalse is true', () => {
    const mockResults: ESLint.LintResult[] = [
      {
        filePath: 'test1.js',
        messages: [
          {
            ruleId: 'rule1',
            severity: 2,
            message: 'msg1',
            line: 1,
            column: 1,
            nodeType: 'Identifier',
          },
        ],
        errorCount: 1,
        fatalErrorCount: 0,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
        source: '',
        usedDeprecatedRules: [],
      } as unknown as ESLint.LintResult,
      {
        filePath: 'test2.js',
        messages: [
          {
            ruleId: 'rule2',
            severity: 2,
            message: 'msg2',
            line: 1,
            column: 1,
            nodeType: 'Identifier',
          },
        ],
        errorCount: 1,
        fatalErrorCount: 0,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
        source: '',
        usedDeprecatedRules: [],
      } as unknown as ESLint.LintResult,
    ];

    const visitor = {
      visitFile: vi.fn().mockReturnValueOnce(false),
      visitMessage: vi.fn(),
      visitRule: vi.fn(),
    };
    walkEslintResult(mockResults, visitor, { stopOnFalse: true });

    expect(visitor.visitFile).toHaveBeenCalledTimes(1);
    expect(visitor.visitMessage).toHaveBeenCalledTimes(0);
    expect(visitor.visitRule).toHaveBeenCalledTimes(0);
  });
});
