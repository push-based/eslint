# @push-based/eslint-stats

---

## ESLint Performance Analysis and Reporting

The `@push-based/eslint-stats` package provides tools and utilities for collecting, and analyzing ESLint timing profiles.
Measure, sort, filter, print, voilà.

## Features

- **ESLint Performance Analysis**:
  - Analyze ESLint timing statistics from a JSON file.
  - Group results by rule, file, or a combination of file and rule.
  - Sort the aggregated results by time consumption or violation count.
  - Interactive mode to dynamically explore the timing data.
  - Export analysis results to a Markdown file for documentation and sharing.
- **TypeScript API**:
  - Programmatic access to all core features.
  - Use it in your own tools and workflows.

---

## How to Generate ESLint Stats

To analyze your ESLint performance, you first need to generate a statistics file. You can do this by running ESLint with the `--stats` flag and formatting the output as JSON.

```bash
npx eslint . --output-file eslint-stats.json --stats -f json
```

You can add a env variable to use eslints native printing to see [N] results in the terminal.

```bash
TIMING=10 npx eslint . --output-file eslint-stats.json --stats -f json
```

This command tells ESLint to lint the current directory (`.`), collect performance statistics (`--stats`), format the output as JSON (`-f json`), and save it to a file named `eslint-stats.json` (`--output-file`).

---

## Installation

```bash
npm install @push-based/eslint-stats
```

---

## CLI Usage

This guide provides instructions for using the `@push-based/eslint-stats` CLI.

### `measure` command

**Usage:**

```bash
npx @push-based/eslint-stats measure [args...] [options...]
```

**Description:**
Runs ESLint on a given set of files and measures timing stats. This command is a wrapper around the ESLint CLI, adding the ability to capture timing statistics.

**Arguments:**

| Argument        | Type       | Description                                                                                                                              |
| --------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **`[args...]`** | `string[]` | Arguments for ESLint, e.g., files, globs, or commands like `nx run my-app:lint`. If omitted, ESLint runs on the current directory. |

**ESLint Options:**

| Option              | Alias | Type     | Description                         |
| ------------------- | ----- | -------- | ----------------------------------- |
| **`--config`**      | `-c`  | `string` | Path to the ESLint config file.     |
| **`--output-file`** | `-o`  | `string` | File to write the ESLint output to. |

**Stats Options:**

| Option              | Type      | Default | Description                                     |
| ------------------- | --------- | ------- | ----------------------------------------------- |
| **`--file-output`** | `string`  |         | File to write the stats to.                     |
| **`--show`**        | `boolean` | `true`  | Show the stats report after running the command.  |
| **`--interactive`** | `boolean` | `true`  | Show the stats report as an interactive table. |

**Examples:**

- `eslint-stats measure "src/**/*.ts"` - Lint all TypeScript files in the `src` directory.
- `eslint-stats measure "src/**/*.ts" --config ./.eslintrc.ci.js --output-file eslint-report.json` - Lint files with a specific config and output file.
- `eslint-stats measure "src/**/*.ts" --file-output stats.json` - Lint files and save performance statistics to `stats.json`.
- `eslint-stats measure nx run project-name:lint` - Lint files using a command.

### `analyse` command

**Usage:**

```bash
npx @push-based/eslint-stats analyse <file> [options...]
```

**Description:**
Analyzes an ESLint statistics JSON file to provide insights into rule performance and violation counts. It can display the results in the console or save them to a Markdown file. An interactive mode is available for a more dynamic analysis experience.

**Arguments:**

| Argument     | Type     | Description                        |
| ------------ | -------- | ---------------------------------- |
| **`<file>`** | `string` | Path to the ESLint stats JSON file |

**Options:**

| Option                | Alias | Type      | Default         | Description                                                                                              |
| --------------------- | ----- | --------- | --------------- | -------------------------------------------------------------------------------------------------------- |
| **`--groupBy`**       | `-g`  | `string`  | `rule`          | Group by "rule", "file", or "file-rule". Choices: `rule`, `file`, `file-rule`.                           |
| **`--sortBy`**        | `-s`  | `string`  | `time`          | Sort by "time" or "violations". Choices: `time`, `violations`.                                           |
| **`--sortDirection`** | `-d`  | `string`  | `desc`          | Sort direction "asc" or "desc". Choices: `asc`, `desc`.                                                  |
| **`--take`**          | `-t`  | `array`   |                 | The number of entries to display. For `file-rule` group, two values can be provided for files and rules. |
| **`--outPath`**       |       | `string`  |                 | Path to the output file. Defaults to the input file name with a .md extension.                           |
| **`--interactive`**   |       | `boolean` | `true` (if TTY) | Interactive mode to dynamically explore the performance data.                                            |

**Examples:**

- `eslint-stats analyse ./eslint-stats.json` - Analyze the stats file with default options.
- `eslint-stats analyse ./eslint-stats.json --groupBy file` - Group the statistics by file.
- `eslint-stats analyse ./eslint-stats.json --sortBy violations` - Sort the results by the number of violations.
- `eslint-stats analyse ./eslint-stats.json --take 10` - Display only the top 10 entries.
- `eslint-stats analyse ./eslint-stats.json --outPath ./performance-report.md` - Save the analysis to a Markdown file.

#### Interactive Mode

When you run the `analyse` command in an interactive terminal, it will start in interactive mode by default. This mode allows you to change the grouping, sorting, and other options on the fly by pressing keys, providing a powerful way to explore your ESLint performance data without re-running the command multiple times.

---

## Additional Resources

- [ESLint Command Line Interface](https://eslint.org/docs/latest/use/command-line-interface) - Official ESLint CLI documentation.
- [ESLint Timing](https://eslint.org/docs/latest/extend/stats#enable-stats-collection) - Usage instructions for the stats flag.
