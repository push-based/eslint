#! /usr/bin/env node

/*
ESLint Benchmark Script

Overview: Benchmarks ESLint across one or more configs or versions, repeats runs, and reports fastest-per-config plus per-config breakdowns.

Options
| Option        | Type                               | Default                         | Description                                                                 |
| ------------- | ---------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| --configs     | `string[]`                          | required                         | Comma-separated ESLint config file paths                                     |
| --eslintVersion | `string|string[]`                 | (installed)                      | Comma-separated ESLint versions (e.g. 8.57.0,9.34.0)                        |
| --concurrency | `('off' \| 'auto' \| number)[]`    | `off,4,8,auto`                   | Concurrency values to benchmark                                             |
| --runs        | `number`                            | `3`                              | Runs per concurrency setting                                                |
| --verbose     | `boolean`                           | `false`                          | No additional output (deprecated)                                           |
| --outDir      | `string`                            | `./tools/eslint-perf/results`    | Directory for JSON + summary outputs                                        |

Examples
  node ./eslint-perf.bench.js \
    --configs=packages/eslint-stats/eslint.config.mjs,testing/utils/eslint.config.mjs \
    --eslintVersion=8.57.0,9.34.0 \
    --concurrency=off,2,4,auto \
    --runs=5
*/
const { exec: execCb } = require('node:child_process');
const { mkdir, stat } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');

const exec = promisify(execCb);

const DFLT_RUNS = 3;
const exists = async (p) => !!(await stat(p).catch(() => null));
const ensureDir = (d) => mkdir(d, { recursive: true });

function args() {
  const a = process.argv.slice(2);
  const get = (n) =>
      a.find((x) => x.startsWith(`--${n}=`))?.split('=')[1];
  const configs = get('configs')?.split(',').filter(Boolean) ?? [];
  const conc = get('concurrency')?.split(',').filter(Boolean) ?? [];
  const runs = Number.parseInt(get('runs') ?? `${DFLT_RUNS}`, 10);
  const outDir = get('outDir') ?? path.join('tools', 'eslint-perf', 'results');
  const verbose = a.includes('--verbose') || get('verbose') === 'true';
  const eslintVersionStr = get('eslintVersion') ?? get('eslint');
  const eslintVersions = eslintVersionStr
      ? eslintVersionStr.split(',').map(s => s.trim()).filter(Boolean)
      : [null];
  if (!configs.length) {
    console.error(
        'Error: --configs is required (comma-separated list of ESLint config file paths).'
    );
    process.exit(1);
  }
  return { configs, conc, runs, outDir, verbose, eslintVersions };
}

async function sys() {
  const nx = await exec('npx nx --version')
      .then((r) => r.stdout.trim().split('\n')[0])
      .catch(() => null);
  return {
    timestamp: new Date().toISOString(),
    system: {
      os: os.platform(),
      osVersion: os.release(),
      architecture: os.arch(),
      cpuCores: os.cpus()?.length ?? 0,
      totalMemGb: Math.round((os.totalmem() / 1024 ** 3) * 100) / 100,
      hostname: os.hostname(),
    },
    software: {
      nodeVersion: process.version,
      npmVersion: (await exec('npm --version')).stdout.trim(),
      eslintVersion: (await exec('npx eslint --version')).stdout.trim(),
      nxVersion: nx,
    },
  };
}

const cmd = (cfgPath, c, o) => {
  const cfgAbs = path.resolve(cfgPath);
  const eslintCmd = o.eslintVersion ? `npx -y eslint@${o.eslintVersion}` : 'npx eslint';
  const concPart = c ? ` --concurrency=${c}` : '';
  return `${eslintCmd} --config=${JSON.stringify(cfgAbs)}${concPart} ${o.json ? '--format=json' : '--format=stylish'} ${JSON.stringify(path.dirname(cfgAbs))}`;
};

