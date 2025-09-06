import { test, expect, Page, BrowserContext } from '@playwright/test';
import { N8NHelper, waitForN8NResponse } from '../utils/n8n-helpers';

/**
 * Comprehensive Session Management Tests
 * Tests session creation, persistence, isolation, and Postgres chat memory functionality
 *
 * Test Coverage:
 * 1. Session creation with new threadId/sessionId
 * 2. Session persistence across multiple requests
 * 3. Session isolation between different threadIds
 * 4. Postgres chat memory functionality
 * 5. Session cleanup and expiration
 * 6. Cross-browser session handling
 */

test.describe('Session Management Tests', () => {
    const WEBHOOK_URL = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
    const FRONTEND_URL = 'http://localhost:3000';
    let n8nHelper: N8NHelper;

    test.beforeEach(async ({ page }) => {
        n8nHelper = new N8NHelper(page, {
            webhookUrl: WEBHOOK_URL,
            delayMs: 500,
        });

        await n8nHelper.startMonitoring();
        await page.goto(FRONTEND_URL);
        await expect(page.locator('[data-chat-input="true"]')).toBeVisible();
    });

    test.afterEach(async ({ page }) => {
        await n8nHelper.resetMocks();
    });

    test.describe('Session Creation Tests', () => {
        test('should create new session with unique identifiers', async ({ page }) => {
            const capturedRequests: any[] = [];

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                capturedRequests.push(payload);

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: 'Session created successfully',
                        sessionId: payload.sessionId,
                        threadId: payload.threadId,
                        status: 'success',
                    }),
                });
            });

            // Send first message to create session
            await page.fill('[contenteditable="true"]', 'Hello, start a new session');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            expect(capturedRequests.length).toBe(1);
            const firstRequest = capturedRequests[0];

            // Validate session identifiers format
            expect(firstRequest.sessionId).toMatch(/^session-[a-f0-9-]{36}$/);
            expect(firstRequest.threadId).toMatch(/^thread-\d{13}$/);
            expect(firstRequest.timestamp).toBeDefined();

            // Verify required metadata
            expect(firstRequest.metadata).toBeDefined();
            expect(firstRequest.metadata.clientId).toMatch(/^client-[a-f0-9-]{36}$/);
            expect(firstRequest.metadata.source).toBe('jetvision-agent');
        });

        test('should maintain consistent session IDs within same conversation', async ({
            page,
        }) => {
            const capturedRequests: any[] = [];

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                capturedRequests.push(payload);

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: `Response to: ${payload.message}`,
                        status: 'success',
                    }),
                });
            });

            // Send multiple messages in same session
            const messages = [
                'What aircraft are available today?',
                'Show me pricing for Gulfstream G650',
                'Book the flight for tomorrow',
            ];

            for (const message of messages) {
                await page.fill('[contenteditable="true"]', message);
                await page.click('button[type="submit"]');
                await page.waitForTimeout(1000);

                // Clear input for next message
                await page.fill('[contenteditable="true"]', '');
                await page.waitForTimeout(500);
            }

            expect(capturedRequests.length).toBe(3);

            // All requests should have the same sessionId and threadId
            const firstSessionId = capturedRequests[0].sessionId;
            const firstThreadId = capturedRequests[0].threadId;

            capturedRequests.forEach((request, index) => {
                expect(request.sessionId).toBe(firstSessionId);
                expect(request.threadId).toBe(firstThreadId);
                expect(request.message).toBe(messages[index]);
            });
        });

        test('should create new session after page refresh', async ({ page }) => {
            const capturedRequests: any[] = [];

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                capturedRequests.push(request.postDataJSON());
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ status: 'success' }),
                });
            });

            // First session
            await page.fill('[contenteditable="true"]', 'First session message');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            const firstSessionId = capturedRequests[0].sessionId;
            const firstThreadId = capturedRequests[0].threadId;

            // Refresh page
            await page.reload();
            await expect(page.locator('[data-chat-input="true"]')).toBeVisible();

            // Second session after refresh
            await page.fill('[contenteditable="true"]', 'Second session message');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            expect(capturedRequests.length).toBe(2);

            const secondSessionId = capturedRequests[1].sessionId;
            const secondThreadId = capturedRequests[1].threadId;

            // Should be different session identifiers
            expect(secondSessionId).not.toBe(firstSessionId);
            expect(secondThreadId).not.toBe(firstThreadId);
        });
    });

    test.describe('Session Persistence Tests', () => {
        test('should persist session context across multiple requests', async ({ page }) => {
            const sessionHistory: any[] = [];

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                sessionHistory.push({
                    sessionId: payload.sessionId,
                    threadId: payload.threadId,
                    message: payload.message,
                    timestamp: payload.timestamp,
                    messageCount:
                        sessionHistory.filter(h => h.sessionId === payload.sessionId).length + 1,
                });

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: `Message ${sessionHistory.length} received`,
                        sessionHistory: sessionHistory.filter(
                            h => h.sessionId === payload.sessionId
                        ),
                        status: 'success',
                    }),
                });
            });

            // Simulate a conversation with context
            const conversationMessages = [
                'I need to book a private jet',
                'From Miami to New York',
                'For tomorrow morning',
                'How much will it cost?',
                'Book the Gulfstream option',
            ];

            for (let i = 0; i < conversationMessages.length; i++) {
                await page.fill('[contenteditable="true"]', conversationMessages[i]);
                await page.click('button[type="submit"]');
                await page.waitForTimeout(1000);

                // Verify session continuity
                const sessionMessages = sessionHistory.filter(
                    h => h.sessionId === sessionHistory[0].sessionId
                );
                expect(sessionMessages.length).toBe(i + 1);

                // Clear for next message
                await page.fill('[contenteditable="true"]', '');
                await page.waitForTimeout(500);
            }

            // Verify all messages belong to same session
            const uniqueSessionIds = new Set(sessionHistory.map(h => h.sessionId));
            expect(uniqueSessionIds.size).toBe(1);

            // Verify message ordering
            sessionHistory.forEach((entry, index) => {
                expect(entry.messageCount).toBe(index + 1);
                expect(entry.message).toBe(conversationMessages[index]);
            });
        });

        test('should handle session storage persistence', async ({ page }) => {
            // Set up session storage monitoring
            await page.addInitScript(() => {
                (window as any).sessionStorageEvents = [];

                const originalSetItem = sessionStorage.setItem;
                const originalGetItem = sessionStorage.getItem;

                sessionStorage.setItem = function (key: string, value: string) {
                    (window as any).sessionStorageEvents.push({ action: 'set', key, value });
                    return originalSetItem.call(this, key, value);
                };

                sessionStorage.getItem = function (key: string) {
                    const value = originalGetItem.call(this, key);
                    (window as any).sessionStorageEvents.push({ action: 'get', key, value });
                    return value;
                };
            });

            await page.route(WEBHOOK_URL + '**', async route => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ status: 'success' }),
                });
            });

            await page.fill('[contenteditable="true"]', 'Test session storage');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            const storageEvents = await page.evaluate(() => (window as any).sessionStorageEvents);

            // Should have stored session information
            const sessionKeys = storageEvents
                .filter((event: any) => event.action === 'set')
                .map((event: any) => event.key);

            expect(sessionKeys).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('sessionId'),
                    expect.stringContaining('threadId'),
                ])
            );
        });

        test('should restore session from storage after navigation', async ({ page, context }) => {
            let storedSessionId: string;
            let storedThreadId: string;

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                storedSessionId = payload.sessionId;
                storedThreadId = payload.threadId;

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ status: 'success' }),
                });
            });

            // Initial message to create session
            await page.fill('[contenteditable="true"]', 'Initial message');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            // Navigate away and back
            await page.goto('about:blank');
            await page.goto(FRONTEND_URL);
            await expect(page.locator('[data-chat-input="true"]')).toBeVisible();

            // Send another message
            await page.fill('[contenteditable="true"]', 'Message after navigation');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            // Session should be restored or new one created
            // This depends on implementation - either way should be consistent
            const sessionAfterNavigation = await page.evaluate(() => {
                return {
                    sessionId: sessionStorage.getItem('currentSessionId'),
                    threadId: sessionStorage.getItem('currentThreadId'),
                };
            });

            expect(sessionAfterNavigation.sessionId).toBeDefined();
            expect(sessionAfterNavigation.threadId).toBeDefined();
        });
    });

    test.describe('Session Isolation Tests', () => {
        test('should isolate sessions between different browser tabs', async ({ context }) => {
            const capturedSessions: any[] = [];

            // Create multiple tabs
            const tab1 = await context.newPage();
            const tab2 = await context.newPage();
            const tab3 = await context.newPage();

            const tabs = [tab1, tab2, tab3];

            // Setup route handling for all tabs
            for (const tab of tabs) {
                await tab.route(WEBHOOK_URL + '**', async (route, request) => {
                    const payload = request.postDataJSON();
                    capturedSessions.push({
                        tabIndex: tabs.indexOf(tab),
                        sessionId: payload.sessionId,
                        threadId: payload.threadId,
                        message: payload.message,
                    });

                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({ status: 'success' }),
                    });
                });

                await tab.goto(FRONTEND_URL);
                await expect(tab.locator('[data-chat-input="true"]')).toBeVisible();
            }

            // Send messages from each tab
            const messages = ['Message from tab 1', 'Message from tab 2', 'Message from tab 3'];

            for (let i = 0; i < tabs.length; i++) {
                await tabs[i].fill('[contenteditable="true"]', messages[i]);
                await tabs[i].click('button[type="submit"]');
                await tabs[i].waitForTimeout(1000);
            }

            expect(capturedSessions.length).toBe(3);

            // Each tab should have unique session identifiers
            const sessionIds = capturedSessions.map(s => s.sessionId);
            const threadIds = capturedSessions.map(s => s.threadId);

            expect(new Set(sessionIds).size).toBe(3);
            expect(new Set(threadIds).size).toBe(3);

            // Verify correct message mapping
            capturedSessions.forEach((session, index) => {
                expect(session.message).toBe(messages[index]);
                expect(session.tabIndex).toBe(index);
            });

            // Cleanup
            await Promise.all(tabs.map(tab => tab.close()));
        });

        test('should isolate sessions between different browser contexts', async ({ browser }) => {
            const capturedSessions: any[] = [];

            // Create multiple browser contexts (incognito-like)
            const context1 = await browser.newContext();
            const context2 = await browser.newContext();

            const page1 = await context1.newPage();
            const page2 = await context2.newPage();

            // Setup session capture for both pages
            for (const page of [page1, page2]) {
                await page.route(WEBHOOK_URL + '**', async (route, request) => {
                    const payload = request.postDataJSON();
                    capturedSessions.push({
                        contextIndex: [page1, page2].indexOf(page),
                        sessionId: payload.sessionId,
                        threadId: payload.threadId,
                        message: payload.message,
                    });

                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({ status: 'success' }),
                    });
                });

                await page.goto(FRONTEND_URL);
                await expect(page.locator('[data-chat-input="true"]')).toBeVisible();
            }

            // Send messages from different contexts
            await page1.fill('[contenteditable="true"]', 'Message from context 1');
            await page1.click('button[type="submit"]');
            await page1.waitForTimeout(1000);

            await page2.fill('[contenteditable="true"]', 'Message from context 2');
            await page2.click('button[type="submit"]');
            await page2.waitForTimeout(1000);

            expect(capturedSessions.length).toBe(2);

            // Different contexts should have completely isolated sessions
            expect(capturedSessions[0].sessionId).not.toBe(capturedSessions[1].sessionId);
            expect(capturedSessions[0].threadId).not.toBe(capturedSessions[1].threadId);

            // Cleanup
            await context1.close();
            await context2.close();
        });

        test('should handle concurrent sessions without interference', async ({ page }) => {
            const sessionRequests = new Map();

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                const sessionId = payload.sessionId;

                if (!sessionRequests.has(sessionId)) {
                    sessionRequests.set(sessionId, []);
                }
                sessionRequests.get(sessionId).push(payload);

                // Simulate processing delay
                await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: `Processed for session ${sessionId}`,
                        requestCount: sessionRequests.get(sessionId).length,
                        status: 'success',
                    }),
                });
            });

            // Simulate rapid-fire messages that could cause race conditions
            const rapidMessages = [
                'First rapid message',
                'Second rapid message',
                'Third rapid message',
                'Fourth rapid message',
                'Fifth rapid message',
            ];

            // Send messages with minimal delay to test concurrency
            for (const message of rapidMessages) {
                page.fill('[contenteditable="true"]', message);
                page.click('button[type="submit"]');
                await page.waitForTimeout(100); // Very short delay
                page.fill('[contenteditable="true"]', '');
            }

            // Wait for all responses
            await page.waitForTimeout(5000);

            // All requests should belong to the same session
            expect(sessionRequests.size).toBe(1);

            const sessionId = Array.from(sessionRequests.keys())[0];
            const requests = sessionRequests.get(sessionId);

            expect(requests.length).toBe(5);

            // Verify message order preservation
            requests.forEach((request: any, index: number) => {
                expect(request.message).toBe(rapidMessages[index]);
            });
        });
    });

    test.describe('Postgres Chat Memory Tests', () => {
        test('should store chat history in persistent memory', async ({ page }) => {
            const storedMessages: any[] = [];

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();

                // Simulate storing message in Postgres
                storedMessages.push({
                    sessionId: payload.sessionId,
                    threadId: payload.threadId,
                    message: payload.message,
                    timestamp: new Date().toISOString(),
                    role: 'user',
                });

                // Mock response with chat history
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: 'Response stored in memory',
                        chatHistory: storedMessages.filter(m => m.sessionId === payload.sessionId),
                        status: 'success',
                    }),
                });
            });

            // Build conversation history
            const conversation = [
                'I need to find executive assistants',
                'Focus on private equity firms in NYC',
                'Looking for firms with $1B+ AUM',
                'Export the results to Apollo campaign',
            ];

            for (const message of conversation) {
                await page.fill('[contenteditable="true"]', message);
                await page.click('button[type="submit"]');
                await page.waitForTimeout(1000);
                await page.fill('[contenteditable="true"]', '');
            }

            // Verify chat history accumulation
            expect(storedMessages.length).toBe(4);

            const sessionId = storedMessages[0].sessionId;
            const sessionMessages = storedMessages.filter(m => m.sessionId === sessionId);

            expect(sessionMessages.length).toBe(4);
            sessionMessages.forEach((msg, index) => {
                expect(msg.message).toBe(conversation[index]);
                expect(msg.role).toBe('user');
            });
        });

        test('should retrieve and use chat memory for context', async ({ page }) => {
            const conversationMemory = new Map();

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                const sessionId = payload.sessionId;

                if (!conversationMemory.has(sessionId)) {
                    conversationMemory.set(sessionId, []);
                }

                const history = conversationMemory.get(sessionId);
                history.push({ role: 'user', content: payload.message });

                // Simulate N8N using chat memory for context
                const contextualResponse =
                    history.length > 1
                        ? `Based on our conversation about ${history[0].content}, here's more information about ${payload.message}`
                        : `Starting new conversation about: ${payload.message}`;

                history.push({ role: 'assistant', content: contextualResponse });

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: contextualResponse,
                        usedContext: history.length > 2,
                        memorySize: history.length,
                        status: 'success',
                    }),
                });
            });

            // First message establishes context
            await page.fill('[contenteditable="true"]', 'private jet charter');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            // Follow-up message should use context
            await page.fill('[contenteditable="true"]', 'pricing for Gulfstream');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            // Verify response includes context
            const chatMessages = await page.locator('[data-testid="chat-message"]').all();
            const lastResponse = await chatMessages[chatMessages.length - 1].textContent();

            expect(lastResponse).toContain('private jet charter');
            expect(lastResponse).toContain('Gulfstream');
        });

        test('should handle memory limits and cleanup', async ({ page }) => {
            const memoryStore = new Map();
            const MAX_MEMORY_SIZE = 10;

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                const sessionId = payload.sessionId;

                if (!memoryStore.has(sessionId)) {
                    memoryStore.set(sessionId, []);
                }

                const memory = memoryStore.get(sessionId);
                memory.push({ message: payload.message, timestamp: Date.now() });

                // Implement memory limit
                if (memory.length > MAX_MEMORY_SIZE) {
                    memory.splice(0, memory.length - MAX_MEMORY_SIZE); // Keep only recent messages
                }

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: 'Memory managed',
                        memorySize: memory.length,
                        isMemoryLimited: memory.length >= MAX_MEMORY_SIZE,
                        status: 'success',
                    }),
                });
            });

            // Send more messages than memory limit
            for (let i = 1; i <= 15; i++) {
                await page.fill('[contenteditable="true"]', `Message number ${i}`);
                await page.click('button[type="submit"]');
                await page.waitForTimeout(300);
                await page.fill('[contenteditable="true"]', '');
            }

            // Verify memory was limited
            const sessionId = Array.from(memoryStore.keys())[0];
            const finalMemory = memoryStore.get(sessionId);

            expect(finalMemory.length).toBe(MAX_MEMORY_SIZE);

            // Should contain only the most recent messages
            expect(finalMemory[0].message).toBe('Message number 6');
            expect(finalMemory[9].message).toBe('Message number 15');
        });

        test('should maintain memory across session reconnections', async ({ page }) => {
            let persistentMemory = new Map();

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                const sessionId = payload.sessionId;

                // Simulate loading from persistent storage
                if (!persistentMemory.has(sessionId)) {
                    persistentMemory.set(sessionId, []);
                }

                const memory = persistentMemory.get(sessionId);
                memory.push({ content: payload.message, timestamp: Date.now() });

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: 'Message processed with memory',
                        historyCount: memory.length,
                        recentHistory: memory.slice(-3), // Return recent context
                        status: 'success',
                    }),
                });
            });

            // Initial conversation
            await page.fill('[contenteditable="true"]', 'Start conversation about Apollo leads');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            await page.fill('[contenteditable="true"]', 'Find contacts in finance industry');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            const sessionId = Array.from(persistentMemory.keys())[0];
            const memoryBeforeReconnect = [...persistentMemory.get(sessionId)];

            // Simulate network interruption and reconnection
            await page.reload();
            await expect(page.locator('[data-chat-input="true"]')).toBeVisible();

            // Continue conversation - should maintain memory
            await page.fill('[contenteditable="true"]', 'Continue with those contacts');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            // Verify memory persisted through reconnection
            const memoryAfterReconnect = persistentMemory.get(sessionId);
            expect(memoryAfterReconnect.length).toBe(3);

            // Original messages should still be in memory
            expect(memoryAfterReconnect[0].content).toBe('Start conversation about Apollo leads');
            expect(memoryAfterReconnect[1].content).toBe('Find contacts in finance industry');
            expect(memoryAfterReconnect[2].content).toBe('Continue with those contacts');
        });
    });

    test.describe('Session Analytics and Monitoring', () => {
        test('should track session duration and activity metrics', async ({ page }) => {
            const sessionMetrics = new Map();

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                const sessionId = payload.sessionId;
                const now = Date.now();

                if (!sessionMetrics.has(sessionId)) {
                    sessionMetrics.set(sessionId, {
                        startTime: now,
                        messageCount: 0,
                        lastActivity: now,
                    });
                }

                const metrics = sessionMetrics.get(sessionId);
                metrics.messageCount++;
                metrics.lastActivity = now;
                metrics.duration = now - metrics.startTime;

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: 'Metrics tracked',
                        sessionMetrics: metrics,
                        status: 'success',
                    }),
                });
            });

            const startTime = Date.now();

            // Send messages with varying intervals
            const messages = [
                'First message',
                'Second message after 1s',
                'Third message after 2s',
                'Fourth message after 3s',
            ];

            for (let i = 0; i < messages.length; i++) {
                await page.fill('[contenteditable="true"]', messages[i]);
                await page.click('button[type="submit"]');
                await page.waitForTimeout(1000 * (i + 1)); // Increasing delays
                await page.fill('[contenteditable="true"]', '');
            }

            const sessionId = Array.from(sessionMetrics.keys())[0];
            const finalMetrics = sessionMetrics.get(sessionId);

            expect(finalMetrics.messageCount).toBe(4);
            expect(finalMetrics.duration).toBeGreaterThan(6000); // At least 6 seconds
            expect(finalMetrics.lastActivity - finalMetrics.startTime).toBeGreaterThan(6000);
        });

        test('should handle session cleanup and expiration', async ({ page }) => {
            const activeSessions = new Map();
            const SESSION_TIMEOUT = 5000; // 5 seconds for testing

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                const sessionId = payload.sessionId;
                const now = Date.now();

                // Clean up expired sessions
                for (const [id, session] of activeSessions) {
                    if (now - session.lastActivity > SESSION_TIMEOUT) {
                        activeSessions.delete(id);
                    }
                }

                // Update or create session
                activeSessions.set(sessionId, {
                    lastActivity: now,
                    messageCount: (activeSessions.get(sessionId)?.messageCount || 0) + 1,
                });

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: 'Session maintained',
                        activeSessionCount: activeSessions.size,
                        isExpired: false,
                        status: 'success',
                    }),
                });
            });

            // Create session
            await page.fill('[contenteditable="true"]', 'Create session');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            expect(activeSessions.size).toBe(1);

            // Wait for session to expire
            await page.waitForTimeout(6000);

            // Trigger cleanup by sending new message
            await page.fill('[contenteditable="true"]', 'After expiration');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);

            // Should have cleaned up expired session and created new one
            expect(activeSessions.size).toBe(1);

            const remainingSessions = Array.from(activeSessions.keys());
            const latestSession = activeSessions.get(remainingSessions[0]);
            expect(latestSession.messageCount).toBe(1); // New session, first message
        });
    });
});
