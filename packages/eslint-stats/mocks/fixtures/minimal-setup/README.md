# Minimal ESLint Setup

## Run Lint

Run `npx eslint .` to lint all files, or from repo root: `cd packages/eslint-stats/mocks/fixtures/minimal-setup/ && npx eslint .`
Two files have violations, one is clean. 

## Run ESLint Stats

Run `npx eslint . --stats --output-file eslint-stats.json --format json` to get stats on the lint results.
