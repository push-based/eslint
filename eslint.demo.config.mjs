// Demo config for the talk "Every Process, One Flame Chart".
// Type-aware linting: typescript-eslint builds a TypeScript program to get type information.
// With --concurrency, every worker thread builds its own program.
// All rules report as warnings, so the demo exits with 0 and prints only a short summary.
import tseslint from 'typescript-eslint';

const asWarning = (entry) =>
  entry === 'off' || entry === 0 || (Array.isArray(entry) && (entry[0] === 'off' || entry[0] === 0))
    ? entry
    : Array.isArray(entry) ? ['warn', ...entry.slice(1)] : 'warn';

const warnOnly = (configs) =>
  configs.map((c) => c.rules
    ? { ...c, rules: Object.fromEntries(Object.entries(c.rules).map(([k, v]) => [k, asWarning(v)])) }
    : c);

export default tseslint.config(
  {
    ignores: ['**/dist', '**/node_modules', '**/mocks', '**/*.js', '**/*.mjs', '**/*.mts', '**/*.config.ts'],
  },
  // The repo's inline disable comments name rules this config doesn't load.
  { linterOptions: { noInlineConfig: true } },
  ...warnOnly(tseslint.configs.recommendedTypeChecked),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
