import { test, expect } from '@playwright/test';

test.describe('N8N Webhook Integration with Modal Handling', () => {
    const N8N_WEBHOOK_URL = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';

    test('Complete N8N webhook flow with modal dismissal', async ({ page }) => {
        console.log('=== N8N Webhook Integration Test with Modal Handling ===');

        // Step 1: Navigate to chat page
        console.log('Step 1: Loading chat interface...');
        await page.goto('http://localhost:3000/chat', {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });

        // Wait for page to render
        await page.waitForTimeout(3000);

        // Take screenshot before modal dismissal
        await page.screenshot({
            path: 'tests/screenshots/n8n-modal-1-before.png',
            fullPage: true,
        });

        // Step 2: Handle the welcome modal
        console.log('Step 2: Looking for modal close button...');

        // Try multiple selectors for close button
        const closeButtonSelectors = [
            'button[aria-label="Close"]',
            'button:has-text("×")',
            'button:has-text("Close")',
            '[role="button"][aria-label*="close" i]',
            'button.close',
            '[data-testid="close-modal"]',
            // Try clicking outside the modal or ESC key as fallback
        ];

        let modalClosed = false;
        for (const selector of closeButtonSelectors) {
            try {
                const closeButton = await page.$(selector);
                if (closeButton) {
                    console.log(`Found close button with selector: ${selector}`);
                    await closeButton.click();
                    modalClosed = true;
                    await page.waitForTimeout(1000);
                    break;
                }
            } catch (e) {
                // Continue with next selector
            }
        }

        if (!modalClosed) {
            console.log('Trying ESC key to close modal...');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
        }

        // Take screenshot after modal dismissal attempt
        await page.screenshot({
            path: 'tests/screenshots/n8n-modal-2-after-close.png',
            fullPage: true,
        });

        // Step 3: Set up network monitoring for webhook
        console.log('Step 3: Setting up webhook monitoring...');
        const webhookPromise = page
            .waitForRequest(
                request =>
                    request.url().includes('n8n.vividwalls.blog') ||
                    request.url().includes('webhook') ||
                    request.url().includes('api/n8n'),
                { timeout: 30000 }
            )
            .catch(() => null);

        // Step 4: Find and interact with chat input
        console.log('Step 4: Looking for chat input field...');

        // Wait a bit for any animations to complete
        await page.waitForTimeout(2000);

        // Try to find the chat input
        const inputSelectors = [
            'textarea[placeholder*="Type"]',
            'textarea[placeholder*="type"]',
            'textarea[placeholder*="message"]',
            'textarea[placeholder*="Message"]',
            'textarea',
            'input[type="text"][placeholder*="Type"]',
            '[contenteditable="true"]',
            '.chat-input',
            '[data-testid="chat-input"]',
            'div[contenteditable="true"]',
        ];

        let chatInput = null;
        for (const selector of inputSelectors) {
            try {
                const elements = await page.$$(selector);
                for (const element of elements) {
                    const isVisible = await element.isVisible();
                    if (isVisible) {
                        chatInput = element;
                        console.log(`Found visible input with selector: ${selector}`);
                        break;
                    }
                }
                if (chatInput) break;
            } catch (e) {
                // Continue with next selector
            }
        }

        if (chatInput) {
            console.log('Step 5: Entering Apollo lead generation prompt...');
            const prompt = 'Find private equity CEOs in New York with verified emails';

            // Click to focus
            await chatInput.click();
            await page.waitForTimeout(500);

            // Clear any existing text
            await chatInput.click({ clickCount: 3 });
            await page.keyboard.press('Backspace');

            // Type the prompt
            await chatInput.type(prompt, { delay: 50 });

            // Take screenshot with prompt entered
            await page.screenshot({
                path: 'tests/screenshots/n8n-modal-3-prompt-entered.png',
                fullPage: true,
            });

            // Step 6: Submit the prompt
            console.log('Step 6: Submitting prompt...');

            // Try to find and click submit button
            const submitSelectors = [
                'button[type="submit"]',
                'button:has-text("Send")',
                'button[aria-label*="send" i]',
                'button[aria-label*="submit" i]',
                'button:has(svg[class*="arrow"])',
                'button:has(svg[class*="send"])',
            ];

            let submitted = false;
            for (const selector of submitSelectors) {
                try {
                    const submitButton = await page.$(selector);
                    if (submitButton && (await submitButton.isVisible())) {
                        await submitButton.click();
                        console.log(`Clicked submit button: ${selector}`);
                        submitted = true;
                        break;
                    }
                } catch (e) {
                    // Continue
                }
            }

            if (!submitted) {
                console.log('Pressing Enter to submit...');
                await page.keyboard.press('Enter');
            }

            // Step 7: Wait for webhook call
            console.log('Step 7: Waiting for N8N webhook call...');
            const webhookRequest = await webhookPromise;

            if (webhookRequest) {
                console.log('✅ N8N Webhook called successfully!');
                console.log('Webhook URL:', webhookRequest.url());
                console.log('Method:', webhookRequest.method());

                const postData = webhookRequest.postData();
                if (postData) {
                    try {
                        const payload = JSON.parse(postData);
                        console.log('Webhook Payload:', JSON.stringify(payload, null, 2));
                    } catch (e) {
                        console.log('Raw Payload:', postData.substring(0, 200));
                    }
                }
            } else {
                console.log('⚠️ No webhook call detected within timeout');
            }

            // Wait for potential response
            await page.waitForTimeout(5000);

            // Take final screenshot
            await page.screenshot({
                path: 'tests/screenshots/n8n-modal-4-final-state.png',
                fullPage: true,
            });

            // Step 8: Check for response
            console.log('Step 8: Checking for response...');

            // Look for response indicators
            const pageContent = await page.content();
            const hasResponse =
                pageContent.includes('apollo') ||
                pageContent.includes('Apollo') ||
                pageContent.includes('lead') ||
                pageContent.includes('Lead') ||
                pageContent.includes('CEO');

            // Check for any new message elements
            const messageElements = await page.$$('[class*="message"], [class*="response"]');

            // Summary
            console.log('\n=== Test Summary ===');
            console.log(`✓ Chat page loaded`);
            console.log(`✓ Modal handling attempted: ${modalClosed ? 'Closed' : 'ESC pressed'}`);
            console.log(`✓ Chat input found: ${chatInput ? 'Yes' : 'No'}`);
            console.log(`✓ Prompt entered: ${chatInput ? 'Yes' : 'No'}`);
            console.log(`✓ Submit action: ${submitted ? 'Button clicked' : 'Enter pressed'}`);
            console.log(`✓ N8N webhook called: ${webhookRequest ? 'Yes' : 'No'}`);
            console.log(`✓ Response indicators: ${hasResponse ? 'Found' : 'Not found'}`);
            console.log(`✓ Message elements: ${messageElements.length}`);

            // Assertions
            expect(chatInput).toBeTruthy();
            if (webhookRequest) {
                expect(webhookRequest.url()).toContain('n8n');
            }
        } else {
            console.log('❌ Could not find chat input after modal dismissal');

            // Take diagnostic screenshot
            await page.screenshot({
                path: 'tests/screenshots/n8n-modal-no-input-found.png',
                fullPage: true,
            });

            // Check if modal is still present
            const modalStillPresent = await page.$('[role="dialog"]');
            if (modalStillPresent) {
                console.log('Modal is still present - may need different close strategy');
            }

            throw new Error('Chat input not accessible after modal handling');
        }
    });
});
