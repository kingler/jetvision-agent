/** @type {import('jest').Config} */
const config = {
    // Test environment
    testEnvironment: 'jsdom',

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    setupFiles: ['<rootDir>/jest.env.js'],

    // Module directories
    moduleDirectories: ['node_modules', '<rootDir>/'],

    // Handle module aliases and path mapping
    moduleNameMapper: {
        // CSS and asset imports
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
            'jest-transform-stub',

        // TipTap mocks
        '^@tiptap/react$': '<rootDir>/__mocks__/@tiptap/react.js',
        '^@tiptap/core$': '<rootDir>/__mocks__/@tiptap/core.js',

        // Path aliases
        '^@/(.*)$': '<rootDir>/apps/web/$1',
        '^@repo/common/(.*)$': '<rootDir>/packages/common/$1',
        '^@repo/ai/(.*)$': '<rootDir>/packages/ai/$1',
        '^@repo/shared/(.*)$': '<rootDir>/packages/shared/$1',
        '^@repo/ui/(.*)$': '<rootDir>/packages/ui/$1',
        '^@repo/actions/(.*)$': '<rootDir>/packages/actions/$1',
        '^@repo/(.*)$': '<rootDir>/packages/$1',
    },

    // File transformations
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: {
                    jsx: 'react-jsx',
                },
            },
        ],
        '^.+\\.(js|jsx)$': 'babel-jest',
    },

    // Test file patterns
    testMatch: [
        '<rootDir>/apps/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
        '<rootDir>/packages/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
        '<rootDir>/apps/**/*.(test|spec).(js|jsx|ts|tsx)',
        '<rootDir>/packages/**/*.(test|spec).(js|jsx|ts|tsx)',
    ],

    // Ignore patterns
    testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/apps/web/.next/',
        '<rootDir>/apps/web/out/',
        '<rootDir>/apps/web/e2e/',
        '<rootDir>/e2e/',
    ],

    // Coverage configuration
    collectCoverageFrom: [
        'apps/**/*.{js,jsx,ts,tsx}',
        'packages/**/*.{js,jsx,ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/.next/**',
        '!**/coverage/**',
        '!apps/web/app/globals.css',
        '!apps/web/tailwind.config.js',
        '!apps/web/next.config.js',
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 80,
            statements: 80,
        },
    },

    // Other settings
    verbose: true,
    maxWorkers: '50%',

    // Handle ES modules
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    preset: 'ts-jest/presets/default-esm',

    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    // Transform ignore patterns for ES modules
    transformIgnorePatterns: [
        'node_modules/(?!(nanoid|@tiptap|framer-motion|@tabler)/)',
    ],
};

module.exports = config;
