#!/usr/bin/env node

import { main } from '../cli/core/main';

console.log('Starting eslint-stats application...');

try {
  main();
} catch (error: unknown) {
  console.error(error);
}
