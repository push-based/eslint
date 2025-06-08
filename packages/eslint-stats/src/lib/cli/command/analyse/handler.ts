import { renderTable, ShowOption } from '../../../reporting/render-table';
import { AnalyseArgs } from './analyse.command';
import { loadStats } from '../../../stats/load';
import { startInteractiveSession } from './interactive';
import { getRowsToRender } from './processing';
import { formatAggregatedTimesForDisplay } from '../../../reporting/format';

export async function analyseHandler(argv: AnalyseArgs): Promise<void> {
  try {
    const detailedStats = loadStats(argv.file);

    const userRequestedInteractive = process.argv.includes('--interactive');

    const isInteractive =
      process.stdout.isTTY &&
      argv.interactive &&
      // When user explicitly uses --interactive flag, we ignore env var
      (userRequestedInteractive || !('DISABLE_AUTO_UPDATE' in process.env));

    if (!isInteractive) {
      // Non-interactive mode for CI/CD or file redirection
      const processedData = getRowsToRender(detailedStats, {
        groupBy: argv.groupBy,
        sortBy: argv.sortBy,
        sortOrder: 'desc',
        take: argv.take,
        show: argv.show,
      });

      const formattedData = formatAggregatedTimesForDisplay(processedData);

      const table = renderTable(formattedData, {
        show: argv.show as ShowOption[],
      });

      console.log(table);
      return;
    }

    // Interactive mode
    startInteractiveSession(detailedStats, argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('An unknown error occurred.');
    }
    process.exit(1);
  }
}
