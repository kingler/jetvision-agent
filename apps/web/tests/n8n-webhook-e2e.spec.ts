import { test, expect } from '@playwright/test';

test.describe('N8N Webhook Integration', () => {
    test('should successfully integrate with N8N webhook', async ({ page }) => {
        console.log('Starting N8N webhook integration test...');

        // Navigate to the chat page
        await page.goto('http://localhost:3000/chat');

        // Wait for the page to fully load
        await page.waitForLoadState('networkidle');

        // Check if we need to authenticate (in dev mode, auth is bypassed)
        const authElement = await page
            .locator('[data-testid="sign-in"]')
            .isVisible()
            .catch(() => false);
        if (authElement) {
            console.log('Auth screen detected, bypassing...');
            // In development mode, authentication is typically bypassed
        }

        // Look for the chat input using various selectors
        const chatInputSelectors = [
            '[data-testid="chat-input"]',
            'textarea[placeholder*="Ask about"]',
            'div[contenteditable="true"]',
            '.ProseMirror',
            '[role="textbox"]',
        ];

        let chatInput = null;
        for (const selector of chatInputSelectors) {
            const element = page.locator(selector);
            if (await element.isVisible().catch(() => false)) {
                chatInput = element;
                console.log(`Found chat input with selector: ${selector}`);
                break;
            }
        }

        if (!chatInput) {
            // Take a screenshot for debugging
            await page.screenshot({ path: 'chat-page-debug.png' });
            throw new Error(
                'Chat input not found. Check chat-page-debug.png for the current page state.'
            );
        }

        // Type a test message
        const testMessage = 'Test N8N webhook integration message';
        console.log(`Typing message: ${testMessage}`);
        await chatInput.click();
        await chatInput.fill(testMessage);

        // Set up network monitoring for the webhook call
        const webhookPromise = page
            .waitForResponse(response => response.url().includes('/api/n8n-webhook'), {
                timeout: 10000,
            })
            .catch(() => null);

        // Submit the message (try multiple methods)
        const submitMethods = [
            async () => {
                // Method 1: Press Enter
                console.log('Attempting submit method: Enter key');
                await chatInput.press('Enter');
            },
            async () => {
                // Method 2: Click send button
                console.log('Attempting submit method: Send button');
                const sendButton = page.locator(
                    '[data-testid="send-button"], button[aria-label*="send" i], button:has-text("Send")'
                );
                if (await sendButton.isVisible()) {
                    await sendButton.click();
                }
            },
        ];

        // Try the first submit method
        await submitMethods[0]();

        // Wait for the webhook response
        console.log('Waiting for webhook response...');
        const webhookResponse = await webhookPromise;

        if (webhookResponse) {
            console.log(`Webhook called: ${webhookResponse.url()}`);
            console.log(`Webhook status: ${webhookResponse.status()}`);

            // Check that the webhook was successful
            expect(webhookResponse.status()).toBe(200);

            // Check for SSE response headers
            const contentType = webhookResponse.headers()['content-type'];
            expect(contentType).toContain('text/event-stream');

            // Wait for the response to appear in the chat
            await page.waitForTimeout(3000);

            // Verify the message appears in the chat history
            const messageInChat = page.locator(`text="${testMessage}"`);
            await expect(messageInChat).toBeVisible({ timeout: 5000 });

            console.log('✅ N8N webhook integration test passed!');
        } else {
            // If no webhook was called, check if the chat is configured correctly
            console.log('⚠️ No webhook call detected. Checking configuration...');

            // Check if NEXT_PUBLIC_N8N_WEBHOOK_URL is set in the browser
            const webhookUrl = await page.evaluate(() => {
                return (
                    (window as any).process?.env?.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
                    (window as any).__NEXT_DATA__?.runtimeConfig?.NEXT_PUBLIC_N8N_WEBHOOK_URL
                );
            });

            if (!webhookUrl) {
                throw new Error(
                    'NEXT_PUBLIC_N8N_WEBHOOK_URL is not configured in the browser environment'
                );
            }

            throw new Error('Webhook was not called despite configuration being present');
        }
    });

    test('should handle N8N webhook errors gracefully', async ({ page }) => {
        console.log('Testing N8N webhook error handling...');

        // Navigate to the chat page
        await page.goto('http://localhost:3000/chat');
        await page.waitForLoadState('networkidle');

        // Find the chat input
        const chatInput = page.locator('.ProseMirror, [contenteditable="true"], textarea').first();
        await expect(chatInput).toBeVisible({ timeout: 10000 });

        // Mock a network error by blocking the webhook endpoint
        await page.route('**/api/n8n-webhook', route => {
            route.abort('failed');
        });

        // Type and submit a message
        await chatInput.click();
        await chatInput.fill('Test error handling');
        await chatInput.press('Enter');

        // Wait a moment for error handling
        await page.waitForTimeout(2000);

        // Check that the UI doesn't crash and shows appropriate feedback
        const errorIndicator = page.locator('text=/error|failed|retry/i');
        const isErrorVisible = await errorIndicator.isVisible().catch(() => false);

        if (isErrorVisible) {
            console.log('✅ Error handling UI is displayed');
        } else {
            console.log('⚠️ No explicit error UI, but page is still functional');
        }

        // Verify the page is still interactive
        await chatInput.click();
        await chatInput.fill('Another test message');

        console.log('✅ Chat remains functional after error');
    });

    test('should verify N8N workflow receives correct data', async ({ page }) => {
        console.log('Testing N8N webhook data payload...');

        // Navigate to the chat page
        await page.goto('http://localhost:3000/chat');
        await page.waitForLoadState('networkidle');

        // Find the chat input
        const chatInput = page.locator('.ProseMirror, [contenteditable="true"], textarea').first();
        await expect(chatInput).toBeVisible({ timeout: 10000 });

        // Intercept the webhook request to verify payload
        const webhookPayloadPromise = page.waitForRequest(
            request => request.url().includes('/api/n8n-webhook'),
            { timeout: 10000 }
        );

        // Send a message with specific content
        const testPayload = 'Find executive assistants at tech companies';
        await chatInput.click();
        await chatInput.fill(testPayload);
        await chatInput.press('Enter');

        // Capture the webhook request
        const webhookRequest = await webhookPayloadPromise;
        const payload = webhookRequest.postDataJSON();

        console.log('Webhook payload:', JSON.stringify(payload, null, 2));

        // Verify the payload structure
        expect(payload).toHaveProperty('message', testPayload);
        expect(payload).toHaveProperty('threadId');
        expect(payload).toHaveProperty('threadItemId');

        // Verify the webhook responds with SSE
        const response = await webhookRequest.response();
        if (response) {
            expect(response.status()).toBe(200);
            const headers = response.headers();
            expect(headers['content-type']).toContain('text/event-stream');

            console.log('✅ N8N webhook payload verification passed!');
        }
    });
});
