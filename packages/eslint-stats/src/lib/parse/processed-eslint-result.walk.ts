import type { ProcessedEslintResultVisitor } from './processed-eslint-result-visitor';
import type {
  ProcessedEslintRulesStats,
  ProcessedFileResult,
} from './processed-eslint-result.types';
import type { StopOnFalseWalkOptions } from './walk.types';

export function walkProcessedEslintFiles(
  processedFileResults: ProcessedFileResult[],
  visitor: ProcessedEslintResultVisitor,
  options: StopOnFalseWalkOptions = {}
): void {
  const { stopOnFalse = false } = options;

  for (const fileResult of processedFileResults) {
    if (visitor.visitFile) {
      const shouldSkipFile = visitor.visitFile(fileResult);
      if (shouldSkipFile === false) {
        if (stopOnFalse) break;
        continue;
      }
    }

    for (const ruleResult of fileResult.rules) {
      if (visitor.visitRule) {
        const shouldSkipRule = visitor.visitRule(ruleResult, fileResult);
        if (shouldSkipRule === false) {
          if (stopOnFalse) return;
          continue;
        }
      }
    }
  }
}

export function walkProcessedEslintRulesStats(
  processedEslintRulesStats: ProcessedEslintRulesStats,
  visitor: ProcessedEslintResultVisitor,
  options: StopOnFalseWalkOptions = {}
): void {
  const { stopOnFalse = false } = options;

  const { processedResults: processedFileResults, ...stats } =
    processedEslintRulesStats;

  if (visitor.visitStats) {
    visitor.visitStats(stats);
  }

  for (const fileResult of processedFileResults) {
    if (visitor.visitFile) {
      const shouldSkipFile = visitor.visitFile(fileResult);
      if (shouldSkipFile === false) {
        if (stopOnFalse) break;
        continue;
      }
    }

    for (const ruleResult of fileResult.rules) {
      if (visitor.visitRule) {
        const shouldSkipRule = visitor.visitRule(ruleResult, fileResult);
        if (shouldSkipRule === false) {
          if (stopOnFalse) return;
          continue;
        }
      }
    }
  }
}
