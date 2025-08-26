# ESLint Concurrency Benchmark

As a performance enthusiast I couldn't wait to try out the new [ESLint v9.34+ `--concurrency` option](https://eslint.org/blog/2024/06/eslint-v9.34.0-released/#new--concurrency-option) and see how it performs across different projects and concurrency settings.
In the following, you will find all scripts I used as well as some explanation.
I will also add my measures as example output. If I have enough cross-checks, I will aggregate a more official comparison.

## TL;DR

**System:** darwin arm64 (23.3.0) | 12 cores | 32 GB | Node.js v24.1.0

**Versions:**

```txt
┌─────────┬──────────┬─────────────┬────────┬────────┬─────────┬──────┐
│ (index) │ ESLint   │ Concurrency │ Avg(s) │ StdDev │ Speedup │ Mark │
├─────────┼──────────┼─────────────┼────────┼────────┼─────────┼──────┤
│ 0       │ '9.34.0' │ 'not used'  │ 1.953  │ 0.159  │ '1.00x' │ '★'  │
│ 1       │ '8.57.0' │ 'not used'  │ 2.013  │ 0.163  │ '0.97x' │ ''   │
└─────────┴──────────┴─────────────┴────────┴────────┴─────────┴──────┘
```

**Concurrency:**

```txt
┌─────────┬──────────┬─────────────┬────────┬────────┬─────────┬──────┐
│ (index) │ ESLint   │ Concurrency │ Avg(s) │ StdDev │ Speedup │ Mark │
├─────────┼──────────┼─────────────┼────────┼────────┼─────────┼──────┤
│ 0       │ '9.34.0' │ 'auto'      │ 1.878  │ 0.032  │ '1.14x' │ '★'  │
│ 1       │ '9.34.0' │ 'off'       │ 2.144  │ 0.209  │ '1.00x' │ ''   │
│ 2       │ '9.34.0' │ '2'         │ 2.357  │ 0.089  │ '0.91x' │ ''   │
│ 3       │ '9.34.0' │ '4'         │ 2.432  │ 0.066  │ '0.88x' │ ''   │
│ 4       │ '9.34.0' │ '6'         │ 2.842  │ 0.144  │ '0.75x' │ ''   │
└─────────┴──────────┴─────────────┴────────┴────────┴─────────┴──────┘
```

**CPU Profile (Chrome DevTools):**

| 8.10.0                                  | 9.34 Concurreny off                                                | 9.34 Concurreny 6                                              |
| --------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| ![8.10.0](../img/cpu-eslint-8.10.0.png) | ![9.34 Concurreny off](../img/cpu-eslint-9.34-concurrency-off.png) | ![9.34 Concurreny 6](../img/cpu-eslint-9.34-concurrency-6.png) |

**EsLint Timing (Stats):**

| ⚙️  Rule                               | ⏱ Time ↓ | 🚨 Errors | ⚠️  Warnings |
|----------------------------------------|-----------|-----------|--------------|
|   @typescript-eslint/no-unused-vars    |      70ms |         0 |           20 |
|   @nx/enforce-module-boundaries        |      30ms |         1 |            0 |
|   no-useless-escape                    |      10ms |         0 |            0 |
|   no-misleading-character-class        |       8ms |         0 |            0 |
|   @typescript-eslint/no-empty-function |       5ms |         4 |            0 |
|   no-var                               |       3ms |         0 |            0 |
|   no-control-regex                     |       3ms |         2 |            0 |
|   no-useless-backreference             |       3ms |         0 |            0 |
|   no-regex-spaces                      |       2ms |         0 |            0 |
|   no-global-assign                     |       2ms |         0 |            0 |


## Benchmark

### Benchmarking the different eslint versions `8.57.0`, `9.34.0` (default behavior)

**Command:**

```bash
node tools/eslint-perf.bench.js --configs=testing/utils/eslint.config.mjs --eslintVersion=8.57.0,9.34.0 --runs=3 --outDir=bench-version
```

**Output:**

