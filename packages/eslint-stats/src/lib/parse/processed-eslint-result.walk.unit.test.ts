import { walkProcessedEslintRulesStats } from './processed-eslint-result.walk';
import { ProcessedEslintRulesStats } from './processed-eslint-result.types';

describe('walkProcessedResults', () => {
  it('should visit files, messages, and rules', () => {
    const mockResults: ProcessedEslintRulesStats = {
      totalFiles: 1,
      totalRules: 1,
      totalTimeMs: 10,
      totalErrors: 1,
      totalWarnings: 0,
      totalFixableErrors: 0,
      totalFixableWarnings: 0,
      totalFileErrors: 1,
      totalFileWarnings: 0,
      processedResults: [
        {
          filePath: 'test.js',
          rules: [
            {
              ruleId: 'no-unused-vars',
              timeMs: 10,
              errors: 1,
              warnings: 0,
              fixable: false,
            },
          ],
          parseMs: 5,
          rulesMs: 4,
          fixMs: 1,
          totalMs: 10,
          totalErrors: 1,
          totalWarnings: 0,
          fixableErrors: 0,
          fixableWarnings: 0,
        },
      ],
    };

    const visitor = {
      visitStats: vi.fn(),
      visitFile: vi.fn(),
      visitMessage: vi.fn(),
      visitRule: vi.fn(),
    };
    walkProcessedEslintRulesStats(mockResults, visitor);

    expect(visitor.visitStats).toHaveBeenCalledWith({
      totalFiles: 1,
      totalRules: 1,
      totalTimeMs: 10,
      totalErrors: 1,
      totalWarnings: 0,
      totalFixableErrors: 0,
      totalFixableWarnings: 0,
      totalFileErrors: 1,
      totalFileWarnings: 0,
    });
    expect(visitor.visitStats).toHaveBeenCalledTimes(1);

    expect(visitor.visitFile).toHaveBeenCalledWith(
      mockResults.processedResults[0]
    );
    expect(visitor.visitFile).toHaveBeenCalledTimes(1);

    expect(visitor.visitRule).toHaveBeenCalledWith(
      mockResults.processedResults[0].rules[0],
      mockResults.processedResults[0]
    );
    expect(visitor.visitRule).toHaveBeenCalledTimes(1);
  });

  it('should stop early when visitor returns false and stopOnFalse is true', () => {
    const mockResults: ProcessedEslintRulesStats = {
      totalFiles: 1,
      totalRules: 1,
      totalTimeMs: 10,
      totalErrors: 1,
      totalWarnings: 0,
      totalFixableErrors: 0,
      totalFixableWarnings: 0,
      totalFileErrors: 1,
      totalFileWarnings: 0,
      processedResults: [
        {
          filePath: 'test1.js',
          rules: [
            {
              ruleId: 'rule1',
              timeMs: 10,
              errors: 1,
              warnings: 0,
              fixable: false,
            },
          ],
          parseMs: 10,
          rulesMs: 10,
          fixMs: 10,
          totalMs: 10,
          totalErrors: 1,
          totalWarnings: 0,
          fixableErrors: 0,
          fixableWarnings: 0,
        },
        {
          filePath: 'test2.js',
          rules: [
            {
              ruleId: 'rule2',
              timeMs: 10,
              errors: 1,
              warnings: 0,
              fixable: false,
            },
          ],
          parseMs: 5,
          rulesMs: 4,
          fixMs: 1,
          totalMs: 10,
          totalErrors: 1,
          totalWarnings: 0,
          fixableErrors: 0,
          fixableWarnings: 0,
        },
      ],
    };

    const visitor = {
      visitFile: vi.fn().mockReturnValueOnce(false),
      visitRule: vi.fn(),
    };
    walkProcessedEslintRulesStats(mockResults, visitor, { stopOnFalse: true });

    expect(visitor.visitFile).toHaveBeenCalledTimes(1);
    expect(visitor.visitRule).toHaveBeenCalledTimes(0);
  });
});
