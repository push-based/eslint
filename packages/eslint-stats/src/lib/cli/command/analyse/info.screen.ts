import { theme, applyRgb } from '../../../stats/theme';
import {
  createTotalsSparkline,
  formatErrorPart,
  formatWarningPart,
  formatTimeColored,
  formatFilePath,
  formatTime,
  formatDate,
  formatCommand,
} from '../../../stats/format';
import { asciiSparkline } from '../../../utils/ascii-sparkline';
import {
  groupByOptions,
  InteractiveCommandState,
  sortByOptions,
} from './command-state';
import { computeTotals } from '../../../parse/eslint-result-visitor';
import { RootStatsNode } from '../../../parse/eslint-result-visitor';

const {
  text: {
    value,
    secondary,
    file: fileClr,
    rule: ruleClr,
    header,
    sectionHeader,
    label,
    error,
    info,
  },
  icons: {
    stats,
    file: fileIcon,
    rule: ruleIcon,
    time: timeIcon,
    error: errorIcon,
    warning: warnIcon,
  },
  scales: { timeScale, errorScale, warnScale },
} = theme;

const VIEW_DESCRIPTIONS = {
  rule: 'Showing ESLint rules grouped by performance impact',
  file: 'Showing files grouped by linting results',
  'file-rule':
    'Showing files with their associated rules (two-level hierarchy)',
} as const;

const SORT_INFO = {
  time: { icon: timeIcon, description: 'Total processing time' },
  error: { icon: errorIcon, description: 'Error count' },
  warning: { icon: warnIcon, description: 'Warning count' },
  identifier: { icon: ruleIcon, description: 'Alphabetical by name' },
} as const;

const TIME_PARTS = [
  {
    key: 'parseTime' as const,
    label: 'Parse',
    color: fileClr,
    desc: 'Time spent parsing JavaScript/TypeScript files',
  },
  {
    key: 'rulesTime' as const,
    label: 'Rules',
    color: ruleClr,
    desc: 'Time spent executing ESLint rules',
  },
  {
    key: 'fixTime' as const,
    label: 'Fix',
    color: error,
    desc: 'Time spent applying auto-fixes',
  },
  {
    key: 'otherTime' as const,
    label: 'Other',
    color: secondary,
    desc: 'Other processing overhead',
  },
] as const;

interface SectionItem {
  label: string;
  content: string;
}

type TotalsWithOther = ReturnType<typeof computeTotals> & { otherTime: number };

interface SectionDef {
  title:
    | string
    | ((
        state: InteractiveCommandState,
        totals: TotalsWithOther,
        processedStats?: RootStatsNode
      ) => string);
  subtitle?: (
    state: InteractiveCommandState,
    totals: TotalsWithOther,
    processedStats?: RootStatsNode
  ) => string;
  items: (
    state: InteractiveCommandState,
    totals: TotalsWithOther,
    processedStats?: RootStatsNode
  ) => SectionItem[];
}

const sparkDemo = (scaleFn: typeof timeScale) => {
  const vals = [0, 1, 2, 3, 4, 5, 6, 7];
  return asciiSparkline(vals, {
    min: 0,
    max: vals.length - 1,
    colors: vals.map((_, i) =>
      i === 0
        ? (s: string) => secondary(s)
        : (s: string) => applyRgb(scaleFn(i, vals.length - 1), s)
    ),
  });
};