```
  Command: npx -y eslint@8.57.0 --config="/Users/michael_hladky/WebstormProjects
/eslint/testing/utils/eslint.config.mjs" --format=json "/Users/michael_hladky/We
bstormProjects/eslint/testing/utils"
            
      Run 1/3 ... Time: 2.240s
      Run 2/3 ... Time: 1.861s
      Run 3/3 ... Time: 1.940s
    ⚙️  default: 2.013s (±0.163s)

  Command: npx -y eslint@9.34.0 --config="/Users/michael_hladky/WebstormProjects
/eslint/testing/utils/eslint.config.mjs" --format=json "/Users/michael_hladky/We
bstormProjects/eslint/testing/utils"
            
      Run 1/3 ... Time: 2.178s
      Run 2/3 ... Time: 1.839s
      Run 3/3 ... Time: 1.841s
    ⚙️  default: 1.953s (±0.159s)

System: darwin arm64 (23.3.0) | 12 cores | 32 GB | Node.js v24.1.0
┌─────────┬──────────┬─────────────┬────────┬────────┬─────────┬──────┐
│ (index) │ ESLint   │ Concurrency │ Avg(s) │ StdDev │ Speedup │ Mark │
├─────────┼──────────┼─────────────┼────────┼────────┼─────────┼──────┤
│ 0       │ '9.34.0' │ 'not used'  │ 1.953  │ 0.159  │ '1.00x' │ '★'  │
│ 1       │ '8.57.0' │ 'not used'  │ 2.013  │ 0.163  │ '0.97x' │ ''   │
└─────────┴──────────┴─────────────┴────────┴────────┴─────────┴──────┘
```

### Benchmarking the `--concurrency` option in Eslint v9.34+

**Command:**

```bash
node tools/eslint-perf.bench.js --configs=testing/utils/eslint.config.mjs --eslintVersion=9.34.0 --concurrency=off,2,4,6,auto --runs=3 --outDir=bench-concurrency
```

**Terminal Output:**

```
  Command: npx -y eslint@9.34.0 --config="/Users/michael_hladky/WebstormProjects/esl
int/testing/utils/eslint.config.mjs" --concurrency=off --format=json "/Users/michael
_hladky/WebstormProjects/eslint/testing/utils"

      Run 1/3 ... Time: 2.367s
      Run 2/3 ... Time: 2.200s
      Run 3/3 ... Time: 1.865s
    ⚙️  off: 2.144s (±0.209s)

  Command: npx -y eslint@9.34.0 --config="/Users/michael_hladky/WebstormProjects/esl
int/testing/utils/eslint.config.mjs" --concurrency=2 --format=json "/Users/michael_h
ladky/WebstormProjects/eslint/testing/utils"

      Run 1/3 ... Time: 2.483s
      Run 2/3 ... Time: 2.299s
      Run 3/3 ... Time: 2.290s
    ⚙️  2: 2.357s (±0.089s)

  Command: npx -y eslint@9.34.0 --config="/Users/michael_hladky/WebstormProjects/esl
int/testing/utils/eslint.config.mjs" --concurrency=4 --format=json "/Users/michael_h
ladky/WebstormProjects/eslint/testing/utils"

      Run 1/3 ... Time: 2.526s
      Run 2/3 ... Time: 2.388s
      Run 3/3 ... Time: 2.382s
    ⚙️  4: 2.432s (±0.066s)

  Command: npx -y eslint@9.34.0 --config="/Users/michael_hladky/WebstormProjects/esl
int/testing/utils/eslint.config.mjs" --concurrency=6 --format=json "/Users/michael_h
ladky/WebstormProjects/eslint/testing/utils"

      Run 1/3 ... Time: 3.044s
      Run 2/3 ... Time: 2.763s
      Run 3/3 ... Time: 2.719s
    ⚙️  6: 2.842s (±0.144s)

  Command: npx -y eslint@9.34.0 --config="/Users/michael_hladky/WebstormProjects/esl
int/testing/utils/eslint.config.mjs" --concurrency=auto --format=json "/Users/michae
l_hladky/WebstormProjects/eslint/testing/utils"

      Run 1/3 ... Time: 1.872s
      Run 2/3 ... Time: 1.841s
      Run 3/3 ... Time: 1.920s
    ⚙️  auto: 1.878s (±0.032s)

System: darwin arm64 (23.3.0) | 12 cores | 32 GB | Node.js v24.1.0
┌─────────┬──────────┬─────────────┬────────┬────────┬─────────┬──────┐
│ (index) │ ESLint   │ Concurrency │ Avg(s) │ StdDev │ Speedup │ Mark │
├─────────┼──────────┼─────────────┼────────┼────────┼─────────┼──────┤
│ 0       │ '9.34.0' │ 'auto'      │ 1.878  │ 0.032  │ '1.14x' │ '★'  │
│ 1       │ '9.34.0' │ 'off'       │ 2.144  │ 0.209  │ '1.00x' │ ''   │
│ 2       │ '9.34.0' │ '2'         │ 2.357  │ 0.089  │ '0.91x' │ ''   │
│ 3       │ '9.34.0' │ '4'         │ 2.432  │ 0.066  │ '0.88x' │ ''   │
│ 4       │ '9.34.0' │ '6'         │ 2.842  │ 0.144  │ '0.75x' │ ''   │
└─────────┴──────────┴─────────────┴────────┴────────┴─────────┴──────┘
```

