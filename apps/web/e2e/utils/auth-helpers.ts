import { Page, expect } from '@playwright/test';
import { TestUser, getSessionForUser } from '../fixtures/user-profiles';

export class AuthHelper {
    constructor(private page: Page) {}

    /**
     * Login with test user credentials
     */
    async loginAs(user: TestUser): Promise<void> {
        const session = getSessionForUser(user.id);
        if (!session) {
            throw new Error(`No session found for user ${user.id}`);
        }

        // Navigate to login page
        await this.page.goto('/login');

        // Wait for page to load
        await this.page.waitForLoadState('networkidle');

        // Mock Clerk authentication by setting localStorage
        await this.page.evaluate(
            authData => {
                localStorage.setItem('clerk-session', JSON.stringify(authData.session));
                localStorage.setItem('clerk-user', JSON.stringify(authData.user));
            },
            {
                session,
                user: {
                    id: user.id,
                    emailAddresses: [{ emailAddress: user.email }],
                    firstName: user.firstName,
                    lastName: user.lastName,
                    imageUrl: `https://img.clerk.com/placeholder/${user.id}`,
                    publicMetadata: user.metadata,
                },
            }
        );

        // Set auth cookies
        await this.page.context().addCookies([
            {
                name: '__session',
                value: session.accessToken,
                domain: 'localhost',
                path: '/',
                expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour
            },
        ]);

        // Navigate to main app
        await this.page.goto('/');

        // Wait for authentication to complete
        await this.page.waitForSelector('[data-testid="user-menu"]', { timeout: 10000 });

        // Verify user is logged in
        const userMenuText = await this.page.textContent('[data-testid="user-menu"]');
        expect(userMenuText).toContain(user.firstName);
    }

    /**
     * Logout current user
     */
    async logout(): Promise<void> {
        // Click user menu
        await this.page.click('[data-testid="user-menu"]');

        // Click logout
        await this.page.click('[data-testid="logout-button"]');

        // Wait for redirect to login
        await this.page.waitForURL('/login');

        // Clear local storage
        await this.page.evaluate(() => {
            localStorage.clear();
        });
    }

    /**
     * Verify user has required permissions
     */
    async verifyPermissions(requiredPermissions: string[]): Promise<void> {
        const userPermissions = await this.page.evaluate(() => {
            const userData = localStorage.getItem('clerk-user');
            if (!userData) return [];
            const user = JSON.parse(userData);
            return user.publicMetadata?.permissions || [];
        });

        for (const permission of requiredPermissions) {
            expect(userPermissions).toContain(permission);
        }
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        try {
            await this.page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get current user info from page
     */
    async getCurrentUser(): Promise<any> {
        return await this.page.evaluate(() => {
            const userData = localStorage.getItem('clerk-user');
            return userData ? JSON.parse(userData) : null;
        });
    }

    /**
     * Mock authentication state for testing
     */
    async mockAuthState(user: TestUser, authenticated: boolean = true): Promise<void> {
        if (authenticated) {
            const session = getSessionForUser(user.id);
            await this.page.addInitScript(
                authData => {
                    window.localStorage.setItem('clerk-session', JSON.stringify(authData.session));
                    window.localStorage.setItem(
                        'clerk-user',
                        JSON.stringify({
                            id: authData.user.id,
                            emailAddresses: [{ emailAddress: authData.user.email }],
                            firstName: authData.user.firstName,
                            lastName: authData.user.lastName,
                            publicMetadata: authData.user.metadata,
                        })
                    );
                },
                { session, user }
            );
        } else {
            await this.page.addInitScript(() => {
                window.localStorage.clear();
            });
        }
    }

    /**
     * Wait for authentication to complete
     */
    async waitForAuth(timeout: number = 10000): Promise<void> {
        await this.page.waitForFunction(
            () => {
                return window.localStorage.getItem('clerk-session') !== null;
            },
            { timeout }
        );
    }

    /**
     * Setup authentication interceptors for API calls
     */
    async setupAuthInterceptors(): Promise<void> {
        await this.page.route('**/api/**', async route => {
            const headers = { ...route.request().headers() };

            // Add auth header if user is logged in
            const session = await this.page.evaluate(() => {
                const sessionData = localStorage.getItem('clerk-session');
                return sessionData ? JSON.parse(sessionData) : null;
            });

            if (session?.accessToken) {
                headers['Authorization'] = `Bearer ${session.accessToken}`;
            }

            await route.continue({ headers });
        });
    }
}

/**
 * Quick login helper for tests
 */
export async function quickLogin(
    page: Page,
    userRole: 'admin' | 'user' | 'demo' = 'user'
): Promise<TestUser> {
    const { testUsers } = await import('../fixtures/user-profiles');
    const user = testUsers.find(u => u.role === userRole);

    if (!user) {
        throw new Error(`No test user found with role: ${userRole}`);
    }

    const authHelper = new AuthHelper(page);
    await authHelper.loginAs(user);

    return user;
}

/**
 * Ensure user is logged out
 */
export async function ensureLoggedOut(page: Page): Promise<void> {
    const authHelper = new AuthHelper(page);
    const isAuth = await authHelper.isAuthenticated();

    if (isAuth) {
        await authHelper.logout();
    }
}
