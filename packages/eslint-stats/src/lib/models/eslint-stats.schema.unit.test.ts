import { describe, it, expect } from 'vitest';
import {
  reducedRuleSchema,
  DetailedRuleStatSchema,
  TimeEntryCoreSchema,
  processedTimeEntrySchema,
  type ReducedRule,
  type DetailedRuleStat,
  type TimeEntry,
  type ProcessedTimeEntry,
  ParsedEslintStatsSchema,
} from './eslint-stats.schema';

const statsData = [
  {
    filePath:
      '/Users/michael_hladky/WebstormProjects/eslint/packages/eslint-stats/mocks/fixtures/minimal-setup/clean-file.js',
    messages: [],
    suppressedMessages: [],
    errorCount: 0,
    fatalErrorCount: 0,
    warningCount: 0,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
    stats: {
      times: {
        passes: [
          {
            parse: { total: 4.883583 },
            rules: {
              'no-unused-vars': { total: 0.719207 },
              'no-console': { total: 0.036792000000000005 },
              semi: { total: 0.22908299999999995 },
              quotes: { total: 0.056375 },
            },
            fix: { total: 0 },
            total: 9.199917,
          },
        ],
      },
      fixPasses: 0,
    },
    usedDeprecatedRules: [
      {
        ruleId: 'semi',
        replacedBy: ['@stylistic/js/semi'],
        info: {
          message: 'Formatting rules are being moved out of ESLint core.',
          url: 'https://eslint.org/blog/2023/10/deprecating-formatting-rules/',
          deprecatedSince: '8.53.0',
          availableUntil: '10.0.0',
          replacedBy: [
            {
              message:
                'ESLint Stylistic now maintains deprecated stylistic core rules.',
              url: 'https://eslint.style/guide/migration',
              plugin: {
                name: '@stylistic/eslint-plugin-js',
                url: 'https://eslint.style/packages/js',
              },
              rule: { name: 'semi', url: 'https://eslint.style/rules/js/semi' },
            },
          ],
        },
      },
      {
        ruleId: 'quotes',
        replacedBy: ['@stylistic/js/quotes'],
        info: {
          message: 'Formatting rules are being moved out of ESLint core.',
          url: 'https://eslint.org/blog/2023/10/deprecating-formatting-rules/',
          deprecatedSince: '8.53.0',
          availableUntil: '10.0.0',
          replacedBy: [
            {
              message:
                'ESLint Stylistic now maintains deprecated stylistic core rules.',
              url: 'https://eslint.style/guide/migration',
              plugin: {
                name: '@stylistic/eslint-plugin-js',
                url: 'https://eslint.style/packages/js',
              },
              rule: {
                name: 'quotes',
                url: 'https://eslint.style/rules/js/quotes',
              },
            },
          ],
        },
      },
    ],
  },
  {
    filePath:
      '/Users/michael_hladky/WebstormProjects/eslint/packages/eslint-stats/mocks/fixtures/minimal-setup/eslint.config.mjs',
    messages: [],
    suppressedMessages: [],
    errorCount: 0,
    fatalErrorCount: 0,
    warningCount: 0,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
    stats: {
      times: {
        passes: [
          {
            parse: { total: 1.110792 },
            rules: {
              'no-unused-vars': { total: 0.023001 },
              'no-console': { total: 0.002624 },
              semi: { total: 0.031917 },
              quotes: { total: 0.07912500000000001 },
            },
            fix: { total: 0 },
            total: 1.566333,
          },
        ],
      },
      fixPasses: 0,
    },
    usedDeprecatedRules: [
      {
        ruleId: 'semi',
        replacedBy: ['@stylistic/js/semi'],
        info: {
          message: 'Formatting rules are being moved out of ESLint core.',
          url: 'https://eslint.org/blog/2023/10/deprecating-formatting-rules/',
          deprecatedSince: '8.53.0',
          availableUntil: '10.0.0',
          replacedBy: [
            {
              message:
                'ESLint Stylistic now maintains deprecated stylistic core rules.',
              url: 'https://eslint.style/guide/migration',
              plugin: {
                name: '@stylistic/eslint-plugin-js',
                url: 'https://eslint.style/packages/js',
              },
              rule: { name: 'semi', url: 'https://eslint.style/rules/js/semi' },
            },
          ],
        },
      },
      {
        ruleId: 'quotes',
        replacedBy: ['@stylistic/js/quotes'],
        info: {
          message: 'Formatting rules are being moved out of ESLint core.',
          url: 'https://eslint.org/blog/2023/10/deprecating-formatting-rules/',
          deprecatedSince: '8.53.0',
          availableUntil: '10.0.0',
          replacedBy: [
            {
              message:
                'ESLint Stylistic now maintains deprecated stylistic core rules.',
              url: 'https://eslint.style/guide/migration',
              plugin: {
                name: '@stylistic/eslint-plugin-js',
                url: 'https://eslint.style/packages/js',
              },
              rule: {
                name: 'quotes',
                url: 'https://eslint.style/rules/js/quotes',
              },
            },
          ],
        },
      },
    ],
  },
  {
    filePath:
      '/Users/michael_hladky/WebstormProjects/eslint/packages/eslint-stats/mocks/fixtures/minimal-setup/file-with-violations-1.js',
    messages: [
      {
        ruleId: 'no-unused-vars',
        severity: 2,
        message: "'unusedVariable' is assigned a value but never used.",
        line: 2,
        column: 7,
        nodeType: 'Identifier',
        messageId: 'unusedVar',
        endLine: 2,
        endColumn: 21,
        suggestions: [
          {
            messageId: 'removeVar',
            data: { varName: 'unusedVariable' },
            fix: { range: [38, 72], text: '' },
            desc: "Remove unused variable 'unusedVariable'.",
          },
        ],
      },
      {
        ruleId: 'no-console',
        severity: 1,
        message: 'Unexpected console statement.',
        line: 5,
        column: 3,
        nodeType: 'MemberExpression',
        messageId: 'unexpected',
        endLine: 5,
        endColumn: 14,
        suggestions: [
          {
            fix: { range: [129, 172], text: '' },
            messageId: 'removeConsole',
            data: { propertyName: 'log' },
            desc: 'Remove the console.log().',
          },
        ],
      },
    ],
    suppressedMessages: [],
    errorCount: 1,
    fatalErrorCount: 0,
    warningCount: 1,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
    source:
      "// This file has some lint violations\nconst unusedVariable = 'not used'; // 1 error: no-unused-vars\n\nfunction testFunction() {\n  console.log('This will trigger a warning'); // 1 warning: no-console\n  return 'hello world';\n}\n\ntestFunction(); // Use the function to avoid unused error ",
    stats: {
      times: {
        passes: [
          {
            parse: { total: 0.489375 },
            rules: {
              'no-unused-vars': { total: 0.586167 },
              'no-console': { total: 0.136708 },
              semi: { total: 0.023582 },
              quotes: { total: 0.008 },
            },
            fix: { total: 0 },
            total: 1.608833,
          },
        ],
      },
      fixPasses: 0,
    },
    usedDeprecatedRules: [
      {
        ruleId: 'semi',
        replacedBy: ['@stylistic/js/semi'],
        info: {
          message: 'Formatting rules are being moved out of ESLint core.',
          url: 'https://eslint.org/blog/2023/10/deprecating-formatting-rules/',
          deprecatedSince: '8.53.0',
          availableUntil: '10.0.0',
          replacedBy: [
            {
              message:
                'ESLint Stylistic now maintains deprecated stylistic core rules.',
              url: 'https://eslint.style/guide/migration',
              plugin: {
                name: '@stylistic/eslint-plugin-js',
                url: 'https://eslint.style/packages/js',
              },
              rule: { name: 'semi', url: 'https://eslint.style/rules/js/semi' },
            },
          ],
        },
      },
      {
        ruleId: 'quotes',
        replacedBy: ['@stylistic/js/quotes'],
        info: {
          message: 'Formatting rules are being moved out of ESLint core.',
          url: 'https://eslint.org/blog/2023/10/deprecating-formatting-rules/',
          deprecatedSince: '8.53.0',
          availableUntil: '10.0.0',
          replacedBy: [
            {
              message:
                'ESLint Stylistic now maintains deprecated stylistic core rules.',
              url: 'https://eslint.style/guide/migration',
              plugin: {
                name: '@stylistic/eslint-plugin-js',
                url: 'https://eslint.style/packages/js',
              },
              rule: {
                name: 'quotes',
                url: 'https://eslint.style/rules/js/quotes',
              },
            },
          ],
        },
      },
    ],
  },
  {
    filePath:
      '/Users/michael_hladky/WebstormProjects/eslint/packages/eslint-stats/mocks/fixtures/minimal-setup/file-with-violations-2.js',
    messages: [
      {
        ruleId: 'no-unused-vars',
        severity: 2,
        message: "'anotherUnused' is assigned a value but never used.",
        line: 2,
        column: 7,
        nodeType: 'Identifier',
        messageId: 'unusedVar',
        endLine: 2,
        endColumn: 20,
        suggestions: [
          {
            messageId: 'removeVar',
            data: { varName: 'anotherUnused' },
            fix: { range: [36, 71], text: '' },
            desc: "Remove unused variable 'anotherUnused'.",
          },
        ],
      },
      {
        ruleId: 'quotes',
        severity: 2,
        message: 'Strings must use singlequote.',
        line: 3,
        column: 21,
        nodeType: 'Literal',
        messageId: 'wrongQuotes',
        endLine: 3,
        endColumn: 39,
        fix: { range: [119, 137], text: "'should be single'" },
      },
      {
        ruleId: 'no-console',
        severity: 1,
        message: 'Unexpected console statement.',
        line: 6,
        column: 3,
        nodeType: 'MemberExpression',
        messageId: 'unexpected',
        endLine: 6,
        endColumn: 14,
        suggestions: [
          {
            fix: { range: [221, 260], text: '' },
            messageId: 'removeConsole',
            data: { propertyName: 'log' },
            desc: 'Remove the console.log().',
          },
        ],
      },
    ],
    suppressedMessages: [],
    errorCount: 2,
    fatalErrorCount: 0,
    warningCount: 1,
    fixableErrorCount: 1,
    fixableWarningCount: 0,
    source:
      "// Second file with lint violations\nconst anotherUnused = 'unused var'; // 1 error: no-unused-vars\nlet missingQuotes = \"should be single\"; // 1 error: quotes (but used, so no unused error)\n\nfunction warningFunction() {\n  console.log('Another console warning'); // 1 warning: no-console  \n  return missingQuotes; // Use the variable\n}\n\nwarningFunction(); // Use function to avoid unused error ",
    stats: {
      times: {
        passes: [
          {
            parse: { total: 0.559958 },
            rules: {
              'no-unused-vars': { total: 0.063875 },
              'no-console': { total: 0.043000000000000003 },
              semi: { total: 0.013707 },
              quotes: { total: 0.104542 },
            },
            fix: { total: 0 },
            total: 1.081334,
          },
        ],
      },
      fixPasses: 0,
    },
    usedDeprecatedRules: [
      {
        ruleId: 'semi',
        replacedBy: ['@stylistic/js/semi'],
        info: {
          message: 'Formatting rules are being moved out of ESLint core.',
          url: 'https://eslint.org/blog/2023/10/deprecating-formatting-rules/',
          deprecatedSince: '8.53.0',
          availableUntil: '10.0.0',
          replacedBy: [
            {
              message:
                'ESLint Stylistic now maintains deprecated stylistic core rules.',
              url: 'https://eslint.style/guide/migration',
              plugin: {
                name: '@stylistic/eslint-plugin-js',
                url: 'https://eslint.style/packages/js',
              },
              rule: { name: 'semi', url: 'https://eslint.style/rules/js/semi' },
            },
          ],
        },
      },
      {
        ruleId: 'quotes',
        replacedBy: ['@stylistic/js/quotes'],
        info: {
          message: 'Formatting rules are being moved out of ESLint core.',
          url: 'https://eslint.org/blog/2023/10/deprecating-formatting-rules/',
          deprecatedSince: '8.53.0',
          availableUntil: '10.0.0',
          replacedBy: [
            {
              message:
                'ESLint Stylistic now maintains deprecated stylistic core rules.',
              url: 'https://eslint.style/guide/migration',
              plugin: {
                name: '@stylistic/eslint-plugin-js',
                url: 'https://eslint.style/packages/js',
              },
              rule: {
                name: 'quotes',
                url: 'https://eslint.style/rules/js/quotes',
              },
            },
          ],
        },
      },
    ],
  },
];