### Benchmarking Eslint timing with the `@push-based/eslint-stats` (internally using the `--stats` option)

**Command:**

```bash
npx @push-based/eslint-stats@latest measure -- npx -y eslint@9.34.0 --config=testing/utils/eslint.config.mjs testing/utils --concurrency=4
```

**Terminal Output:**

```node node_modules/.bin/eslint . --stats --format=json --output-file=/Users/michael_h
ladky/WebstormProjects/eslint/ESLINT-STATS--bm9kZSBub2RlX21vZHVsZXMvLmJpbi9lc2xpbnQg
LiAtLSAtLXN0YXRzIC0tZm9ybWF0PWpzb24gLS1vdXRwdXQtZmlsZT08Z2VuZXJhdGVkPg.20250826.1845
35.json

❯ node node_modules/.bin/eslint . -- --stats --format=json --output-file=<generated>
    ⚙️ 71 · ⏱ 500ms · 🚨 11(🔧 0) · ⚠️ 34(🔧 3)

    | ⚙️  Rule                               | ⏱ Time ↓ | 🚨 Errors | ⚠️  Warnings |
    |----------------------------------------|-----------|-----------|--------------|
    |   @typescript-eslint/no-unused-vars    |      70ms |         0 |           20 |
    |   @nx/enforce-module-boundaries        |      30ms |         1 |            0 |
    |   no-useless-escape                    |      10ms |         0 |            0 |
    |   no-misleading-character-class        |       8ms |         0 |            0 |
    |   @typescript-eslint/no-empty-function |       5ms |         4 |            0 |
    |   no-var                               |       3ms |         0 |            0 |
    |   no-control-regex                     |       3ms |         2 |            0 |
    |   no-useless-backreference             |       3ms |         0 |            0 |
    |   no-regex-spaces                      |       2ms |         0 |            0 |
    |   no-global-assign                     |       2ms |         0 |            0 |
```

### CPU profile Eslint versions and concurrency settings

**Command:**

```bash
npx -y @push-based/cpu-prof@latest -- \
  npx -y eslint@9.34.0 --config=testing/utils/eslint.config.mjs testing/utils --concurrency=4
```

**Filesystem Output:**

```txt
/root
 └── profiles/
     ├── CPU-<default-name>.cpuprofile
     ├── MAIN-CPU-<default-name>-<command-as-base64>.cpuprofile
     └── trace.json # Merged trace JSON for DevTools
```

**DevTools Output:**

