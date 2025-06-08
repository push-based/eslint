import { z } from 'zod';

const minimalMessageSchema = z.object({
  ruleId: z.string().nullable(),
});

const minimalRuleStatsSchema = z.object({
  total: z.number().optional(),
});

const minimalLintResultSchema = z.object({
  messages: z.array(minimalMessageSchema),
  stats: z
    .object({
      times: z
        .object({
          passes: z
            .array(
              z.object({
                rules: z.record(minimalRuleStatsSchema).optional(),
              })
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export const minimalLintResultsSchema = z.array(minimalLintResultSchema);
