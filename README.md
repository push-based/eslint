# ESLint Tools - Analysis, Migration & Performance

A collection of powerful tools for ESLint analysis, migration, and performance optimization.

- [@push-based/eslint-stats](./packages/eslint-stats/README.md) 🚀
- [@push-based/eslint-next](./packages/eslint-next/README.md) ⏭️

## Project Overviews 🌟

### [@push-based/eslint-stats](./packages/eslint-stats/README.md) 🚀

This package provides comprehensive tools for ESLint performance analysis and reporting. It allows you to collect, analyze, and visualize ESLint timing statistics to identify performance bottlenecks and optimize your linting process. Key features include:

- **Performance Analysis**: Analyze ESLint timing statistics from JSON files
- **Flexible Grouping**: Group results by rule, file, or file-rule combinations
- **Smart Sorting**: Sort by time consumption or violation count
- **Interactive Mode**: Dynamic exploration of timing data
- **Export Capabilities**: Generate Markdown reports for documentation and sharing
- **CLI and API**: Both command-line interface and programmatic TypeScript API
- **Measurement Tools**: Built-in ESLint wrapper for collecting performance stats

Perfect for identifying slow rules, analyzing large codebases, and optimizing ESLint configurations for better developer experience.

### [@push-based/eslint-next](./packages/eslint-next/README.md) ⏭️

This tool focuses on enterprise-ready ESLint configuration migration and incremental rule adoption. It enables seamless migration to new ESLint rules without breaking existing workflows. Key features include:

- **Incremental Migration**: Gradually adopt new ESLint rules without overwhelming changes
- **Idempotent Updates**: Safely adapts configurations with every run
- **Backup Configurations**: Retains original setups for reference and progressive migration
- **Failproof Execution**: Ensures all lint targets pass by disabling problematic rules
- **Progress Tracking**: Monitor migration progress through automated reports
- **Workspace Support**: Handles both standalone and package-based workspaces
- **Nx Integration**: First-class support for Nx monorepos
- **Flexible Strategies**: Multiple configuration strategies for different project needs

Ideal for large-scale projects looking to modernize their ESLint configurations without disrupting development workflows.