| 8.10.0                                  | 9.34 Concurreny off                                                | 9.34 Concurreny 6                                              |
| --------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| ![8.10.0](../img/cpu-eslint-8.10.0.png) | ![9.34 Concurreny off](../img/cpu-eslint-9.34-concurrency-off.png) | ![9.34 Concurreny 6](../img/cpu-eslint-9.34-concurrency-6.png) |

### Load test Eslint on GitHub Actions runners

**Steps:**

1. Add source code to the repo (e.g. `tools/eslint-perf.nx-plugin.js`)
2. Add plugin to `nx.json`
3. Add `.env` with all optimizations and Nx logs disabled, and Timing enabled
4. Add GitHub Actions workflow (e.g. `.github/workflows/eslint-bench.yml`)
5. (Optional) Run manually: `npx nx run-many -t lint-*`

**Output:**


## Benchmark Setup

### General setup

To have a comparable setup, I created a set of defaults and code targets that are shared across all tests.

#### Environment Variables

_.env_

```bash
# == ESLINT ==

# Eslint timing logs (needs --stats in args; first 15 sorted by time ascending)
TIMING=15

# Ensure verbose logging is off (default, but explicit)
export NX_VERBOSE_LOGGING=false

# == Nx ==
# Many flags are shorthands and disable multiple other features.
# The below settings are DO contain duplicates for clarity.

# Disable Nx TUI
export NX_TUI=false           # Disable Nx terminal UI

# Disable Terminal UI (TUI) - no interactive interface
export NX_TUI=false

# Use simple, non-dynamic output (CI-style)
export NX_TASKS_RUNNER_DYNAMIC_OUTPUT=false

# Disable log grouping
export NX_SKIP_LOG_GROUPING=true

# Disable generation logging (if using generators)
export NX_GENERATE_QUIET=true


# Disable all caching
export NX_SKIP_NX_CACHE=true           # Disable local cache
export NX_SKIP_REMOTE_CACHE=true       # Disable remote cache (Nx Cloud)

# Disable daemon
export NX_DAEMON=false                  # Disable Nx daemon process

# Disable parallelization
export NX_PARALLEL=1                    # Run tasks sequentially (1 at a time)

# Disable batching
export NX_BATCH_MODE=false              # Disable task batching
```

#### EsLint command

```bash
# Base eslint command assuming all env vars are set
npx -y eslint@<version> --config=<eslintconfig> --stats

# Version comparison command
npx -y eslint@8.57.0 --config=<eslintconfig> --stats
npx -y eslint@9.34.0 --config=<eslintconfig> --stats
# Concurrency flag comparison command (values are: off,1,2,4,6,8,auto)
npx -y eslint@9.34.0 --config=<eslintconfig> --stats --concurrency=<concurrency>
```

### CPU Profiling

In this section, I measure how the scheduling is implemented and how the work is distributed across threads.

#### Profiling Script

```bash
# Profile CPU usage while running ESLint
npx @push-based/cpu-prof@latest -- \
  npx eslint --config packages/lib-a/eslint.config.js \
  "." \
  --concurrency=4
```

What this does:

- Starts ESLint with Node CPU profiling enabled and collects `.cpuprofile` files
- Merges them into a single Chrome trace JSON for easy inspection `trace.json

#### Example File Output

```txt
root/
 └── profiles/
     ├── CPU-<default-name>.cpuprofile
     ├── MAIN-CPU-<default-name>-<command-as-base64>.cpuprofile
     └── trace.json # Merged trace JSON for DevTools
