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
            parser: require('@typescript-eslint/parser'),
            parserOptions: {
                project: './tsconfig.json',
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
        },
        rules: {
            // Disable no-undef for TypeScript files (TypeScript handles this)
            'no-undef': 'off',
            'no-unused-vars': 'off', // TypeScript handles this better
            'no-console': 'warn',
            'prefer-const': 'error',
            'no-var': 'error',
            'no-throw-literal': 'error',
            '@typescript-eslint/no-unused-vars': 'warn',
        },
    },
];
