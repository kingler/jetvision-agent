/** @type {import('eslint').Linter.Config[]} */
module.exports = [
    {
        files: ['**/*.js', '**/*.jsx'],
        ignores: ['node_modules/**', 'dist/**', '.turbo/**'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                module: 'readonly',
                require: 'readonly',
                process: 'readonly',
                console: 'readonly',
            },
        },
        rules: {
            'no-undef': 'error',
            'no-unused-vars': 'warn',
            'no-console': 'warn',
            'prefer-const': 'error',
        },
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        ignores: ['node_modules/**', 'dist/**', '.turbo/**'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parser: require('@typescript-eslint/parser'),
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
                project: './tsconfig.json',
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                React: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
            react: require('eslint-plugin-react'),
        },
        rules: {
            'no-undef': 'off',
            'no-unused-vars': 'off',
            'no-console': 'warn',
            'prefer-const': 'error',
            '@typescript-eslint/no-unused-vars': 'warn',
            'react/jsx-uses-react': 'off',
            'react/react-in-jsx-scope': 'off',
        },
    },
];