```

#### DevToolsExample Output

| 8.10.0                                  | 9.34 Concurreny off                                                | 9.34 Concurreny 6                                              |
| --------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| ![8.10.0](../img/cpu-eslint-8.10.0.png) | ![9.34 Concurreny off](../img/cpu-eslint-9.34-concurrency-off.png) | ![9.34 Concurreny 6](../img/cpu-eslint-9.34-concurrency-6.png) |

### EsLint Timing

This section looks at the EsLint native timing stats provided over the `--stats` option.

```bash
npx -y @push-based/eslint-stats@latest npx -y eslint@8.57.0 --config=testing/utils/eslint.config.mjs testing/utils 
npx -y @push-based/eslint-stats@latest -- npx -y eslint@9.34.0 --config=testing/utils/eslint.config.mjs testing/utils --concurrency=4
```

**Output 8.57.0:**

| Rules | Time ↓ | 🚨 Errors | ⚠️  Warnings |
|----------------------------------------|-----------|-----------|--------------|
|   @typescript-eslint/no-unused-vars    |      70ms |         0 |           20 |
|   @nx/enforce-module-boundaries        |      30ms |         1 |            0 |
|   no-useless-escape                    |      10ms |         0 |            0 |
|   no-misleading-character-class        |       8ms |         0 |            0 |
|   @typescript-eslint/no-empty-function |       5ms |         4 |            0 |
|   no-var                               |       3ms |         0 |            0 |
|   no-control-regex                     |       3ms |         2 |            0 |
|   no-useless-backreference             |       3ms |         0 |            0 |
|   no-regex-spaces                      |       2ms |         0 |            0 |
|   no-global-assign                     |       2ms |         0 |            0 |


**Output 9.34.0:**

| Rules | Time ↓ | 🚨 Errors | ⚠️  Warnings |
|----------------------------------------|-----------|-----------|--------------|
|   @typescript-eslint/no-unused-vars    |      70ms |         0 |           20 |
|   @nx/enforce-module-boundaries        |      30ms |         1 |            0 |
|   no-useless-escape                    |      10ms |         0 |            0 |
|   no-misleading-character-class        |       8ms |         0 |            0 |
|   @typescript-eslint/no-empty-function |       5ms |         4 |            0 |
|   no-var                               |       3ms |         0 |            0 |
|   no-control-regex                     |       3ms |         2 |            0 |
|   no-useless-backreference             |       3ms |         0 |            0 |
|   no-regex-spaces                      |       2ms |         0 |            0 |
|   no-global-assign                     |       2ms |         0 |            0 |


### Benchmarking the different eslint versions (default behavior)

In this section, I benchmark the different eslint versions.

```bash
node --import tsx ./eslint-concurrency-bench.ts \
   --config=packages/lib-a/eslint.config.js
  --patterns="packages/lib-a/**/*.ts,packages/lib-a/**/*.tsx" \
  --runs=3 \
  --verbose
```

### Benchmarking the `--concurrency` option in Eslint v9.34+

In this section, I benchmark the `--concurrency` option across different targets and concurrency settings.

```bash
node --import tsx ./eslint-concurrency-bench.ts \
   --config=packages/lib-a/eslint.config.js
  --patterns="packages/lib-a/**/*.ts,packages/lib-a/**/*.tsx" \
  --concurrency=off,1,2,4,6,8,auto \
  --runs=3 \
  --verbose
```

### Nx Plugin to apply in existing projects

In any project, you can apply the following plugin to enable the `--concurrency` option.

_plugin.js_

```ts

import { dirname } from 'node:path';

function buildEslintCommand({
  eslintVersion,
  maxWarnings = 0,
  patterns,
  config,
}) {
  const eslintCmd = eslintVersion
    ? `npx -y eslint@${eslintVersion}`
    : 'npx eslint';

  return [
    eslintCmd,
    `--config ${config}`,
    ...(maxWarnings ? [`--max-warnings ${maxWarnings}`] : []),
    '--no-error-on-unmatched-pattern',
    '--no-warn-ignored',
    patterns.join(' '),
  ]
    .filter(Boolean)
    .join(' ');
}

