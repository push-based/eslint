/*
ESLint Concurrency Benchmark

Overview: Benchmarks ESLint v9+ --concurrency across one or more configs, repeats runs, and reports fastest-per-config plus per-config breakdowns.

Options
| Option        | Type                               | Default                         | Description                                                                 |
| ------------- | ---------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| --configs     | `string[]`                          | required                         | Comma-separated ESLint config file paths                                     |
| --concurrency | `('off' \| 'auto' \| number)[]`    | `off,4,8,auto`                   | Concurrency values to benchmark                                             |
| --runs        | `number`                            | `3`                              | Runs per concurrency setting                                                |
| --verbose     | `boolean`                           | `false`                          | No additional output (deprecated)                                           |
| --outDir      | `string`                            | `./tools/eslint-perf/results`    | Directory for JSON + summary outputs                                        |
| --tsOnly      | `boolean`                           | `true`                           | Lint only *.ts files; when false, lints entire config directory             |

Examples
- Auto-discovery:
  node ./eslint-concurrency-bench.ts

- Custom configs + concurrency:
  node ./eslint-concurrency-bench.ts \
    --configs=packages/eslint-stats/eslint.config.mjs,testing/utils/eslint.config.mjs \
    --concurrency=off,2,4,auto \
    --runs=5
*/
import { exec as execCb } from 'node:child_process';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execCb);

type C = 'off' | 'auto' | `${number}`;
type Run = {
  config: string;
  concurrency: C;
  run: number;
  timing: {
    durationSeconds: number;
    realTimeSeconds: null;
    userTimeSeconds: null;
    sysTimeSeconds: null;
  };
  eslintResults: {
    filesProcessed: number;
    errors: number;
    warnings: number;
    eslintWarnings: string[];
  };
  timestamp: string;
};
type Stats = {
  runs: number;
  min: number;
  max: number;
  avg: number;
  stdDev: number;
};
type CI = {
  config: string;
  tsFiles: number;
  jsFiles: number;
  totalFiles: number;
};

const DFLT_CONFIGS: string[] = [];
const DFLT_CONC: C[] = ['off', '4', '8', 'auto'];
const DFLT_RUNS = 3;
const pad = (s: string, n: number) =>
  s.length >= n ? s : s + ' '.repeat(n - s.length);
const exists = async (p: string) => !!(await stat(p).catch(() => null));
const ensureDir = (d: string) => mkdir(d, { recursive: true });

async function discoverConfigs(baseDir: string): Promise<string[]> {
  const found: string[] = [];
  const walk = async (dir: string) => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (['node_modules', 'dist', 'coverage'].includes(e.name)) continue;
        await walk(p);
      } else if (e.isFile() && e.name === 'eslint.config.js') {
        found.push(p);
      }
    }
  };
  await walk(baseDir);
  return found;
}

function args() {
  const a = process.argv.slice(2);
  const get = (n: string) =>
    a.find((x) => x.startsWith(`--${n}=`))?.split('=')[1];
  const configs = get('configs')?.split(',').filter(Boolean) ?? [];
  const conc =
    (get('concurrency')?.split(',').filter(Boolean) as C[] | undefined) ??
    DFLT_CONC;
  const runs = Number.parseInt(get('runs') ?? `${DFLT_RUNS}`, 10);
  const outDir = get('outDir') ?? path.join('tools', 'eslint-perf', 'results');
  const verbose = a.includes('--verbose') || get('verbose') === 'true';
  const tsOnly = get('tsOnly') === 'false' ? false : true;
  if (!configs.length) {
    console.error(
      'Error: --configs is required (comma-separated list of ESLint config file paths).'
    );
    process.exit(1);
  }
  return { configs, conc, runs, outDir, verbose, tsOnly };
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

async function count(dir: string, exts: string[]) {
  let n = 0;
  const w = async (d: string): Promise<void> => {
    const es = await readdir(d, { withFileTypes: true });
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (['node_modules', 'dist', 'coverage'].includes(e.name)) continue;
        await w(p);
      } else if (e.isFile() && exts.some((ext) => e.name.endsWith(ext))) n++;
    }
  };
  await w(dir);
  return n;
}
async function info(cfgPath: string): Promise<CI> {
  const cfgAbs = path.resolve(cfgPath);
  const dir = path.dirname(cfgAbs);
  if (!(await exists(dir)))
    return { config: cfgPath, tsFiles: 0, jsFiles: 0, totalFiles: 0 };
  const ts = await count(dir, ['.ts', '.tsx']);
  const js = await count(dir, ['.js', '.jsx', '.mjs', '.cjs']);
  return { config: cfgPath, tsFiles: ts, jsFiles: js, totalFiles: ts + js };
}
type TE = CI;

