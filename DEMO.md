# Talk demo: parallel ESLint is slower

For the talk "Every Process, One Flame Chart" (Michael Hladky). Branch `talk-demo`.

`eslint.demo.config.mjs` lints `packages/eslint-stats`, `packages/eslint-next` and `testing/utils`
with type-aware linting (typescript-eslint `recommendedTypeChecked`, `projectService`). Rules
report as warnings and the report goes to `tmp/lint-report.json`, so the terminal stays clean.

Needs Node 24 (`nvm use`) and ESLint ≥ 9.34 for `--concurrency` (installed: 9.39.5).

## Before the talk

```bash
nvm use
npm run demo:prepare   # runs every demo once and copies the results to demo-fallback/
```

Run it twice: the first run warms the disk cache. Open Chrome with DevTools → Performance.

## Demo 1 · Plain vs parallel (§1)

```bash
time npm run demo:lint            # eslint -c eslint.demo.config.mjs <3 folders>
time npm run demo:lint:parallel   # … --concurrency=3, slower
```

## Demo 2 · The empty profile (§2)

```bash
npm run demo:empty   # node --cpu-prof --cpu-prof-dir=profiles/empty … --concurrency=3
```

Drag `profiles/empty/CPU.…<pid>.0.001.cpuprofile` (TID 0, the initial process) into DevTools:
nearly all `(idle)`. The other three files are the workers; §3 explains them.

## Demo 3 · The proof (§5)

```bash
npm run demo:stitch         # cpu-prof measure … --concurrency=3 → profiles/parallel/Trace-….json
npm run demo:stitch:plain   # the plain run, for comparison → profiles/plain/Trace-….json
```

Drag `profiles/parallel/Trace-….json` into DevTools: one main lane (idle), three
`WorkerThread` lanes. Search for `createProgram`: it shows up in all three worker lanes (in short
bursts, one per tsconfig project). In the plain trace it shows up in the one main lane.

## If something fails

Open the same files from `demo-fallback/`.

## Measured 2026-11-18 (Linux VM, 4 cores, Node 24.22, ESLint 9.39.5; re-measure on the Mac)

| Run | Wall time | `createProgram` |
| --- | --- | --- |
| plain | 1,719 ms median (5 runs: 1,711 / 1,741 / 1,721 / 1,719 / 1,696) | 1 × 585 ms |
| `--concurrency=3` | 2,389 ms median (5 runs: 2,389 / 2,379 / 2,390 / 2,293 / 2,451) | 3 × 786–1,053 ms |

Main thread of the parallel run: 2,399 of 2,633 ms `(idle)`.

## Known cpu-prof issues (1.0.4)

- `--output-file` is passed on as `--outputFile` (camel-cased), so ESLint rejects it. Use `-o`.
- The default `--flagMain` puts the whole command, base64-encoded, into the file name; long
  commands fail with `ENAMETOOLONG`. The scripts use `--no-flagMain`.
