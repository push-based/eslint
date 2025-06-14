import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { analyseCommand } from '../command/analyse/analyse.command';
import measureCommand from '../command/measure';

export async function main(): Promise<void> {
  const cli = yargs(hideBin(process.argv))
    .scriptName('eslint-stats')
    .usage('Usage: $0 <command>')
    .recommendCommands()
    .help()
    .alias('help', 'h')
    .version()
    .wrap(100);

  // Register all commands
  cli.command({
    ...analyseCommand,
    command: ['$0 <file>', 'analyse <file>'],
  });
  cli.command({
    ...measureCommand,
  });

  await cli.parse();
}

export default main;
