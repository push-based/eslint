import { z } from 'zod';
export { z };

// Helper function to determine if a file is a test file
export function isTestFile(filePath: string): boolean {
  if (!filePath) return false;
  const lowerPath = filePath.toLowerCase();
  return lowerPath.includes('.test.') || lowerPath.includes('.spec.');
}

// Schemas for parsing raw ESLint lint results
const rulePerfStatsSchema = z
  .object({
    total: z.number().optional(),
    fixable: z.union([z.number(), z.boolean()]).optional(),
  })
  .passthrough();

const eslintMessageSchema = z
  .object({
    ruleId: z.string().nullable(),
    severity: z.number(), // ESLint uses 0, 1, 2
    fix: z.object({}).passthrough().optional(),
    suggestions: z.array(z.object({}).passthrough()).optional(),
  })
  .passthrough();

const lintResultSchema = z
  .object({
    filePath: z.string(),
    messages: z.array(eslintMessageSchema),
    stats: z
      .object({
        times: z
          .object({
            passes: z
              .array(
                z
                  .object({
                    rules: z
                      .object({})
                      .catchall(rulePerfStatsSchema)
                      .optional(),
                  })
                  .optional()
              )
              .optional(),
          })
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const lintResultsSchema = z.array(lintResultSchema);
type RawLintResult = z.infer<typeof lintResultSchema>;

// Schema for the aggregated rule data after processing
export const reducedRuleSchema = z.object({
  identifier: z.string(),
  timeMs: z.number(),
  everFixableCli: z.boolean(),
  everManuallyFixable: z.boolean(),
  severities: z.array(z.enum(['warning', 'error'])),
  occurredInTestFiles: z.boolean(),
  occurredInNonTestFiles: z.boolean(),
});

export type ReducedRule = z.infer<typeof reducedRuleSchema>;

export const ReducedRuleArraySchema = z.array(reducedRuleSchema);

export const DetailedRuleStatSchema = z.object({
  filePath: z.string(),
  ruleId: z.string(),
  timeMs: z.number(),
  fixable: z.boolean(),
  manuallyFixable: z.boolean(),
  severity: z.number(), // 0,1,2
  isTestFile: z.boolean(),
});
export type DetailedRuleStat = z.infer<typeof DetailedRuleStatSchema>;

function processRawResultsToDetailed(
  lintResults: RawLintResult[]
): DetailedRuleStat[] {
  const allStats: DetailedRuleStat[] = [];

  for (const fileResult of lintResults) {
    const fileIsTest = isTestFile(fileResult.filePath);
    const ruleTimes: Record<string, number> = {};
    const ruleFixable: Record<string, boolean> = {};

    // First, gather all timing and CLI fixability info from stats
    const ruleStatsMap = fileResult.stats?.times?.passes?.[0]?.rules;
    if (ruleStatsMap) {
      for (const [ruleId, rulePerfStats] of Object.entries(ruleStatsMap)) {
        ruleTimes[ruleId] = rulePerfStats?.total || 0;
        ruleFixable[ruleId] = !!rulePerfStats?.fixable;
      }
    }

    const seenInMessages = new Set<string>();

    // Process messages to gather detailed info
    for (const message of fileResult.messages) {
      if (!message.ruleId) continue;

      allStats.push({
        filePath: fileResult.filePath,
        ruleId: message.ruleId,
        timeMs: ruleTimes[message.ruleId] || 0,
        fixable: ruleFixable[message.ruleId] || !!message.fix,
        manuallyFixable: !!message.suggestions?.length,
        severity: message.severity,
        isTestFile: fileIsTest,
      });
      seenInMessages.add(message.ruleId);
    }

    // Add entries for rules that had timing info but no messages
    for (const ruleId of Object.keys(ruleTimes)) {
      if (!seenInMessages.has(ruleId)) {
        allStats.push({
          filePath: fileResult.filePath,
          ruleId: ruleId,
          timeMs: ruleTimes[ruleId],
          fixable: ruleFixable[ruleId] || false,
          manuallyFixable: false,
          severity: 0, // No severity as there's no message
          isTestFile: fileIsTest,
        });
      }
    }
  }

  return allStats;
}

export const DetailedRuleStatsSchema = lintResultsSchema.transform(
  processRawResultsToDetailed
);

/**
 * Aggregates raw ESLint lint results into a structured format.
 * @param lintResults - An array of raw lint results from ESLint.
 * @returns An array of aggregated rule data.
 */
function aggregateEslintData(lintResults: RawLintResult[]): ReducedRule[] {
  const aggregatedRuleData = new Map<string, ReducedRule>();

  // Helper to initialize or get a rule's details from the map
  const getRuleDetails = (ruleId: string): ReducedRule => {
    let details = aggregatedRuleData.get(ruleId);
    if (!details) {
      details = {
        identifier: ruleId,
        timeMs: 0,
        everFixableCli: false,
        everManuallyFixable: false,
        severities: [],
        occurredInTestFiles: false,
        occurredInNonTestFiles: false,
      };
      aggregatedRuleData.set(ruleId, details);
    }
    return details;
  };

  for (const fileResult of lintResults) {
    const fileIsTest = isTestFile(fileResult.filePath);

    // Process timing information and CLI fixability from rule stats
    const ruleStatsMap = fileResult.stats?.times?.passes?.[0]?.rules;
    if (ruleStatsMap) {
      for (const [ruleId, rulePerfStats] of Object.entries(ruleStatsMap)) {
        const details = getRuleDetails(ruleId);
        details.timeMs += rulePerfStats?.total || 0;
        details.everFixableCli =
          details.everFixableCli || !!rulePerfStats?.fixable;

        if (fileIsTest) {
          details.occurredInTestFiles = true;
        } else {
          details.occurredInNonTestFiles = true;
        }
      }
    }

    // Process messages for severity, manual fixability, and to confirm occurrences
    for (const message of fileResult.messages) {
      if (!message.ruleId) continue; // Skip messages without a ruleId

      const details = getRuleDetails(message.ruleId);

      const warningSeverity = 'warning';
      const errorSeverity = 'error';

      if (
        message.severity === 1 &&
        !details.severities.includes(warningSeverity)
      ) {
        details.severities.push(warningSeverity);
      }
      if (
        message.severity === 2 &&
        !details.severities.includes(errorSeverity)
      ) {
        details.severities.push(errorSeverity);
      }

      details.everFixableCli = details.everFixableCli || !!message.fix;
      details.everManuallyFixable =
        details.everManuallyFixable || !!message.suggestions?.length;

      // Ensure occurrence flags are set even if timing data was missing for this rule in this file
      if (fileIsTest) {
        details.occurredInTestFiles = true;
      } else {
        details.occurredInNonTestFiles = true;
      }
    }
  }
  return Array.from(aggregatedRuleData.values());
}

export function processEslintData(lintResults: RawLintResult[]): ReducedRule[] {
  const fileData = new Map<string, ReducedRule>();

  for (const fileResult of lintResults) {
    const fileIsTest = isTestFile(fileResult.filePath);
    const filePath = fileResult.filePath;

    if (!fileData.has(filePath)) {
      fileData.set(filePath, {
        identifier: filePath,
        timeMs: 0,
        everFixableCli: false,
        everManuallyFixable: false,
        severities: [],
        occurredInTestFiles: fileIsTest,
        occurredInNonTestFiles: !fileIsTest,
      });
    }
    const fileEntry = fileData.get(filePath);
    if (!fileEntry) {
      // This should not happen based on the logic above, but it satisfies TypeScript
      continue;
    }

    const ruleStatsMap = fileResult.stats?.times?.passes?.[0]?.rules;
    if (ruleStatsMap) {
      for (const [, rulePerfStats] of Object.entries(ruleStatsMap)) {
        fileEntry.timeMs += rulePerfStats?.total || 0;
        fileEntry.everFixableCli =
          fileEntry.everFixableCli || !!rulePerfStats?.fixable;
      }
    }

    for (const message of fileResult.messages) {
      if (!message.ruleId) continue;

      const warningSeverity = 'warning';
      const errorSeverity = 'error';

      if (
        message.severity === 1 &&
        !fileEntry.severities.includes(warningSeverity)
      ) {
        fileEntry.severities.push(warningSeverity);
      }
      if (
        message.severity === 2 &&
        !fileEntry.severities.includes(errorSeverity)
      ) {
        fileEntry.severities.push(errorSeverity);
      }

      fileEntry.everFixableCli = fileEntry.everFixableCli || !!message.fix;
      fileEntry.everManuallyFixable =
        fileEntry.everManuallyFixable || !!message.suggestions?.length;
    }
  }
  return Array.from(fileData.values());
}

export const ParsedEslintStatsSchema = lintResultsSchema
  .transform(aggregateEslintData)
  .pipe(ReducedRuleArraySchema);

export const ProcessedFileStatsSchema =
  lintResultsSchema.transform(processEslintData);

export const FileRuleStatSchema = reducedRuleSchema.extend({
  filePath: z.string(),
});
export type FileRuleStat = z.infer<typeof FileRuleStatSchema>;

function processForFileRule(lintResults: RawLintResult[]): FileRuleStat[] {
  const processedData: FileRuleStat[] = [];
  for (const fileResult of lintResults) {
    const fileIsTest = isTestFile(fileResult.filePath);
    const ruleStatsMap = fileResult.stats?.times?.passes?.[0]?.rules;
    if (ruleStatsMap) {
      for (const [ruleId, rulePerfStats] of Object.entries(ruleStatsMap)) {
        processedData.push({
          identifier: ruleId,
          filePath: fileResult.filePath,
          timeMs: rulePerfStats?.total || 0,
          everFixableCli: !!rulePerfStats?.fixable,
          everManuallyFixable: false, // This info is in messages
          severities: [], // This info is in messages
          occurredInTestFiles: fileIsTest,
          occurredInNonTestFiles: !fileIsTest,
        });
      }
    }
  }
  return processedData;
}
export const ParsedFileAndRuleStatsSchema =
  lintResultsSchema.transform(processForFileRule);

// Schemas related to TimeEntry, potentially for other parts of the application

// Base schema for core timing and count properties
export const TimeEntryCoreSchema = z.object({
  identifier: z.string(),
  timeMs: z.number(),
  warningCount: z.number(),
  errorCount: z.number(),
  fixable: z.boolean().optional(),
  manuallyFixable: z.boolean().optional(),
});

// TimeEntrySchema: Extends the core schema with recursive children
export const TimeEntrySchema: z.ZodType<TimeEntry> = z.lazy(() =>
  TimeEntryCoreSchema.extend({
    children: z.array(TimeEntrySchema).optional(),
  })
);

// Explicit type for TimeEntry for clarity and use in ZodType
export type TimeEntry = z.infer<typeof TimeEntryCoreSchema> & {
  children?: TimeEntry[];
};

// ProcessedTimeEntrySchema: Extends the core schema with relativePercent and its own recursive children
export const processedTimeEntrySchema: z.ZodType<ProcessedTimeEntry> = z.lazy(
  () =>
    TimeEntryCoreSchema.extend({
      relativePercent: z.number(),
      children: z.array(processedTimeEntrySchema).optional(), // Recursive children of ProcessedTimeEntry
    }).transform((entry) => {
      // Normalize timeMs to be non-negative.
      // This transform is applied recursively to all children by Zod's lazy schema handling.
      entry.timeMs = Math.max(0, entry.timeMs);
      return entry;
    })
);

// Explicit type for ProcessedTimeEntry
export type ProcessedTimeEntry = z.infer<typeof TimeEntryCoreSchema> & {
  relativePercent: number;
  children?: ProcessedTimeEntry[];
};
