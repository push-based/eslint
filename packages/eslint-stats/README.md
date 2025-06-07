**Test PoC:**
- Original: `TIMING=10 nx run cpu-prof:lint --output-file=/Users/michael_hladky/WebstormProjects/cpu-prof/eslint-stats.json --format=json --stats`
- PoC: `tsx packages/cpu-prof/src/lib/eslint-stats/bin/demo.ts /Users/michael_hladky/WebstormProjects/cpu-prof/eslint-stats.json rule`    

**Commands Todo:**
- $ `eslint-stats` | `eslint-stats stats`
  - `--groupBy` | `-g` - `rule` | `file` - group the rules by rule name or file name
  - `--take` | `-t` - `number` - of top rules to show (sorted by msTime)
- $ `eslint-stats merge`
  - `--outputFile` | `-o` - `string` - output file for merged stats (relative or absolute path handled in command handler);

│ (index) │ identifier                       │ timeMs   │ relative.       │ identifier         │  timeMs │ relative        │
├─────────┼──────────────────────────────────┼──────────┼─────────────────┤────────────────────┼─────────┼─────────────────┤
│ 0       │ '/exmpl-create-threads.js'       │ '10.287' │ '7.4%'          │                    │         │                 │
│ 0       │                                  │          │                 │ 'no-any'           │'3.287'  │ '0.4%'          │
│ 1       │                                  │          │                 │ 'no-implicit-any'  │'2.287'  │ '0.4%'          │
│ 2       │                                  │          │                 │ '4.287'            │'4.287'  │ '0.4%'          │
