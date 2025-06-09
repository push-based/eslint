#!/usr/bin/env node

import main from '../cli/core/main';

console.log('Starting eslint-stats application...');

main().catch((error) => {
  console.error('CLI Error:', (error as Error).message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});
