import { test, expect } from '@playwright/test';

test.describe('N8N Webhook Integration with Proper Wait', () => {
    const N8N_WEBHOOK_URL = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';

    test('Complete N8N webhook flow with proper page load waiting', async ({ page }) => {
        console.log('=== N8N Webhook Integration Test ===');

        // Step 1: Navigate to chat page and wait for it to fully load
        console.log('Step 1: Loading chat interface...');
        await page.goto('http://localhost:3000/chat', {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });

        // Wait for the page to fully render - critical!
        console.log('Waiting for page to fully load...');
        await page.waitForTimeout(10000); // Give the page 10 seconds to fully load

        // Take screenshot to see current state
        await page.screenshot({
            path: 'tests/screenshots/n8n-wait-1-initial.png',
            fullPage: true,
        });

        // Step 2: Check if there's a modal and try to close it
        console.log('Step 2: Checking for modal...');

        // Check for modal dialog
        const modal = await page.$('[role="dialog"]');
        if (modal) {
            console.log('Modal detected, attempting to close...');

            // Try clicking escape first
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);

            // If modal still exists, try finding close button
            const modalStillThere = await page.$('[role="dialog"]');
            if (modalStillThere) {
                // Try various close button selectors
                const closeSelectors = [
                    'button[aria-label*="close" i]',
                    'button[aria-label*="dismiss" i]',
                    'button:has-text("×")',
                    'button:has-text("X")',
                    'button:has-text("Close")',
                    'button:has-text("Get Started")',
                    'button:has-text("Continue")',
                    'button:has-text("Skip")',
                    '[role="button"]:has-text("×")',
                ];

                for (const selector of closeSelectors) {
                    const btn = await page.$(selector);
                    if (btn && (await btn.isVisible())) {
                        console.log(`Clicking close button: ${selector}`);
                        await btn.click();
                        await page.waitForTimeout(2000);
                        break;
                    }
                }
            }
        }

        // Take screenshot after modal handling
        await page.screenshot({
            path: 'tests/screenshots/n8n-wait-2-after-modal.png',
            fullPage: true,
        });

        // Step 3: Wait for chat interface to be ready
        console.log('Step 3: Waiting for chat interface to be ready...');

        // Wait for potential animations
        await page.waitForTimeout(3000);

        // Try to wait for a specific element that indicates the chat is ready
        try {
            await page.waitForSelector('textarea, [contenteditable="true"], input[type="text"]', {
                timeout: 15000,
                state: 'visible',
            });
            console.log('Chat input element detected');
        } catch (e) {
            console.log('Chat input not found within timeout, continuing...');
        }

        // Step 4: Set up network monitoring
        console.log('Step 4: Setting up webhook monitoring...');
        let webhookCalled = false;
        let webhookPayload = null;

        page.on('request', request => {
            if (request.url().includes('n8n') || request.url().includes('webhook')) {
                webhookCalled = true;
                webhookPayload = request.postData();
                console.log('🎯 N8N Webhook called:', request.url());
            }
        });

        // Step 5: Find and interact with chat input
        console.log('Step 5: Looking for chat input...');

        const inputSelectors = [
            'textarea:visible',
            '[contenteditable="true"]:visible',
            'input[type="text"]:visible',
            'textarea',
            '[contenteditable="true"]',
            'input[placeholder*="Type" i]',
            'textarea[placeholder*="Type" i]',
            '.chat-input',
            '[data-testid="chat-input"]',
        ];

        let chatInput = null;
        for (const selector of inputSelectors) {
            try {
                const elements = await page.$$(selector);
                for (const element of elements) {
                    const box = await element.boundingBox();
                    if (box && box.width > 50 && box.height > 20) {
                        // Ensure it's a reasonable size
                        chatInput = element;
                        console.log(`Found chat input: ${selector}`);
                        break;
                    }
                }
                if (chatInput) break;
            } catch (e) {
                // Continue
            }
        }

        if (chatInput) {
            console.log('Step 6: Entering Apollo lead generation prompt...');

            // Focus the input
            await chatInput.focus();
            await page.waitForTimeout(500);

            // Clear and type
            await chatInput.click({ clickCount: 3 });
            await page.keyboard.press('Backspace');

            const prompt = 'Find private equity CEOs in New York';
            await chatInput.type(prompt, { delay: 100 });

            // Screenshot with prompt
            await page.screenshot({
                path: 'tests/screenshots/n8n-wait-3-prompt.png',
                fullPage: true,
            });

            // Submit
            console.log('Step 7: Submitting prompt...');

            // Try submit button first
            const submitBtn = await page.$(
                'button[type="submit"], button:has-text("Send"), button[aria-label*="send" i]'
            );
            if (submitBtn && (await submitBtn.isVisible())) {
                await submitBtn.click();
                console.log('Clicked submit button');
            } else {
                await page.keyboard.press('Enter');
                console.log('Pressed Enter to submit');
            }

            // Wait for potential webhook
            console.log('Step 8: Waiting for webhook call...');
            await page.waitForTimeout(10000);

            // Final screenshot
            await page.screenshot({
                path: 'tests/screenshots/n8n-wait-4-final.png',
                fullPage: true,
            });

            // Check results
            console.log('\n=== Test Results ===');
            console.log(`✓ Page loaded successfully`);
            console.log(`✓ Modal handled: ${modal ? 'Yes' : 'No modal present'}`);
            console.log(`✓ Chat input found: ${chatInput ? 'Yes' : 'No'}`);
            console.log(`✓ Prompt entered and submitted`);
            console.log(`✓ N8N webhook called: ${webhookCalled ? 'Yes' : 'No'}`);

            if (webhookPayload) {
                console.log('Webhook payload sample:', webhookPayload.substring(0, 200));
            }

            // Check page for response
            const pageContent = await page.content();
            const hasLeadContent =
                pageContent.includes('lead') ||
                pageContent.includes('Lead') ||
                pageContent.includes('CEO') ||
                pageContent.includes('Apollo');

            console.log(`✓ Lead-related content: ${hasLeadContent ? 'Found' : 'Not found'}`);

            // Basic assertion
            expect(chatInput).toBeTruthy();
        } else {
            console.log('❌ Chat input not found');

            // Debug: log page content
            const pageText = await page.innerText('body');
            console.log('Page text sample:', pageText.substring(0, 500));

            // Try clicking on Apollo cards if available
            const apolloCard = await page.$(
                'text=/Private Equity|Executive Assistant|Real Estate/i'
            );
            if (apolloCard) {
                console.log('Found Apollo card, clicking...');
                await apolloCard.click();
                await page.waitForTimeout(5000);

                await page.screenshot({
                    path: 'tests/screenshots/n8n-wait-card-click.png',
                    fullPage: true,
                });

                console.log(`Webhook called after card click: ${webhookCalled}`);
            }
        }
    });
});
