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
            'no-undef': 'off',
            'no-unused-vars': 'off',
            'no-console': 'warn',
            'prefer-const': 'error',
            'no-var': 'error',
            '@typescript-eslint/no-unused-vars': 'warn',
        },
    },
];
