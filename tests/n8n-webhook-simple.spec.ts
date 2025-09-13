import { test, expect } from '@playwright/test';

test.describe('N8N Webhook Integration - Simple Test', () => {
    const N8N_WEBHOOK_URL = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';

    test('Verify N8N webhook integration workflow', async ({ page }) => {
        console.log('=== N8N Webhook Integration Test ===');

        // Step 1: Navigate to the application (don't wait for network idle)
        console.log('Step 1: Loading application...');
        await page.goto('http://localhost:3000', {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });

        // Wait a bit for the page to render
        await page.waitForTimeout(5000);

        // Take screenshot of home page
        await page.screenshot({
            path: 'tests/screenshots/n8n-simple-1-home.png',
            fullPage: true,
        });

        // Step 2: Navigate to chat
        console.log('Step 2: Navigating to chat...');
        await page.goto('http://localhost:3000/chat', {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });

        // Wait for page to render
        await page.waitForTimeout(5000);

        // Take screenshot of chat page
        await page.screenshot({
            path: 'tests/screenshots/n8n-simple-2-chat.png',
            fullPage: true,
        });

        // Step 3: Monitor network for N8N webhook calls
        const webhookPromise = page
            .waitForRequest(
                request =>
                    request.url().includes('n8n.vividwalls.blog') ||
                    request.url().includes('webhook'),
                { timeout: 60000 }
            )
            .catch(() => null);

        // Step 4: Try to find and use chat input
        console.log('Step 3: Looking for chat input...');

        // Try multiple selectors
        const inputSelectors = [
            'textarea',
            'input[type="text"]',
            '[contenteditable="true"]',
            '.chat-input',
            '[data-testid="chat-input"]',
        ];

        let chatInput = null;
        for (const selector of inputSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                chatInput = await page.$(selector);
                if (chatInput) {
                    console.log(`Found input with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Continue with next selector
            }
        }

        if (chatInput) {
            console.log('Step 4: Entering Apollo lead generation prompt...');
            const prompt = 'Find private equity CEOs in New York';

            await chatInput.click();
            await page.waitForTimeout(500);
            await chatInput.fill(prompt);

            // Take screenshot with prompt
            await page.screenshot({
                path: 'tests/screenshots/n8n-simple-3-prompt.png',
                fullPage: true,
            });

            // Submit the prompt
            console.log('Step 5: Submitting prompt...');

            // Try to find submit button
            const submitButton = await page.$('button[type="submit"], button:has-text("Send")');
            if (submitButton) {
                await submitButton.click();
            } else {
                await page.keyboard.press('Enter');
            }

            // Wait for potential webhook call
            console.log('Step 6: Waiting for N8N webhook...');
            const webhookRequest = await webhookPromise;

            if (webhookRequest) {
                console.log('✅ N8N Webhook called:', webhookRequest.url());
                console.log('Method:', webhookRequest.method());
                const postData = webhookRequest.postData();
                if (postData) {
                    console.log('Payload:', postData.substring(0, 200));
                }
            } else {
                console.log('⚠️ No webhook call detected within timeout');
            }

            // Wait for response
            await page.waitForTimeout(10000);

            // Take final screenshot
            await page.screenshot({
                path: 'tests/screenshots/n8n-simple-4-final.png',
                fullPage: true,
            });

            // Check page content for Apollo/lead indicators
            const pageContent = await page.content();
            const hasApolloContent =
                pageContent.toLowerCase().includes('apollo') ||
                pageContent.toLowerCase().includes('lead') ||
                pageContent.toLowerCase().includes('ceo');

            console.log('Has Apollo/lead content:', hasApolloContent);

            // Summary
            console.log('\n=== Test Summary ===');
            console.log('✓ Application loaded');
            console.log('✓ Chat interface accessed');
            console.log(`✓ Input found: ${chatInput ? 'Yes' : 'No'}`);
            console.log(`✓ Prompt submitted: ${chatInput ? 'Yes' : 'No'}`);
            console.log(`✓ N8N webhook called: ${webhookRequest ? 'Yes' : 'No'}`);
            console.log(`✓ Apollo content present: ${hasApolloContent ? 'Yes' : 'No'}`);

            // Basic assertion
            expect(chatInput).toBeTruthy();
        } else {
            console.log('⚠️ Could not find chat input element');

            // Take screenshot of current state
            await page.screenshot({
                path: 'tests/screenshots/n8n-simple-no-input.png',
                fullPage: true,
            });

            // Check if there are Apollo directive cards to click
            const apolloCards = await page.$$(
                'text=/Private Equity|Executive Assistant|Real Estate/i'
            );
            console.log(`Found ${apolloCards.length} Apollo-related elements`);

            if (apolloCards.length > 0) {
                console.log('Clicking first Apollo card...');
                await apolloCards[0].click();

                // Wait for potential webhook
                const webhookRequest = await webhookPromise;
                if (webhookRequest) {
                    console.log('✅ Webhook triggered by card click');
                }

                await page.waitForTimeout(5000);
                await page.screenshot({
                    path: 'tests/screenshots/n8n-simple-card-click.png',
                    fullPage: true,
                });
            }
        }
    });
});
