// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Mock Next.js router
jest.mock('next/router', () => ({
    useRouter() {
        return {
            route: '/',
            pathname: '/',
            query: {},
            asPath: '/',
            push: jest.fn(),
            pop: jest.fn(),
            reload: jest.fn(),
            back: jest.fn(),
            prefetch: jest.fn().mockResolvedValue(undefined),
            beforePopState: jest.fn(),
            events: {
                on: jest.fn(),
                off: jest.fn(),
                emit: jest.fn(),
            },
        };
    },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
    }),
    useSearchParams: () => ({
        get: jest.fn(),
        has: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        toString: jest.fn(),
    }),
    usePathname: () => '/',
    useParams: () => ({}),
}));

// Mock Clerk authentication
jest.mock('@clerk/nextjs', () => ({
    useAuth: () => ({
        isSignedIn: true,
        userId: 'test-user-id',
        getToken: jest.fn().mockResolvedValue('test-token'),
    }),
    useUser: () => ({
        user: {
            id: 'test-user-id',
            firstName: 'Test',
            lastName: 'User',
            emailAddresses: [{ emailAddress: 'test@example.com' }],
        },
        isLoaded: true,
    }),
    SignInButton: ({ children }) => <button>{children}</button>,
    SignOutButton: ({ children }) => <button>{children}</button>,
    UserButton: () => <div data-testid="user-button">User</div>,
}));

jest.mock('@clerk/nextjs/server', () => ({
    auth: () => Promise.resolve({ userId: 'test-user-id' }),
    currentUser: jest.fn(() => Promise.resolve({ id: 'test-user-id' })),
    clerkClient: {
        users: {
            getUser: jest.fn(),
            updateUser: jest.fn(),
        },
    },
}));

// Mock TipTap extensions
jest.mock('@tiptap/react', () => ({
    Extension: {
        create: jest.fn(() => ({
            name: 'test-extension',
            addKeyboardShortcuts: jest.fn(),
        })),
    },
    useEditor: jest.fn(() => null),
    EditorContent: ({ children }) => <div data-testid="editor-content">{children}</div>,
}));

// Mock environment variables
process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/jetvision-agent';
process.env.N8N_API_KEY = 'test-api-key';

// Global test utilities
global.fetch = jest.fn();
global.AbortSignal = {
    timeout: jest.fn(() => ({
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    })),
};

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
    console.error = (...args) => {
        // Only show errors that aren't React warnings during tests
        const message = args[0];
        if (
            typeof message === 'string' &&
            !message.includes('Warning:') &&
            !message.includes('ReactDOM.render is no longer supported')
        ) {
            originalError(...args);
        }
    };

    console.warn = (...args) => {
        // Only show meaningful warnings
        const message = args[0];
        if (
            typeof message === 'string' &&
            !message.includes('Warning:') &&
            !message.includes('componentWillMount')
        ) {
            originalWarn(...args);
        }
    };
});

afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
});

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
    if (global.fetch.mockClear) {
        global.fetch.mockClear();
    }
});
