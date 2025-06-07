import { readFileSync } from 'fs';
import {
  DetailedRuleStatsSchema,
  DetailedRuleStat,
} from '../models/eslint-stats.schema';

export function loadStats(file: string): DetailedRuleStat[] {
  let detailedStats: DetailedRuleStat[] = [];
  try {
    const jsonContent = readFileSync(file, 'utf-8');
    const lintResults = JSON.parse(jsonContent);

    if (
      Array.isArray(lintResults) &&
      lintResults.length > 0 &&
      !lintResults.some((result) => 'stats' in result && result.stats)
    ) {
      throw new Error(
        `The ESLint stats file seems to be missing performance data. ` +
          `Please make sure you generate it with the '--stats' flag, e.g., ` +
          `'eslint . --format json --output-file ${file} --stats'.`
      );
    }

    detailedStats = DetailedRuleStatsSchema.parse(lintResults);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error parsing file "${file}": ${error.message}`);
    } else {
      throw new Error(`An unknown error occurred while processing "${file}".`);
    }
  }

  return detailedStats;
}
