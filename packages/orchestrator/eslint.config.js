/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    files: ['**/*.js', '**/*.jsx'],
    ignores: ['node_modules/**', 'dist/**', '.turbo/**', 'build/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-throw-literal': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['node_modules/**', 'dist/**', '.turbo/**', 'build/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      // Disable no-undef for TypeScript files (TypeScript handles this)
      'no-undef': 'off',
      'no-unused-vars': 'off', // TypeScript handles this better
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-throw-literal': 'error',
    },
  },
];