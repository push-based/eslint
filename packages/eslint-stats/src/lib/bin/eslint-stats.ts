#!/usr/bin/env node

import { main } from '../cli/core/main';

try {
  main();
} catch (error: unknown) {
  console.error(error);
}
