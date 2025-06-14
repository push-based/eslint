import { ESLint, Linter } from 'eslint';
import {
  EslintResultVisitor,
  ProcessedFile,
  ProcessedRule,
} from './eslint-result-visitor';
import { StopOnFalseWalkOptions } from './walk.types';
import TimePass = Linter.TimePass;

type ESLintResult = ESLint.LintResult;
type ESLintMessage = Linter.LintMessage;

export function walkEslintResult(
  parsedResults: ESLintResult[],
  visitor: EslintResultVisitor,
  options: StopOnFalseWalkOptions = {}
): void {
  const { stopOnFalse = false } = options;
  const fileMap = new Map<string, ProcessedFile>();

  for (const fileResult of parsedResults) {
    if (!fileMap.has(fileResult.filePath)) {
      const times = fileResult.stats?.times.passes.at(0) || ({} as TimePass);
      const fileVisitData: ProcessedFile = {
        filePath: fileResult.filePath,
        violations: {
          errorCount: fileResult.errorCount,
          fatalErrorCount: fileResult.fatalErrorCount,
          warningCount: fileResult.warningCount,
          fixableErrorCount: fileResult.fixableErrorCount,
          fixableWarningCount: fileResult.fixableWarningCount,
          fixPasses:
            fileResult.fixableErrorCount + fileResult.fixableWarningCount,
        },
        times: {
          parse: times.parse?.total || 0,
          rules: Object.entries(times.rules ?? {}).reduce(
            (acc, [ruleId, timeStats]) => {
              acc[ruleId] = timeStats.total || 0;
              return acc;
            },
            {} as Record<string, number>
          ),
          fix: times.fix?.total || 0,
          total: times?.total || 0,
        },
        rules: [],
      };

      fileMap.set(fileResult.filePath, fileVisitData);
    }
    const fileData = fileMap.get(fileResult.filePath) as ProcessedFile;
    if (visitor.visitFile) {
      const result = visitor.visitFile(fileData);
      // early exit in files if stopOnFalse is true
      if (result === false && stopOnFalse) break;
    }

    const messages = fileResult.messages || [];
    for (const message of messages) {
      if (visitor.visitMessage) {
        const result = visitor.visitMessage(message, fileData);
        // early exit in messages if stopOnFalse is true
        if (result === false && stopOnFalse) {
          return;
        }
      }
    }

    if (visitor.visitRule) {
      const ruleStatsMap: Record<string, number> = fileData.times.rules;
      const ruleMsgMap = messages.reduce<
        Record<
          string,
          {
            errorMessages: ESLintMessage[];
            warningMessages: ESLintMessage[];
            offMessages: ESLintMessage[];
          }
        >
      >((acc, msg) => {
        if (msg.ruleId) {
          if (!acc[msg.ruleId]) {
            acc[msg.ruleId] = {
              errorMessages: [],
              warningMessages: [],
              offMessages: [],
            };
          }
          // 0 === "off"
          // 1 === "warn"
          // 2 === "error"
          if (msg.severity === 1) {
            acc[msg.ruleId].errorMessages.push(msg);
          } else if (msg.severity === 2) {
            acc[msg.ruleId].warningMessages.push(msg);
          } else {
            acc[msg.ruleId].offMessages.push(msg);
          }
        }
        return acc;
      }, {});
      const allRuleIds: Set<string> = new Set([
        ...messages
          .filter((msg) => typeof msg.ruleId === 'string')
          .map((msg) => String(msg.ruleId)),
        ...Object.keys(ruleStatsMap),
      ]);

      for (const ruleId of allRuleIds) {
        const ruleData: ProcessedRule = {
          ruleId,
          violations: {
            errorMessages: ruleMsgMap[ruleId]?.errorMessages || [],
            warningMessages: ruleMsgMap[ruleId]?.warningMessages || [],
            offMessages: ruleMsgMap[ruleId]?.offMessages || [],
          },
          time: ruleStatsMap[ruleId] || 0,
        };

        const result = visitor.visitRule(ruleData, fileData);
        // early exit in rules if stopOnFalse is true
        if (result === false && stopOnFalse) {
          return;
        }
      }
    }
  }
}
