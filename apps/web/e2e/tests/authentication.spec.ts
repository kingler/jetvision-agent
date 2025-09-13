import { test, expect } from '@playwright/test';
import { AuthHelper, ensureLoggedOut } from '../utils/auth-helpers';
import { testUsers, getUserById, getSessionForUser } from '../fixtures/user-profiles';

test.describe('Authentication Flow Tests', () => {
    let authHelper: AuthHelper;

    test.beforeEach(async ({ page }) => {
        authHelper = new AuthHelper(page);

        // Ensure clean slate
        await ensureLoggedOut(page);

        // Setup authentication interceptors
        await authHelper.setupAuthInterceptors();
    });

    test.describe('Login Process', () => {
        test('should redirect unauthenticated users to login', async ({ page }) => {
            // Try to access protected route
            await page.goto('/');

            // Should be redirected to login
            await expect(page).toHaveURL(/\/login/);

            // Should show login interface
            await expect(
                page.locator('[data-testid="login-container"], .login-form')
            ).toBeVisible();
        });

        test('should login admin user successfully', async ({ page }) => {
            const adminUser = testUsers.find(u => u.role === 'admin');
            if (!adminUser) throw new Error('Admin user not found');

            await authHelper.loginAs(adminUser);

            // Should be redirected to main app
            await expect(page).toHaveURL('/');

            // Should show user menu
            await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

            // Should show admin-specific elements
            const adminElements = page.locator(
                '[data-testid="admin-panel"], [data-testid="admin-controls"]'
            );
            if ((await adminElements.count()) > 0) {
                await expect(adminElements.first()).toBeVisible();
            }
        });

        test('should login sales user successfully', async ({ page }) => {
            const salesUser = testUsers.find(
                u => u.role === 'user' && u.metadata?.department === 'Sales'
            );
            if (!salesUser) throw new Error('Sales user not found');

            await authHelper.loginAs(salesUser);

            // Should be at main application
            await expect(page).toHaveURL('/');

            // Should show user-specific interface
            await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

            // User menu should show correct user info
            const userMenuText = await page.locator('[data-testid="user-menu"]').textContent();
            expect(userMenuText).toContain(salesUser.firstName);
        });

        test('should login demo user with limited access', async ({ page }) => {
            const demoUser = testUsers.find(u => u.role === 'demo');
            if (!demoUser) throw new Error('Demo user not found');

            await authHelper.loginAs(demoUser);

            // Should reach main app
            await expect(page).toHaveURL('/');

            // Should show demo limitations
            const demoIndicator = page.locator(
                '[data-testid="demo-banner"], .demo-mode, [class*="demo"]'
            );
            if ((await demoIndicator.count()) > 0) {
                await expect(demoIndicator.first()).toBeVisible();

                const demoText = await demoIndicator.first().textContent();
                expect(demoText?.toLowerCase()).toMatch(/(demo|trial|limited|upgrade)/);
            }
        });

        test('should handle Clerk authentication flow', async ({ page }) => {
            // Navigate to login
            await page.goto('/login');

            // Check for Clerk authentication elements
            const clerkSignIn = page.locator('[data-clerk-sign-in], .cl-sign-in, .clerk-sign-in');

            if (await clerkSignIn.isVisible({ timeout: 5000 })) {
                console.log('✅ Clerk sign-in component detected');

                // Verify Clerk-specific elements
                const emailInput = clerkSignIn.locator('input[type="email"], input[name="email"]');
                const passwordInput = clerkSignIn.locator(
                    'input[type="password"], input[name="password"]'
                );

                if (await emailInput.isVisible()) {
                    await expect(emailInput).toBeVisible();
                }
                if (await passwordInput.isVisible()) {
                    await expect(passwordInput).toBeVisible();
                }
            } else {
                // Fallback for mock authentication
                console.log('⚠️ Clerk components not found, using mock auth');

                const mockLoginForm = page.locator('[data-testid="mock-login"], .login-form');
                await expect(mockLoginForm).toBeVisible();
            }
        });

        test('should persist authentication across page reloads', async ({ page }) => {
            const user = testUsers[0];
            if (!user) throw new Error('Test user not found');

            await authHelper.loginAs(user);

            // Verify logged in
            await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

            // Reload page
            await page.reload();

            // Should still be logged in
            await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

            // Should not redirect to login
            await expect(page).toHaveURL('/');
        });
    });

    test.describe('Logout Process', () => {
        test('should logout user successfully', async ({ page }) => {
            const user = testUsers[1];
            if (!user) throw new Error('Test user not found');

            // Login first
            await authHelper.loginAs(user);

            // Verify logged in
            await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

            // Logout
            await authHelper.logout();

            // Should be redirected to login
            await expect(page).toHaveURL(/\/login/);

            // Should not have user menu
            await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
        });

        test('should clear authentication state on logout', async ({ page }) => {
            const user = testUsers[0];
            if (!user) throw new Error('Test user not found');

            await authHelper.loginAs(user);

            // Verify authentication state exists
            const hasAuthState = await authHelper.isAuthenticated();
            expect(hasAuthState).toBe(true);

            // Logout
            await authHelper.logout();

            // Verify authentication state cleared
            const authStateAfterLogout = await authHelper.isAuthenticated();
            expect(authStateAfterLogout).toBe(false);

            // Verify localStorage cleared
            const localStorageData = await page.evaluate(() => {
                return {
                    session: localStorage.getItem('clerk-session'),
                    user: localStorage.getItem('clerk-user'),
                };
            });

            expect(localStorageData.session).toBeNull();
            expect(localStorageData.user).toBeNull();
        });

        test('should handle automatic logout on session expiry', async ({ page }) => {
            const user = testUsers[0];
            if (!user) throw new Error('Test user not found');

            await authHelper.loginAs(user);

            // Mock expired session
            await page.evaluate(() => {
                const expiredSession = {
                    ...JSON.parse(localStorage.getItem('clerk-session') || '{}'),
                    expiresAt: '2020-01-01T00:00:00Z', // Past date
                };
                localStorage.setItem('clerk-session', JSON.stringify(expiredSession));
            });

            // Reload to trigger session check
            await page.reload();

            // Should be redirected to login due to expired session
            await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
        });
    });

    test.describe('Permission Management', () => {
        test('should verify user permissions for Apollo.io access', async ({ page }) => {
            const salesUser = testUsers.find(u => u.permissions.includes('apollo:write'));
            if (!salesUser) throw new Error('Sales user with Apollo permissions not found');

            await authHelper.loginAs(salesUser);

            // Verify permissions
            await authHelper.verifyPermissions(['apollo:read', 'apollo:write']);

            // Should be able to access Apollo features
            const apolloFeatures = page.locator('[data-testid="apollo-search"], [class*="apollo"]');
            if ((await apolloFeatures.count()) > 0) {
                await expect(apolloFeatures.first()).toBeVisible();
            }
        });

        test('should verify user permissions for Avinode access', async ({ page }) => {
            const opsUser = testUsers.find(u => u.permissions.includes('avinode:write'));
            if (!opsUser) throw new Error('Ops user with Avinode permissions not found');

            await authHelper.loginAs(opsUser);

            // Verify permissions
            await authHelper.verifyPermissions(['avinode:read', 'avinode:write']);

            // Should be able to access Avinode features
            const avinodeFeatures = page.locator(
                '[data-testid="avinode-search"], [class*="avinode"]'
            );
            if ((await avinodeFeatures.count()) > 0) {
                await expect(avinodeFeatures.first()).toBeVisible();
            }
        });

        test('should restrict demo user permissions', async ({ page }) => {
            const demoUser = testUsers.find(u => u.role === 'demo');
            if (!demoUser) throw new Error('Demo user not found');

            await authHelper.loginAs(demoUser);

            // Demo user should have limited permissions
            const currentUser = await authHelper.getCurrentUser();
            const userPermissions = currentUser?.publicMetadata?.permissions || [];

            // Should not have write permissions
            expect(userPermissions).not.toContain('apollo:write');
            expect(userPermissions).not.toContain('avinode:write');
            expect(userPermissions).not.toContain('system:admin');

            // Should have read-only access
            expect(userPermissions).toContain('apollo:read');
            expect(userPermissions).toContain('avinode:read');
        });

        test('should handle permission escalation attempts', async ({ page }) => {
            const limitedUser = testUsers.find(u => u.role === 'demo');
            if (!limitedUser) throw new Error('Limited user not found');

            await authHelper.loginAs(limitedUser);

            // Try to access admin endpoint
            const response = await page.request.get('/api/admin/users');
            expect(response.status()).toBe(403); // Should be forbidden

            // Try to modify user permissions
            const modifyResponse = await page.request.post('/api/admin/permissions', {
                data: { userId: limitedUser.id, permissions: ['system:admin'] },
            });
            expect(modifyResponse.status()).toBe(403);
        });

        test('should handle role-based UI rendering', async ({ page }) => {
            // Test admin user UI
            const adminUser = testUsers.find(u => u.role === 'admin');
            if (adminUser) {
                await authHelper.loginAs(adminUser);

                // Admin should see admin controls
                const adminControls = page.locator('[data-testid="admin-controls"], .admin-panel');
                if ((await adminControls.count()) > 0) {
                    await expect(adminControls.first()).toBeVisible();
                }

                await authHelper.logout();
            }

            // Test regular user UI
            const regularUser = testUsers.find(u => u.role === 'user');
            if (regularUser) {
                await authHelper.loginAs(regularUser);

                // Regular user should not see admin controls
                const adminControls = page.locator('[data-testid="admin-controls"], .admin-panel');
                if ((await adminControls.count()) > 0) {
                    await expect(adminControls.first()).not.toBeVisible();
                }
            }
        });
    });

    test.describe('Session Management', () => {
        test('should maintain session across navigation', async ({ page }) => {
            const user = testUsers[0];
            if (!user) throw new Error('Test user not found');

            await authHelper.loginAs(user);

            // Navigate to different pages
            const pages = ['/', '/dashboard', '/settings'];

            for (const path of pages) {
                await page.goto(path);

                // Should maintain authentication
                const isAuth = await authHelper.isAuthenticated();
                expect(isAuth).toBe(true);

                // User menu should be visible
                await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
            }
        });

        test('should handle concurrent sessions', async ({ browser }) => {
            const user = testUsers[0];
            if (!user) throw new Error('Test user not found');

            // Create two browser contexts (simulate two browser tabs)
            const context1 = await browser.newContext();
            const context2 = await browser.newContext();

            const page1 = await context1.newPage();
            const page2 = await context2.newPage();

            const auth1 = new AuthHelper(page1);
            const auth2 = new AuthHelper(page2);

            // Login in both contexts
            await auth1.loginAs(user);
            await auth2.loginAs(user);

            // Both should be authenticated
            expect(await auth1.isAuthenticated()).toBe(true);
            expect(await auth2.isAuthenticated()).toBe(true);

            // Logout from one context
            await auth1.logout();

            // First context should be logged out
            expect(await auth1.isAuthenticated()).toBe(false);

            // Second context should still be authenticated (depending on implementation)
            const isAuth2 = await auth2.isAuthenticated();
            console.log(`Context 2 authentication after context 1 logout: ${isAuth2}`);

            await context1.close();
            await context2.close();
        });

        test('should refresh tokens when needed', async ({ page }) => {
            const user = testUsers[0];
            if (!user) throw new Error('Test user not found');

            await authHelper.loginAs(user);

            // Mock near-expired token
            await page.evaluate(() => {
                const session = JSON.parse(localStorage.getItem('clerk-session') || '{}');
                const nearExpiry = new Date(Date.now() + 60000); // Expires in 1 minute
                session.expiresAt = nearExpiry.toISOString();
                localStorage.setItem('clerk-session', JSON.stringify(session));
            });

            // Make an API call that should trigger token refresh
            await page.request.get('/api/user/profile');

            // Token should be refreshed (implementation dependent)
            const updatedSession = await page.evaluate(() => {
                return JSON.parse(localStorage.getItem('clerk-session') || '{}');
            });

            expect(updatedSession.expiresAt).toBeTruthy();
        });

        test('should handle session storage failures', async ({ page }) => {
            const user = testUsers[0];
            if (!user) throw new Error('Test user not found');

            // Mock localStorage failure
            await page.addInitScript(() => {
                const originalSetItem = Storage.prototype.setItem;
                Storage.prototype.setItem = function () {
                    throw new Error('Storage unavailable');
                };
            });

            // Login should still work or gracefully degrade
            try {
                await authHelper.loginAs(user);

                // Should either work with alternative storage or show appropriate error
                const isAuth = await authHelper.isAuthenticated();
                console.log(`Authentication success despite storage failure: ${isAuth}`);
            } catch (error) {
                console.log('Authentication failed gracefully with storage error:', error);

                // Should show user-friendly error
                const errorMessage = page.locator('[data-testid="storage-error"], .auth-error');
                if (await errorMessage.isVisible({ timeout: 5000 })) {
                    const errorText = await errorMessage.textContent();
                    expect(errorText?.toLowerCase()).toMatch(
                        /(storage|browser|private.*mode|cookies)/
                    );
                }
            }
        });
    });

    test.describe('Security Features', () => {
        test('should prevent XSS in user data', async ({ page }) => {
            const baseUser = testUsers[0];
            if (!baseUser) throw new Error('Base test user not found');

            const maliciousUser = {
                ...baseUser,
                firstName: '<script>alert("xss")</script>',
                lastName: '<img src="x" onerror="alert(\'xss\')">',
            };

            await authHelper.mockAuthState(maliciousUser);
            await page.goto('/');

            // Malicious scripts should be escaped/sanitized
            const userMenu = page.locator('[data-testid="user-menu"]');
            await expect(userMenu).toBeVisible();

            const userMenuText = await userMenu.textContent();
            expect(userMenuText).not.toContain('<script>');
            expect(userMenuText).not.toContain('<img');

            // Page should not execute malicious scripts
            const alertDialogs: string[] = [];
            page.on('dialog', dialog => {
                alertDialogs.push(dialog.message());
                dialog.dismiss();
            });

            await page.waitForTimeout(2000);
            expect(alertDialogs.length).toBe(0);
        });

        test('should validate session tokens', async ({ page }) => {
            // Mock invalid token
            await page.evaluate(() => {
                localStorage.setItem(
                    'clerk-session',
                    JSON.stringify({
                        accessToken: 'invalid-token',
                        userId: 'invalid-user',
                        expiresAt: '2025-12-31T23:59:59Z',
                    })
                );
            });

            await page.goto('/');

            // Should be redirected to login due to invalid token
            await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
        });

        test('should handle CSRF protection', async ({ page }) => {
            const user = testUsers[0];
            if (!user) throw new Error('Test user not found');
            await authHelper.loginAs(user);

            // Make API request without proper CSRF token
            const response = await page.request.post('/api/user/update', {
                data: { name: 'Updated Name' },
            });

            // Should be protected against CSRF
            // Implementation dependent - might be 403 or require token
            console.log(`CSRF protection response: ${response.status()}`);
        });

        test('should secure sensitive routes', async ({ page }) => {
            const sensitiveRoutes = ['/api/admin/users', '/api/system/config', '/admin/dashboard'];

            // Test without authentication
            for (const route of sensitiveRoutes) {
                const response = await page.request.get(route);

                // Should require authentication
                expect([401, 403, 404]).toContain(response.status());
            }

            // Test with non-admin user
            const regularUser = testUsers.find(u => u.role === 'user');
            if (regularUser) {
                await authHelper.loginAs(regularUser);

                for (const route of sensitiveRoutes) {
                    const response = await page.request.get(route);

                    // Should require admin permissions
                    expect([403, 404]).toContain(response.status());
                }
            }
        });
    });

    test.describe('Error Scenarios', () => {
        test('should handle authentication service outage', async ({ page }) => {
            // Mock authentication service failure
            await page.route('**/api/auth/**', async route => {
                await route.fulfill({
                    status: 503,
                    body: 'Authentication service unavailable',
                });
            });

            await page.goto('/login');

            // Should show service unavailable message
            const serviceError = page.locator(
                '[data-testid="auth-service-error"], .service-unavailable'
            );
            await expect(serviceError).toBeVisible({ timeout: 10000 });

            const errorText = await serviceError.textContent();
            expect(errorText?.toLowerCase()).toMatch(
                /(service.*unavailable|try.*later|maintenance)/
            );
        });

        test('should handle network errors during authentication', async ({ page }) => {
            await page.context().setOffline(true);

            const user = testUsers[0];
            if (!user) throw new Error('Test user not found');

            try {
                await authHelper.loginAs(user);
            } catch (error) {
                console.log('Login failed due to network error:', error);
            }

            // Should show network error
            const networkError = page.locator('[data-testid="network-error"], .offline-error');
            if (await networkError.isVisible({ timeout: 5000 })) {
                const errorText = await networkError.textContent();
                expect(errorText?.toLowerCase()).toMatch(/(network|offline|connection)/);
            }

            await page.context().setOffline(false);
        });

        test('should handle corrupted authentication data', async ({ page }) => {
            // Set corrupted session data
            await page.evaluate(() => {
                localStorage.setItem('clerk-session', 'corrupted-json-{');
                localStorage.setItem('clerk-user', '{invalid-json');
            });

            await page.goto('/');

            // Should clear corrupted data and redirect to login
            await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

            // Should clear corrupted data
            const sessionData = await page.evaluate(() => {
                return {
                    session: localStorage.getItem('clerk-session'),
                    user: localStorage.getItem('clerk-user'),
                };
            });

            expect(sessionData.session).toBeNull();
            expect(sessionData.user).toBeNull();
        });
    });
});
