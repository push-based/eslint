import { ESLint, Linter } from 'eslint';
import {
  EslintResultVisitor,
  FileStatsNode,
  RuleStatsNode,
  RootStatsNode,
  StopOnFalseWalkOptions,
} from './eslint-result-visitor';

type ESLintResult = ESLint.LintResult;
type ESLintMessage = Linter.LintMessage;

export function walkEslintResult(
  parsed: ESLintResult[],
  visitor: EslintResultVisitor,
  { stopOnFalse = false }: StopOnFalseWalkOptions = {}
): RootStatsNode {
  const files: FileStatsNode[] = [];

  outer: for (const res of parsed) {
    const pass = res.stats?.times.passes?.[0];
    const total = pass?.total ?? 0;
    const fix = pass?.fix?.total ?? 0;
    const parse = pass?.parse?.total ?? 0;

    const file: FileStatsNode = {
      type: 'file',
      identifier: res.filePath,
      errorCount: res.errorCount,
      fatalErrorCount: res.fatalErrorCount ?? 0,
      warningCount: res.warningCount,
      fixableErrorCount: res.fixableErrorCount,
      fixableWarningCount: res.fixableWarningCount,
      fixPasses: res.source ? 1 : 0,
      totalTime: total,
      timePct: 0,
      fixTime: fix,
      parseTime: parse,
      rulesTime: 0,
      children: [],
    };

    if (visitor.visitFile?.(file) === false && stopOnFalse) break;

    for (const msg of res.messages || []) {
      if (visitor.visitMessage?.(msg, file) === false && stopOnFalse) {
        break outer;
      }
    }

    if (visitor.visitRule) {
      // build time+message map
      const info = new Map<
        string,
        { totalTime: number; errs: ESLintMessage[]; warns: ESLintMessage[] }
      >();
      for (const [rid, ts] of Object.entries(pass?.rules || {})) {
        info.set(rid, { totalTime: ts.total ?? 0, errs: [], warns: [] });
      }
      for (const msg of res.messages || []) {
        if (!msg.ruleId) continue;
        const rec = info.get(msg.ruleId) ?? {
          totalTime: 0,
          errs: [],
          warns: [],
        };
        (msg.severity === 2 ? rec.errs : rec.warns).push(msg);
        info.set(msg.ruleId, rec);
      }

      for (const [rid, { totalTime, errs, warns }] of info) {
        const node: RuleStatsNode = {
          type: 'rule',
          identifier: rid,
          errorCount: errs.length,
          warningCount: warns.length,
          totalTime,
          timePct: 0,
        };
        file.rulesTime += totalTime;
        file.children.push(node);

        if (visitor.visitRule(node, file) === false && stopOnFalse) {
          break outer;
        }
      }
    }

    files.push(file);
  }

  return { type: 'root', children: files };
}