const createNodesV2 = [
  '**/project.json',
  async (projectConfigurationFiles, opts = {}, context) => {
    if (
      !Array.isArray(projectConfigurationFiles) ||
      projectConfigurationFiles.length === 0
    ) {
      return [];
    }

    const {
      patterns = ['.'],
      targetName = 'lint',
      maxWarnings = 0,
      config = 'eslint.config.ts',
      eslintVersion = undefined,
    } = opts;

    const versionedTargetName = eslintVersion
      ? `${targetName}-${eslintVersion.replace(/\./g, '')}`
      : targetName;

    return await Promise.all(
      projectConfigurationFiles.map(async (projectConfigFile) => {
        const projectRoot = dirname(projectConfigFile);
        const result = {
          projects: {
            [projectRoot]: {
              targets: {
                [versionedTargetName]: {
                  executor: 'nx:run-commands',
                  options: {
                    command: buildEslintCommand({
                      eslintVersion,
                      maxWarnings,
                      config,
                      patterns,
                    }),
                  },
                  metadata: {
                    description: `Run eslint${
                      eslintVersion ? `@${eslintVersion}` : ''
                    }`,
                    technologies: ['eslint'],
                  },
                  cache: false,
                },
              },
            },
          },
        };

        return [projectConfigFile, result];
      })
    );
  },
];

const plugin = {
  createNodesV2,
  name: 'eslint-benchmark-target',
};

export default plugin;
```

_nx.json_

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "plugins": [
    {
      "plugin": "./tools/src/eslint-concurrency-target/eslint-concurrency-target.plugin.js",
      "options": {
        "eslintVersion": "9.34.0"
      }
    },
    {
      "plugin": "./tools/src/eslint-concurrency-target/eslint-concurrency-target.plugin.js",
      "options": {
        "eslintVersion": "8.57.0"
      }
    }
  ]
}
```

### GitHub Actions

This is the GitHub Actions workflow that I used to benchmark the different eslint versions and concurrency settings across large codebases managed by Nx DevTools.

**Job Matrix `eslint-version-benchmark`:**

|      Version/OS | ubuntu-latest | windows-latest | macos-latest |
| --------------: | :-----------: | :------------: | :----------: |
| `eslint@8.10.0` |      ✅       |       ✅       |      ✅      |
| `eslint@9.34.0` |      ✅       |       ✅       |      ✅      |

**Job Matrix `eslint-concurrency-benchmark`:**

|       Concurrency/OS | ubuntu-latest | windows-latest | macos-latest |
| -------------------: | :-----------: | :------------: | :----------: |
|  `--concurrency=off` |      ✅       |       ✅       |      ✅      |
|    `--concurrency=2` |      ✅       |       ✅       |      ✅      |
|    `--concurrency=4` |      ✅       |       ✅       |      ✅      |
|    `--concurrency=6` |      ✅       |       ✅       |      ✅      |
| `--concurrency=auto` |      ✅       |       ✅       |      ✅      |

```yml
name: ESLint Benchmarks

on:
  push:
    branches: [main]

env:
  NX_NON_NATIVE_HASHER: true
  NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}
  # Disable Nx optimizations for clean perf measurement
  NX_TUI: false
  NX_TASKS_RUNNER_DYNAMIC_OUTPUT: false
  NX_SKIP_LOG_GROUPING: true
  NX_GENERATE_QUIET: true
  NX_PERF_LOGGING: false
  NX_SKIP_NX_CACHE: true
  NX_SKIP_REMOTE_CACHE: true
  NX_DAEMON: false
  NX_PARALLEL: 1
  NX_BATCH_MODE: false
  NX_VERBOSE_LOGGING: false
  # Show timing for 15 slowest files
  TIMING: 15

jobs:
  eslint-version-benchmark:
    runs-on: ${{ matrix.os }}
    name: eslint@${{ matrix.eslint }} (${{ matrix.os }})
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        eslint: ['8.10.0', '9.34.0']
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Use ESLint version ${{ matrix.eslint }}
        run: npm i -D eslint@${{ matrix.eslint }}
      - name: Run lint (versions)
        run: npx nx run-many -t lint --exclude models-transformers --stats

  eslint-concurrency-benchmark:
    runs-on: ${{ matrix.os }}
    name: concurrency=${{ matrix.concurrency }} (${{ matrix.os }})
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        concurrency: ['off', '2', '4', '6', 'auto']
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Run lint (concurrency ${{ matrix.concurrency }})
        run: npx nx run-many -t lint --exclude models-transformers --stats --concurrency ${{ matrix.concurrency }}
```
