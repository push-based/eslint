import { ProcessedFileResult, ProcessedRuleResult } from '../../../stats';
import { groupByFile, groupByRule } from '../../../stats/grouping';
import { ProcessedEslintRulesStats } from '../../../parse/processed-eslint-result.types';
import { groupByOptions, InteractiveState } from './scene-state';

export function getRowsToRender(
  detailedStats: ProcessedEslintRulesStats,
  state: InteractiveState
): { processedFileResults: (ProcessedFileResult | ProcessedRuleResult)[] } {
  const { groupByIndex } = state;
  const groupBy = groupByOptions[groupByIndex];

  let groupedData: (ProcessedFileResult | ProcessedRuleResult)[] = [];
  switch (groupBy) {
    case 'file':
      const { processedResults: fileResults } = groupByFile(detailedStats);
      groupedData = fileResults as unknown as (
        | ProcessedFileResult
        | ProcessedRuleResult
      )[];
      break;
    case 'file-rule':
      //  groupedData = groupByFileAndRule(statsWithRelativePercents);
      break;
    case 'rule':
    default:
      const { processedResults: ruleResults } = groupByRule(detailedStats);
      groupedData = ruleResults as unknown as (
        | ProcessedFileResult
        | ProcessedRuleResult
      )[];
      break;
  }

  return {
    processedFileResults: groupedData,
  };
}