const cmd = (cfgPath: string, c: C, o: { ts: boolean; json: boolean }) => {
  const cfgAbs = path.resolve(cfgPath);
  const dir = path.dirname(cfgAbs);
  const targetPath = o.ts ? path.join(dir, '**', '*.ts') : dir;
  return `npx eslint --config=${JSON.stringify(cfgAbs)} --concurrency=${c} ${
    o.json ? '--format=json' : '--format=stylish'
  } ${JSON.stringify(targetPath)}`;
};

async function once(
  cfgPath: string,
  c: C,
  i: number,
  v: boolean,
  ts: boolean
): Promise<Run> {
  const s = process.hrtime.bigint();
  const k = cmd(cfgPath, c, { ts, json: true });
  let out = '',
    err = '';
  try {
    const r = await exec(k, { maxBuffer: 1024 * 1024 * 200 });
    out = r.stdout;
  } catch (e: any) {
    out = e.stdout ?? '';
  }
  const d = Number(process.hrtime.bigint() - s) / 1_000_000_000;
  let files = 0,
    errors = 0,
    warnings = 0;
  try {
    const j = JSON.parse(out) as Array<{
      errorCount: number;
      warningCount: number;
    }>;
    files = j.length;
    for (const r of j) {
      errors += r.errorCount || 0;
      warnings += r.warningCount || 0;
    }
  } catch {}
  const warns = err.includes('ESLintPoorConcurrencyWarning')
    ? ['ESLintPoorConcurrencyWarning']
    : [];
  return {
    config: cfgPath,
    concurrency: c,
    run: i,
    timing: {
      durationSeconds: d,
      realTimeSeconds: null,
      userTimeSeconds: null,
      sysTimeSeconds: null,
    },
    eslintResults: {
      filesProcessed: files,
      errors,
      warnings,
      eslintWarnings: warns,
    },
    timestamp: new Date().toISOString(),
  };
}

const statz = (xs: number[]): Stats => {
  const n = xs.length,
    min = Math.min(...xs),
    max = Math.max(...xs),
    avg = xs.reduce((a, b) => a + b, 0) / n,
    sd = Math.sqrt(xs.reduce((a, v) => a + (v - avg) ** 2, 0) / n);
  return {
    runs: n,
    min,
    max,
    avg: Number(avg.toFixed(3)),
    stdDev: Number(sd.toFixed(3)),
  };
};

async function stylish(cfgPath: string) {
  const k = cmd(cfgPath, 'off', { ts: true, json: false });
  try {
    const { stdout, stderr } = await exec(k, { maxBuffer: 1024 * 1024 * 200 });
    if (stdout.trim()) {
      console.log('    [stylish output]');
      console.log(
        stdout
          .split('\n')
          .slice(0, 300)
          .map((l) => `    ${l}`)
          .join('\n')
      );
    }
    if (stderr.trim()) {
      console.log('    [stylish stderr]');
      console.log(
        stderr
          .split('\n')
          .map((l) => `    ${l}`)
          .join('\n')
      );
    }
  } catch (e: any) {
    const o = e.stdout ?? '',
      er = e.stderr ?? '';
    if (o.trim()) {
      console.log('    [stylish output]');
      console.log(
        o
          .split('\n')
          .slice(0, 300)
          .map((l: string) => `    ${l}`)
          .join('\n')
      );
    }
    if (er.trim()) {
      console.log('    [stylish stderr]');
      console.log(
        er
          .split('\n')
          .map((l: string) => `    ${l}`)
          .join('\n')
      );
    }
  }
}

async function main() {
  const { configs: inputConfigs, conc, runs, outDir, verbose, tsOnly } = args();
  const configs = inputConfigs;
  await ensureDir(outDir);
  const si = await sys(),
    ts = new Date().toISOString().replace(/[:.]/g, '-');
  const resPath = path.join(outDir, `eslint-benchmark-${ts}.json`),
    sumPath = path.join(outDir, `eslint-benchmark-${ts}.summary.md`);
  const results: any[] = [];
  await writeFile(
    path.join(outDir, `system-info-${ts}.json`),
    JSON.stringify(si, null, 2)
  );
  for (const cfg of configs) {
    const cfgAbs = path.resolve(cfg);
    if (!(await exists(cfgAbs))) {
      console.warn(`Skipping missing config: ${cfg}`);
      continue;
    }
    const ci = await info(cfg);
    console.log(`\n📄 Config: ${cfg}`);
    for (const c of conc) {
      console.log(`  🔧 Concurrency: ${c}`);
      const rs: Run[] = [];
      for (let i = 1; i <= runs; i++) {
        console.log(`    Run ${i}/${runs} ...`);
        const r = await once(cfg, c, i, verbose, tsOnly);
        rs.push(r);
        console.log(`      Time: ${r.timing.durationSeconds.toFixed(3)}s`);
      }
      const stats = statz(rs.map((r) => r.timing.durationSeconds));
      console.log(`  ⚙️  ${c}: ${stats.avg}s (±${stats.stdDev}s)`);
    }
  }
}

main();