const SECTION_DEFS: SectionDef[] = [
  {
    title: () => `ESLint Stats Analysis`,
    items: (state, totals, processedStats) => {
      const baseItems = [
        {
          label: '',
          content: `📊 ${formatFilePath(state.file, 25)}`,
        },
      ];

      // Add combined date and command info if available
      if (processedStats?.date || processedStats?.decodedCommand) {
        let timeAndCommand = '';

        if (processedStats?.date) {
          timeAndCommand = `⏱ ${formatDate(processedStats.date)}`;
        }

        if (processedStats?.decodedCommand) {
          timeAndCommand += ` · ${formatCommand(
            processedStats.decodedCommand
          )}`;
        }

        if (timeAndCommand) {
          baseItems.push({
            label: '',
            content: timeAndCommand,
          });
        }
      }

      return baseItems;
    },
  },
  {
    title: 'Table Totals (Header Above)',
    subtitle: () =>
      'Complete analysis results - remains constant regardless of table view/sort',
    items: (_, totals) => [
      {
        label: `${fileClr(`${fileIcon} Files:`)}`,
        content: `${value(totals.fileCount)} ${secondary(
          '- Total number of files processed by ESLint'
        )}`,
      },
      {
        label: `${ruleClr(`${ruleIcon} Rules:`)}`,
        content: `${value(totals.ruleCount)} ${secondary(
          '- Number of unique ESLint rules that were executed'
        )}`,
      },
      {
        label: `${secondary('Errors:')}`,
        content: `${formatErrorPart(totals)} ${secondary(
          '- Total and fixable error-level violations'
        )}`,
      },
      {
        label: `${secondary('Warnings:')}`,
        content: `${formatWarningPart(totals)} ${secondary(
          '- Total and fixable warning-level violations'
        )}`,
      },
    ],
  },
  {
    title: 'Times',
    items: (_, totals) => [
      {
        label: `${label(`${timeIcon} Total Time:`)}`,
        content: `${formatTimeColored(
          totals.totalTime,
          totals.totalTime
        )} ${secondary('- Combined processing time for all files')}`,
      },
      {
        label: `${header(`${timeIcon} Time Breakdown Details:`)}`,
        content: '',
      },
      {
        label: `${secondary('Format:')}`,
        content: `${fileClr('parse')}/${ruleClr('rules')}/${error(
          'fix'
        )}/${secondary('other')} ${createTotalsSparkline(totals)}`,
      },
      ...TIME_PARTS.map(({ key, label: partLabel, color, desc }) => ({
        label: `${color(`${partLabel}:`)}`,
        content: `${color(formatTime(totals[key]))} ${secondary(`- ${desc}`)}`,
      })),
      {
        label: `${secondary('Chart:')}`,
        content: `${createTotalsSparkline(totals)} ${secondary(
          '- Each bar represents one time component: parse, rules, fix, other'
        )}`,
      },
    ],
  },
  {
    title: 'Current Table State',
    items: (state) => {
      const currentView = groupByOptions[state.groupByIndex];
      const currentSort = sortByOptions[state.sortByIndex];
      const viewIcon =
        currentView === 'rule'
          ? ruleIcon
          : currentView === 'file'
          ? fileIcon
          : stats;
      const sortIcon =
        SORT_INFO[currentSort as keyof typeof SORT_INFO]?.icon || ruleIcon;
      const sortDirection = state.sortOrder === 'desc' ? '↓' : '↑';

      const baseItems = [
        {
          label: `${label('View:')}`,
          content: `${viewIcon} ${value(currentView.toUpperCase())} ${secondary(
            `- ${
              VIEW_DESCRIPTIONS[currentView as keyof typeof VIEW_DESCRIPTIONS]
            }`
          )}`,
        },
        {
          label: `${label('Sort:')}`,
          content: `${sortIcon} ${value(currentSort.toUpperCase())} ${value(
            sortDirection
          )} ${secondary(
            `- ${
              SORT_INFO[currentSort as keyof typeof SORT_INFO]?.description ||
              'Unknown'
            } (${state.sortOrder}ending)`
          )}`,
        },
        {
          label: `${label('Rows:')}`,
          content:
            currentView === 'file-rule'
              ? `${value(
                  `F:${state.take[0] || 10}, R:${
                    state.take[1] || state.take[0] || 10
                  }`
                )} ${secondary('- File and rule limits')}`
              : `${value(state.take[0] || 10)} ${secondary(
                  '- Number of entries displayed in the table'
                )}`,
        },
      ];

      const fileRuleItems =
        currentView === 'file-rule'
          ? [
              {
                label: `${label('Active Layer:')}`,
                content: `${
                  (state.activeLayer || 'file') === 'file' ? fileIcon : ruleIcon
                } ${value(
                  (state.activeLayer || 'file').toUpperCase()
                )} ${secondary('- Controls which limit +/- keys adjust')}`,
              },
              {
                label: `${header('File-Rule Level Explanation:')}`,
                content: '',
              },
              {
                label: `${fileClr('F (Files):')}`,
                content: `${secondary(
                  'Maximum number of files to display in the table'
                )}`,
              },
              {
                label: `${ruleClr('R (Rules):')}`,
                content: `${secondary(
                  'Maximum rules shown per file (nested under each file)'
                )}`,
              },
              {
                label: '',
                content: `${secondary(
                  'Use Tab to switch between F/R levels, +/- to adjust the active limit'
                )}`,
              },
            ]
          : [];

      return [...baseItems, ...fileRuleItems];
    },
  },
  {
    title: 'Color Grading',
    subtitle: () => 'Colors in the table indicate relative intensity:',
    items: () => [
      {
        label: `${info('Times:')}`,
        content: `${sparkDemo(timeScale)} ${secondary(
          'low → high processing time'
        )}`,
      },
      {
        label: `${error('Errors:')}`,
        content: `${sparkDemo(errorScale)} ${secondary('few → many errors')}`,
      },
      {
        label: `${label('Warnings:')}`,
        content: `${sparkDemo(warnScale)} ${secondary('few → many warnings')}`,
      },
    ],
  },
];

function renderSection(
  title: string,
  subtitle?: string,
  items: SectionItem[] = []
): string {
  return [
    sectionHeader(title),
    subtitle && secondary.italic(subtitle),
    ...items.map((i) => `${i.label} ${i.content}`),
  ]
    .filter(Boolean)
    .join('\n');
}

export function createInfoExplanation(
  state: InteractiveCommandState,
  processedStats: RootStatsNode
): string {
  const totals: TotalsWithOther = {
    ...computeTotals(processedStats.children),
    otherTime: 0,
  };
  totals.otherTime = Math.max(
    0,
    totals.totalTime - totals.parseTime - totals.rulesTime - totals.fixTime
  );

  return SECTION_DEFS.map((def) => {
    const title =
      typeof def.title === 'function'
        ? def.title(state, totals, processedStats)
        : def.title;
    const subtitle = def.subtitle?.(state, totals, processedStats);
    const items = def.items(state, totals, processedStats);
    return renderSection(title, subtitle, items);
  }).join('\n\n');
}
