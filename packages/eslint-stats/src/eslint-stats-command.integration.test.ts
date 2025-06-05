import { describe, it, expect } from 'vitest';
import { executeProcess } from '../execute-process';
import { join } from 'path';

// removes all color codes from the output for snapshot readability
export function removeColorCodes(stdout: string) {
  // eslint-disable-next-line no-control-regex
  return stdout.replace(/\u001B\[\d+m/g, '');
}


describe('eslint-stats-command', () => {
  const eslintStatsBinPath =
    'packages/cpu-prof/src/lib/eslint-stats/bin/demo.ts';
  const eslintStatsPath = join(__dirname, '..', '..', 'mocks', 'fixtures', 'eslint-stats.json');

  it('should run demo.ts and log output', async () => {
    let { stdout, stderr, code } = await executeProcess({
      command: 'tsx',
      args: [eslintStatsBinPath, eslintStatsPath],
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);

    stdout = removeColorCodes(stdout);
    expect(stdout).toMatchInlineSnapshot(`
      "┌─────────┬─────────────────────────────────┬─────────┬─────────────────┐
      │ (index) │ identifier                      │ timeMs  │ relativePercent │
      ├─────────┼─────────────────────────────────┼─────────┼─────────────────┤
      │ 0       │ 'no-control-regex'              │ '2.662' │ '1.9%'          │
      │ 1       │ 'no-constant-binary-expression' │ '0.778' │ '0.6%'          │
      │ 2       │ 'no-constant-condition'         │ '0.627' │ '0.5%'          │
      │ 3       │ 'for-direction'                 │ '0.337' │ '0.2%'          │
      │ 4       │ 'no-compare-neg-zero'           │ '0.160' │ '0.1%'          │
      │ 5       │ 'no-cond-assign'                │ '0.147' │ '0.1%'          │
      │ 6       │ 'no-delete-var'                 │ '0.046' │ '0.0%'          │
      │ 7       │ 'no-async-promise-executor'     │ '0.036' │ '0.0%'          │
      │ 8       │ 'no-debugger'                   │ '0.034' │ '0.0%'          │
      │ 9       │ 'no-case-declarations'          │ '0.032' │ '0.0%'          │
      └─────────┴─────────────────────────────────┴─────────┴─────────────────┘
      "
    `);
  });

  it('should run demo.ts with "rule" argument and log output', async () => {
    let { stdout, stderr, code } = await executeProcess({
      command: 'tsx',
      args: [eslintStatsBinPath, eslintStatsPath, 'rule'],
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);

    stdout = removeColorCodes(stdout);
    expect(stdout).toMatchInlineSnapshot(`
      "┌─────────┬─────────────────────────────────┬─────────┬─────────────────┐
      │ (index) │ identifier                      │ timeMs  │ relativePercent │
      ├─────────┼─────────────────────────────────┼─────────┼─────────────────┤
      │ 0       │ 'no-control-regex'              │ '2.662' │ '1.9%'          │
      │ 1       │ 'no-constant-binary-expression' │ '0.778' │ '0.6%'          │
      │ 2       │ 'no-constant-condition'         │ '0.627' │ '0.5%'          │
      │ 3       │ 'for-direction'                 │ '0.337' │ '0.2%'          │
      │ 4       │ 'no-compare-neg-zero'           │ '0.160' │ '0.1%'          │
      │ 5       │ 'no-cond-assign'                │ '0.147' │ '0.1%'          │
      │ 6       │ 'no-delete-var'                 │ '0.046' │ '0.0%'          │
      │ 7       │ 'no-async-promise-executor'     │ '0.036' │ '0.0%'          │
      │ 8       │ 'no-debugger'                   │ '0.034' │ '0.0%'          │
      │ 9       │ 'no-case-declarations'          │ '0.032' │ '0.0%'          │
      └─────────┴─────────────────────────────────┴─────────┴─────────────────┘
      "
    `);
  });

  it('should run demo.ts with "file" argument and log output', async () => {
    let { stdout, stderr, code } = await executeProcess({
      command: 'tsx',
      args: [eslintStatsBinPath, eslintStatsPath, 'file'],
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);

    stdout = removeColorCodes(stdout);
    expect(stdout).toMatchInlineSnapshot(`
      "┌─────────┬─────────────────────────────────────────────────────────────────────┬──────────┬─────────────────┐
      │ (index) │ identifier                                                          │ timeMs   │ relativePercent │
      ├─────────┼─────────────────────────────────────────────────────────────────────┼──────────┼─────────────────┤
      │ 0       │ 'exmpl-create-threads.js'                                           │ '30.686' │ '0.9%'          │
      │ 1       │ 'cpu-prof.js'                                                       │ '18.860' │ '0.6%'          │
      │ 2       │ 'minimal-trace-event-instant-event-simple-profile-chunks.json'      │ '7.078'  │ '0.2%'          │
      │ 3       │ 'exmpl-spawn-processes.js'                                          │ '6.220'  │ '0.2%'          │
      │ 4       │ 'exmpl-script.js'                                                   │ '4.744'  │ '0.1%'          │
      │ 5       │ 'eslint.config.mjs'                                                 │ '3.010'  │ '0.1%'          │
      │ 6       │ 'minimal-trace-event-pid-tid-grouping.json'                         │ '2.614'  │ '0.1%'          │
      │ 7       │ 'minimal-trace-event-instant-event-complex-profile-chunks.json'     │ '2.076'  │ '0.1%'          │
      │ 8       │ 'minimal-trace-event-instant-event-start-profiling.json'            │ '1.671'  │ '0.1%'          │
      │ 9       │ 'minimal-trace-event-instant-event-tracing-started-in-browser.json' │ '1.214'  │ '0.0%'          │
      └─────────┴─────────────────────────────────────────────────────────────────────┴──────────┴─────────────────┘
      "
    `);
  });
});
