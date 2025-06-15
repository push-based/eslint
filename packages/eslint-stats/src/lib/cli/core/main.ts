#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import measureCommand from '../command/measure';
import { analyseCommand } from '../command/analyse/analyse.command';

export function main() {
  void yargs(hideBin(process.argv))
    .scriptName('eslint-stats')
    .usage('$0 <command> [options]')
    .command(measureCommand)
    .command(analyseCommand)
    .demandCommand(1, 'You need at least one command before moving on')
    .help().argv;
}

export default main;
