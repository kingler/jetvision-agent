/** @type {import('jest').Config} */
const config = {
    // Test environment
    testEnvironment: 'jsdom',

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/../../jest.setup.js'],
    setupFiles: ['<rootDir>/../../jest.env.js'],

    // Module directories
    moduleDirectories: ['node_modules', '<rootDir>/../../'],

    // Handle module aliases and path mapping
    moduleNameMapper: {
        // CSS and asset imports
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
            'jest-transform-stub',

        // TipTap mocks
        '^@tiptap/react$': '<rootDir>/../../__mocks__/@tiptap/react.js',
        '^@tiptap/core$': '<rootDir>/../../__mocks__/@tiptap/core.js',

        // Path aliases
        '^@/(.*)$': '<rootDir>/$1',
        '^@repo/common/(.*)$': '<rootDir>/../../packages/common/$1',
        '^@repo/ai/(.*)$': '<rootDir>/../../packages/ai/$1',
        '^@repo/shared/(.*)$': '<rootDir>/../../packages/shared/$1',
        '^@repo/ui/(.*)$': '<rootDir>/../../packages/ui/$1',
        '^@repo/actions/(.*)$': '<rootDir>/../../packages/actions/$1',
        '^@repo/(.*)$': '<rootDir>/../../packages/$1',
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

    // Test file patterns - only include actual test files, exclude e2e
    testMatch: [
        '<rootDir>/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
        '<rootDir>/src/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
        '<rootDir>/src/**/*.(test|spec).(js|jsx|ts|tsx)',
        '<rootDir>/components/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
        '<rootDir>/components/**/*.(test|spec).(js|jsx|ts|tsx)',
        '<rootDir>/lib/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
        '<rootDir>/lib/**/*.(test|spec).(js|jsx|ts|tsx)',
    ],

    // Ignore patterns - explicitly exclude e2e and other non-unit test directories
    testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/out/',
        '<rootDir>/e2e/',
        '<rootDir>/playwright/',
        '<rootDir>/cypress/',
        '.*\\.spec\\.ts$', // Exclude .spec.ts files (typically Playwright/E2E)
    ],

    // Coverage configuration
    collectCoverageFrom: [
        '**/*.{js,jsx,ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/.next/**',
        '!**/coverage/**',
        '!**/e2e/**',
        '!**/playwright/**',
        '!**/cypress/**',
        '!app/globals.css',
        '!tailwind.config.js',
        '!next.config.js',
        '!playwright.config.ts',
        '!**/*.spec.ts', // Exclude .spec.ts files from coverage
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 60,
            statements: 60,
        },
    },

    // Other settings
    verbose: true,
    maxWorkers: '50%',
    passWithNoTests: true, // Pass even if no test files are found

    // Handle ES modules
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    preset: 'ts-jest/presets/default-esm',

    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    // Transform ignore patterns for ES modules
    transformIgnorePatterns: [
        'node_modules/(?!(nanoid|@tiptap|framer-motion|@tabler)/)',
    ],

    // Root directory for Jest
    rootDir: '.',
};

module.exports = config;