import { describe, expect, it } from 'vitest';
import { executeProcess } from '../../execute-process';
import { join } from 'path';
// eslint-disable-next-line import/no-relative-parent-imports
import { removeColorCodes } from '../../../../../../testing/utils/src/lib/string';

describe('eslint-stats-command', () => {
  const eslintStatsBinPath =
    'packages/eslint-stats/src/lib/bin/eslint-stats.ts';
  const eslintStatsPath = join(process.cwd(), 'eslint-stats.json');

  it('should run demo.ts and log output', async () => {
    let { stdout, stderr, code } = await executeProcess({
      command: 'tsx',
      args: [eslintStatsBinPath, eslintStatsPath],
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);

    stdout = removeColorCodes(stdout);
    expect(stdout).toMatchInlineSnapshot(`
      "Rule                                                    |                       Time |                Timeouts |    🚨 Errors | ⚠️ Warnings
      :-------------------------------------------------------|---------------------------:|------------------------:|-------------:|-----------:
      @typescript-eslint/no-unused-vars    |         64.18 ms |         40.7% | 23 |            
      @nx/dependency-checks                |         34.52 ms |         21.9% |              | 1
      @nx/enforce-module-boundaries        |         16.71 ms |         10.6% |              | 2
      @typescript-eslint/no-empty-function | 4.56 ms | 2.9% |              | 1
      no-control-regex                              | 2.66 ms | 1.7% |              |            
      prefer-const                         | 2.61 ms | 1.7% |              | 6
      no-misleading-character-class                 | 2.59 ms | 1.6% |              |            
      no-useless-escape                             | 2.16 ms | 1.4% |              |            
      no-regex-spaces                               | 1.72 ms | 1.1% |              |            
      no-global-assign                              | 1.70 ms | 1.1% |              |            
      ...                                           |                            |                         |              |            
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
      "Rule                                                    |                       Time |                Timeouts |    🚨 Errors | ⚠️ Warnings
      :-------------------------------------------------------|---------------------------:|------------------------:|-------------:|-----------:
      @typescript-eslint/no-unused-vars    |         64.18 ms |         40.7% | 23 |            
      @nx/dependency-checks                |         34.52 ms |         21.9% |              | 1
      @nx/enforce-module-boundaries        |         16.71 ms |         10.6% |              | 2
      @typescript-eslint/no-empty-function | 4.56 ms | 2.9% |              | 1
      no-control-regex                              | 2.66 ms | 1.7% |              |            
      prefer-const                         | 2.61 ms | 1.7% |              | 6
      no-misleading-character-class                 | 2.59 ms | 1.6% |              |            
      no-useless-escape                             | 2.16 ms | 1.4% |              |            
      no-regex-spaces                               | 1.72 ms | 1.1% |              |            
      no-global-assign                              | 1.70 ms | 1.1% |              |            
      ...                                           |                            |                         |              |            
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
      "Rule                                                    |                       Time |                Timeouts |    🚨 Errors | ⚠️ Warnings
      :-------------------------------------------------------|---------------------------:|------------------------:|-------------:|-----------:
      @typescript-eslint/no-unused-vars    |         64.18 ms |         40.7% | 23 |            
      @nx/dependency-checks                |         34.52 ms |         21.9% |              | 1
      @nx/enforce-module-boundaries        |         16.71 ms |         10.6% |              | 2
      @typescript-eslint/no-empty-function | 4.56 ms | 2.9% |              | 1
      no-control-regex                              | 2.66 ms | 1.7% |              |            
      prefer-const                         | 2.61 ms | 1.7% |              | 6
      no-misleading-character-class                 | 2.59 ms | 1.6% |              |            
      no-useless-escape                             | 2.16 ms | 1.4% |              |            
      no-regex-spaces                               | 1.72 ms | 1.1% |              |            
      no-global-assign                              | 1.70 ms | 1.1% |              |            
      ...                                           |                            |                         |              |            
      "
    `);
  });

  it('should run demo.ts with "file-rule" argument and log output', async () => {
    let { stdout, stderr, code } = await executeProcess({
      command: 'tsx',
      args: [eslintStatsBinPath, eslintStatsPath, 'file-rule'],
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);

    stdout = removeColorCodes(stdout);
    expect(stdout).toMatchInlineSnapshot(`
      "Rule                                                    |                       Time |                Timeouts |    🚨 Errors | ⚠️ Warnings
      :-------------------------------------------------------|---------------------------:|------------------------:|-------------:|-----------:
      @typescript-eslint/no-unused-vars    |         64.18 ms |         40.7% | 23 |            
      @nx/dependency-checks                |         34.52 ms |         21.9% |              | 1
      @nx/enforce-module-boundaries        |         16.71 ms |         10.6% |              | 2
      @typescript-eslint/no-empty-function | 4.56 ms | 2.9% |              | 1
      no-control-regex                              | 2.66 ms | 1.7% |              |            
      prefer-const                         | 2.61 ms | 1.7% |              | 6
      no-misleading-character-class                 | 2.59 ms | 1.6% |              |            
      no-useless-escape                             | 2.16 ms | 1.4% |              |            
      no-regex-spaces                               | 1.72 ms | 1.1% |              |            
      no-global-assign                              | 1.70 ms | 1.1% |              |            
      ...                                           |                            |                         |              |            
      "
    `);
  });

  it('should run demo.ts with "rule" and "violations" arguments and log output', async () => {
    let { stdout, stderr, code } = await executeProcess({
      command: 'tsx',
      args: [eslintStatsBinPath, eslintStatsPath, 'rule', 'violations'],
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);

    stdout = removeColorCodes(stdout);
    expect(stdout).toMatchInlineSnapshot(`
      "Rule                                                    |                       Time |                Timeouts |    🚨 Errors | ⚠️ Warnings
      :-------------------------------------------------------|---------------------------:|------------------------:|-------------:|-----------:
      @typescript-eslint/no-unused-vars    |         64.18 ms |         40.7% | 23 |            
      @nx/dependency-checks                |         34.52 ms |         21.9% |              | 1
      @nx/enforce-module-boundaries        |         16.71 ms |         10.6% |              | 2
      @typescript-eslint/no-empty-function | 4.56 ms | 2.9% |              | 1
      no-control-regex                              | 2.66 ms | 1.7% |              |            
      prefer-const                         | 2.61 ms | 1.7% |              | 6
      no-misleading-character-class                 | 2.59 ms | 1.6% |              |            
      no-useless-escape                             | 2.16 ms | 1.4% |              |            
      no-regex-spaces                               | 1.72 ms | 1.1% |              |            
      no-global-assign                              | 1.70 ms | 1.1% |              |            
      ...                                           |                            |                         |              |            
      "
    `);
  });

  it('should run demo.ts with "file" and "violations" arguments and log output', async () => {
    let { stdout, stderr, code } = await executeProcess({
      command: 'tsx',
      args: [eslintStatsBinPath, eslintStatsPath, 'file', 'violations'],
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);

    stdout = removeColorCodes(stdout);
    expect(stdout).toMatchInlineSnapshot(`
      "Rule                                                    |                       Time |                Timeouts |    🚨 Errors | ⚠️ Warnings
      :-------------------------------------------------------|---------------------------:|------------------------:|-------------:|-----------:
      @typescript-eslint/no-unused-vars    |         64.18 ms |         40.7% | 23 |            
      @nx/dependency-checks                |         34.52 ms |         21.9% |              | 1
      @nx/enforce-module-boundaries        |         16.71 ms |         10.6% |              | 2
      @typescript-eslint/no-empty-function | 4.56 ms | 2.9% |              | 1
      no-control-regex                              | 2.66 ms | 1.7% |              |            
      prefer-const                         | 2.61 ms | 1.7% |              | 6
      no-misleading-character-class                 | 2.59 ms | 1.6% |              |            
      no-useless-escape                             | 2.16 ms | 1.4% |              |            
      no-regex-spaces                               | 1.72 ms | 1.1% |              |            
      no-global-assign                              | 1.70 ms | 1.1% |              |            
      ...                                           |                            |                         |              |            
      "
    `);
  });

  it('should run demo.ts with "file-rule" and "violations" arguments and log output', async () => {
    let { stdout, stderr, code } = await executeProcess({
      command: 'tsx',
      args: [eslintStatsBinPath, eslintStatsPath, 'file-rule', 'violations'],
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);

    stdout = removeColorCodes(stdout);
    expect(stdout).toMatchInlineSnapshot(`
      "Rule                                                    |                       Time |                Timeouts |    🚨 Errors | ⚠️ Warnings
      :-------------------------------------------------------|---------------------------:|------------------------:|-------------:|-----------:
      @typescript-eslint/no-unused-vars    |         64.18 ms |         40.7% | 23 |            
      @nx/dependency-checks                |         34.52 ms |         21.9% |              | 1
      @nx/enforce-module-boundaries        |         16.71 ms |         10.6% |              | 2
      @typescript-eslint/no-empty-function | 4.56 ms | 2.9% |              | 1
      no-control-regex                              | 2.66 ms | 1.7% |              |            
      prefer-const                         | 2.61 ms | 1.7% |              | 6
      no-misleading-character-class                 | 2.59 ms | 1.6% |              |            
      no-useless-escape                             | 2.16 ms | 1.4% |              |            
      no-regex-spaces                               | 1.72 ms | 1.1% |              |            
      no-global-assign                              | 1.70 ms | 1.1% |              |            
      ...                                           |                            |                         |              |            
      "
    `);
  });
});
