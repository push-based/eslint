import {
  formatAggregatedTimesForDisplay,
  FormattedDisplayEntry,
} from '../../../reporting/format';
import { AnalyseArgs } from './analyse.command';
import {
  DetailedRuleStat,
  TimeEntry,
  ProcessedTimeEntry,
} from '../../../models/eslint-stats.schema';
import { getFirst, sortRules } from '../../../stats';
import { calculateMsAndRelativePercent } from '../../../stats';
import { groupByFile, groupByFileAndRule, groupByRule } from '../../../stats';

type DetailedRuleStats = DetailedRuleStat[];

export type GetRowsToRenderArgs = Pick<
  AnalyseArgs,
  'groupBy' | 'sortBy' | 'take' | 'show'
> & {
  sortOrder: 'asc' | 'desc';
};

export function getRowsToRender(
  detailedStats: DetailedRuleStats,
  args: GetRowsToRenderArgs
): ProcessedTimeEntry[] {
  const { groupBy, sortBy, sortOrder, take } = args;

  let groupedData: TimeEntry[];
  switch (groupBy) {
    case 'file':
      groupedData = groupByFile(detailedStats);
      break;
    case 'file-rule':
      groupedData = groupByFileAndRule(detailedStats);
      break;
    case 'rule':
    default:
      groupedData = groupByRule(detailedStats);
      break;
  }

  const processedData = calculateMsAndRelativePercent(groupedData);

  const sortedData = sortRules(processedData, {
    key: sortBy as 'time' | 'violations',
    order: sortOrder,
  });

  const topEntries = getFirst(
    sortedData,
    take?.map((n) => Number(n))
  );

  return topEntries;
}
