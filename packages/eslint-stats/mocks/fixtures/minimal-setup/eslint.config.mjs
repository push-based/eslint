export default [
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single']
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single']
    },
  },
];
