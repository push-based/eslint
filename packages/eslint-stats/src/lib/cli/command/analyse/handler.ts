import { AnalyseArgs } from './analyse.command';
import { loadStats } from '../../../stats/load';
import { renderInteractiveView, startInteractiveSession } from './interactive';
import { initInteractiveState } from './scene-state';

export async function analyseHandler(argv: AnalyseArgs): Promise<void> {
  try {
    const detailedStats = loadStats(argv.file);

    const userRequestedInteractive = process.argv.includes('--interactive');
    const isInteractive =
      process.stdout.isTTY &&
      argv.interactive &&
      // When user explicitly uses --interactive flag, we ignore env var
      (userRequestedInteractive || !('DISABLE_AUTO_UPDATE' in process.env));

    const state = initInteractiveState({ ...argv, interactive: isInteractive });

    if (!isInteractive) {
      renderInteractiveView(state, detailedStats);
      return;
    }
    startInteractiveSession(detailedStats, state, state.file);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('An unknown error occurred.');
    }
    process.exit(1);
  }
}
