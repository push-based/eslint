import type { ESLint } from 'eslint';
import { EslintResultVisitor } from './eslint-result-visitor';

type ESLintResult = ESLint.LintResult;

export interface WalkOptions {
  // Stop walking if visitor returns false
  // Good for:
  // - Early termination: Stop when you find what you're looking for
  // - Conditional processing: Stop on error conditions
  stopOnFalse?: boolean;
}

/**
 * Walks through parsed ESLint data and calls visitor methods
 */
export function walkEslintResult(
  parsedResults: ESLintResult[],
  visitor: EslintResultVisitor,
  options: WalkOptions = {}
): void {
  const { stopOnFalse = false } = options;

  for (const fileResult of parsedResults) {
    if (visitor.visitFile) {
      const result = visitor.visitFile(fileResult);
      // early exit in files if stopOnFalse is true
      if (result === false && stopOnFalse) break;
    }

    const messages = fileResult.messages || [];
    for (const message of messages) {
      if (visitor.visitMessage) {
        const result = visitor.visitMessage(message, fileResult);
        // early exit in messages if stopOnFalse is true
        if (result === false && stopOnFalse) {
          return;
        }
      }
    }

    if (visitor.visitRule) {
      const ruleStatsMap: Record<string, { total?: number }> =
        fileResult.stats?.times?.passes?.[0]?.rules || {};
      const allRuleIds = new Set([
        ...messages.filter((msg) => msg.ruleId).map((msg) => msg.ruleId!),
        ...Object.keys(ruleStatsMap),
      ]);

      for (const ruleId of allRuleIds) {
        const stats = ruleStatsMap[ruleId];
        const ruleMessages = messages.filter((msg) => msg.ruleId === ruleId);

        const ruleData: RuleVisitData = {
          ruleId,
          messages: ruleMessages,
          timeMs: stats?.total || 0,
        };

        const result = visitor.visitRule(ruleData, fileResult);
        // early exit in rules if stopOnFalse is true
        if (result === false && stopOnFalse) {
          return;
        }
      }
    }
  }
}