async function once(cfgPath, c, i, v, eslintVersion) {
  const s = process.hrtime.bigint();
  let out = '';
  try { out = (await exec(cmd(cfgPath, c, { json: true, eslintVersion }), { maxBuffer: 1024 * 1024 * 200 })).stdout; } catch (e) { out = e.stdout ?? ''; }
  const d = Number(process.hrtime.bigint() - s) / 1_000_000_000;
  let files = 0, errors = 0, warnings = 0;
  try { const j = JSON.parse(out); files = j.length; for (const r of j) { errors += r.errorCount || 0; warnings += r.warningCount || 0; } } catch {}
  return { config: cfgPath, concurrency: c, run: i, timing: { durationSeconds: d, realTimeSeconds: null, userTimeSeconds: null, sysTimeSeconds: null }, eslintResults: { filesProcessed: files, errors, warnings, eslintWarnings: [] }, timestamp: new Date().toISOString() };
}

const statz = (xs) => {
  const n = xs.length, min = Math.min(...xs), max = Math.max(...xs), avg = xs.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(xs.reduce((a, v) => a + (v - avg) ** 2, 0) / n);
  return { runs: n, min, max, avg: Number(avg.toFixed(3)), stdDev: Number(sd.toFixed(3)) };
};

async function runBenchmarkFor(cfg, ev, conc, runs, verbose) {
  const rows = [];
  const concList = conc.length ? conc : [null];
  for (const c of concList) {
    console.log(`\n  Command: ${cmd(cfg, c, { json: true, eslintVersion: ev })}`);
    const rs = [];
    for (let i = 1; i <= runs; i++) {
      const r = await once(cfg, c, i, verbose, ev);
      rs.push(r);
      console.log(`      Run ${i}/${runs} ... Time: ${r.timing.durationSeconds.toFixed(3)}s`);
    }
    const stats = statz(rs.map((r) => r.timing.durationSeconds));
    console.log(`    ⚙️  ${c ?? 'default'}: ${stats.avg}s (±${stats.stdDev}s)`);
    rows.push({ eslint: ev ?? 'installed', conc: c ? String(c) : 'not used', avg: stats.avg, stdDev: stats.stdDev });
  }
  return rows;
}

function printSummary(rows, si) {
  if (!rows.length) return;
  console.log(`\nSystem: ${si.system.os} ${si.system.architecture} (${si.system.osVersion}) | ${si.system.cpuCores} cores | ${si.system.totalMemGb} GB | Node.js ${si.software.nodeVersion}`);
  const baseByVersion = Object.create(null);
  for (const r of rows) if (r.conc === 'off') baseByVersion[r.eslint] = r.avg;
  const globalBaseline = Object.keys(baseByVersion).length === 0 ? Math.min(...rows.map((r) => r.avg)) : null;
  const bestAvg = Math.min(...rows.map((r) => r.avg));
  const display = rows.map((r) => ({
    ESLint: r.eslint,
    Concurrency: r.conc,
    'Avg(s)': Number(r.avg.toFixed(3)),
    StdDev: Number(r.stdDev.toFixed(3)),
    Speedup: baseByVersion[r.eslint] ? (baseByVersion[r.eslint] / r.avg).toFixed(2) + 'x' : globalBaseline ? (globalBaseline / r.avg).toFixed(2) + 'x' : 'n/a',
    Mark: Math.abs(r.avg - bestAvg) < 1e-6 ? '★' : '',
  }));
  display.sort((a, b) => a['Avg(s)'] - b['Avg(s)']);
  console.table(display);
}

async function main() {
  const { configs, conc, runs, outDir, verbose, eslintVersions } = args();
  await ensureDir(outDir);
  const si = await sys();
  const allRows = [];
  for (const cfg of configs) {
    const cfgAbs = path.resolve(cfg);
    if (!(await exists(cfgAbs))) { console.warn(`Skipping missing config: ${cfg}`); continue; }
    for (const ev of eslintVersions) allRows.push(...await runBenchmarkFor(cfg, ev, conc, runs, verbose));
  }
  printSummary(allRows, si);
}

main();