describe('ESLint Stats Schema Data Transformation', () => {
  it('should transform statsData to aggregated ReducedRule format using ParsedEslintStatsSchema', () => {
    expect(ParsedEslintStatsSchema.parse(statsData)).toStrictEqual([
      {
        identifier: 'no-unused-vars',
        timeMs: 0.719207 + 0.023001 + 0.586167 + 0.063875, // Sum from all files
        everFixableCli: false,
        everManuallyFixable: true, // Has suggestions in messages
        severities: ['error'], // Severity 2 in messages
        occurredInTestFiles: false,
        occurredInNonTestFiles: true,
      },
      {
        identifier: 'no-console',
        timeMs:
          0.036792000000000005 + 0.002624 + 0.136708 + 0.043000000000000003, // Sum from all files
        everFixableCli: false,
        everManuallyFixable: true, // Has suggestions in messages
        severities: ['warning'], // Severity 1 in messages
        occurredInTestFiles: false,
        occurredInNonTestFiles: true,
      },
      {
        identifier: 'semi',
        timeMs: 0.22908299999999995 + 0.031917 + 0.023582 + 0.013707, // Sum from all files
        everFixableCli: false,
        everManuallyFixable: false, // No messages for this rule
        severities: [], // No violations, only timing data
        occurredInTestFiles: false,
        occurredInNonTestFiles: true,
      },
      {
        identifier: 'quotes',
        timeMs: 0.056375 + 0.07912500000000001 + 0.008 + 0.104542, // Sum from all files
        everFixableCli: true, // Has fix property in second file message
        everManuallyFixable: false, // No suggestions for quotes rule
        severities: ['error'], // Severity 2 in second file message
        occurredInTestFiles: false,
        occurredInNonTestFiles: true,
      },
    ]);
  });
});
