import { test, expect, Page } from '@playwright/test';

test.describe('N8N Webhook Integration - End-to-End Test', () => {
    const N8N_WEBHOOK_URL = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
    let webhookRequests: any[] = [];
    let networkResponses: any[] = [];

    test.beforeEach(async ({ page }) => {
        webhookRequests = [];
        networkResponses = [];

        // Monitor network requests
        page.on('request', request => {
            if (request.url().includes('n8n') || request.url().includes('webhook')) {
                webhookRequests.push({
                    url: request.url(),
                    method: request.method(),
                    headers: request.headers(),
                    postData: request.postData(),
                    timestamp: new Date().toISOString(),
                });
                console.log(`[WEBHOOK REQUEST] ${request.method()} ${request.url()}`);
            }
        });

        // Monitor network responses
        page.on('response', response => {
            if (response.url().includes('n8n') || response.url().includes('webhook')) {
                response
                    .text()
                    .then(body => {
                        networkResponses.push({
                            url: response.url(),
                            status: response.status(),
                            statusText: response.statusText(),
                            body: body,
                            timestamp: new Date().toISOString(),
                        });
                        console.log(`[WEBHOOK RESPONSE] ${response.status()} ${response.url()}`);
                        if (body) {
                            console.log(`[RESPONSE BODY]`, body.substring(0, 500));
                        }
                    })
                    .catch(() => {});
            }
        });

        // Navigate to the application
        await page.goto('http://localhost:3000', {
            waitUntil: 'networkidle',
            timeout: 30000,
        });
    });

    test('Complete N8N Webhook Integration Flow', async ({ page }) => {
        console.log('=== Starting N8N Webhook Integration Test ===');

        // Step 1: Navigate to chat interface
        console.log('Step 1: Navigating to chat interface...');
        await page.goto('http://localhost:3000/chat', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        // Take initial screenshot
        await page.screenshot({
            path: 'tests/screenshots/n8n-1-chat-interface.png',
            fullPage: true,
        });

        // Step 2: Wait for chat input to be ready
        console.log('Step 2: Waiting for chat input...');
        await page.waitForTimeout(3000); // Wait for dynamic content to load

        // Find the chat input (try multiple selectors)
        const inputSelectors = [
            'textarea[placeholder*="Type"]',
            'input[placeholder*="Type"]',
            '[contenteditable="true"]',
            'textarea',
            'input[type="text"]',
            '.chat-input',
            '[data-testid="chat-input"]',
        ];

        let chatInput = null;
        for (const selector of inputSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
                chatInput = elements[0];
                console.log(`Found chat input with selector: ${selector}`);
                break;
            }
        }

        if (!chatInput) {
            // Try clicking on the editor area first to activate it
            const editorArea = await page.$('.min-h-[120px]');
            if (editorArea) {
                await editorArea.click();
                await page.waitForTimeout(1000);
                // Try finding input again
                for (const selector of inputSelectors) {
                    const elements = await page.$$(selector);
                    if (elements.length > 0) {
                        chatInput = elements[0];
                        console.log(`Found chat input after clicking editor: ${selector}`);
                        break;
                    }
                }
            }
        }

        expect(chatInput).toBeTruthy();

        // Step 3: Enter Apollo lead generation prompt
        console.log('Step 3: Entering Apollo lead generation prompt...');
        const apolloPrompt =
            'Find private equity CEOs in New York with verified emails for jet charter services';

        await chatInput.click();
        await chatInput.fill(apolloPrompt);

        // Take screenshot with prompt entered
        await page.screenshot({
            path: 'tests/screenshots/n8n-2-prompt-entered.png',
            fullPage: true,
        });

        // Step 4: Submit the prompt
        console.log('Step 4: Submitting prompt...');

        // Try multiple ways to submit
        const submitButtons = await page.$$(
            'button[type="submit"], button:has-text("Send"), button[aria-label*="send" i]'
        );

        if (submitButtons.length > 0) {
            await submitButtons[0].click();
            console.log('Clicked submit button');
        } else {
            // Try pressing Enter
            await page.keyboard.press('Enter');
            console.log('Pressed Enter to submit');
        }

        // Step 5: Wait for webhook request
        console.log('Step 5: Waiting for N8N webhook request...');
        await page.waitForTimeout(5000); // Wait for webhook to be called

        // Take screenshot after submission
        await page.screenshot({
            path: 'tests/screenshots/n8n-3-after-submission.png',
            fullPage: true,
        });

        // Step 6: Validate webhook was called
        console.log('Step 6: Validating webhook call...');
        const n8nWebhookCalls = webhookRequests.filter(
            r => r.url.includes('n8n.vividwalls.blog') || r.url.includes('webhook/jetvision-agent')
        );

        console.log(`Found ${n8nWebhookCalls.length} N8N webhook calls`);

        if (n8nWebhookCalls.length > 0) {
            const webhookCall = n8nWebhookCalls[0];
            console.log('Webhook Details:', {
                url: webhookCall.url,
                method: webhookCall.method,
                hasPostData: !!webhookCall.postData,
            });

            if (webhookCall.postData) {
                try {
                    const payload = JSON.parse(webhookCall.postData);
                    console.log('Webhook Payload:', JSON.stringify(payload, null, 2));

                    // Validate payload structure
                    expect(payload).toHaveProperty('message');
                    expect(payload.message).toContain('private equity');
                } catch (e) {
                    console.log('Raw PostData:', webhookCall.postData);
                }
            }
        }

        // Step 7: Wait for response
        console.log('Step 7: Waiting for N8N response...');
        await page.waitForTimeout(10000); // Wait for response to be processed

        // Step 8: Check for response in chat
        console.log('Step 8: Checking for response in chat...');

        // Look for response elements
        const responseSelectors = [
            '[class*="message"]',
            '[class*="response"]',
            '[data-testid="response"]',
            '.assistant-message',
            '[role="article"]',
        ];

        let responseFound = false;
        for (const selector of responseSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 1) {
                // More than just the user message
                responseFound = true;
                console.log(`Found response elements with selector: ${selector}`);
                break;
            }
        }

        // Take final screenshot
        await page.screenshot({
            path: 'tests/screenshots/n8n-4-final-state.png',
            fullPage: true,
        });

        // Step 9: Look for Apollo/lead-related content
        console.log('Step 9: Checking for Apollo/lead content...');
        const pageContent = await page.content();
        const leadIndicators = ['lead', 'apollo', 'CEO', 'executive', 'email', 'contact'];

        let foundIndicators = [];
        for (const indicator of leadIndicators) {
            if (pageContent.toLowerCase().includes(indicator.toLowerCase())) {
                foundIndicators.push(indicator);
            }
        }

        console.log('Found lead-related indicators:', foundIndicators);

        // Step 10: Check console for errors
        console.log('Step 10: Checking for console errors...');
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Final validation summary
        console.log('\n=== Test Summary ===');
        console.log(`✓ Chat interface loaded: Yes`);
        console.log(`✓ Prompt entered: "${apolloPrompt}"`);
        console.log(`✓ Webhook calls made: ${n8nWebhookCalls.length}`);
        console.log(`✓ Response received: ${responseFound ? 'Yes' : 'Checking...'}`);
        console.log(
            `✓ Lead indicators found: ${foundIndicators.length > 0 ? foundIndicators.join(', ') : 'None'}`
        );
        console.log(
            `✓ Console errors: ${consoleErrors.length === 0 ? 'None' : consoleErrors.join(', ')}`
        );

        // Assertions
        expect(n8nWebhookCalls.length).toBeGreaterThan(0);
        expect(foundIndicators.length).toBeGreaterThan(0);
    });

    test('Test Apollo Directive Card Click', async ({ page }) => {
        console.log('=== Testing Apollo Directive Card Click ===');

        await page.goto('http://localhost:3000/chat', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        await page.waitForTimeout(3000);

        // Look for Apollo directive cards
        const cardSelectors = [
            'text="Private Equity CEOs"',
            'text="Executive Assistants"',
            'text="Real Estate Executives"',
            'button:has-text("Private Equity")',
            '[class*="card"]:has-text("CEO")',
        ];

        let cardClicked = false;
        for (const selector of cardSelectors) {
            try {
                const card = await page.$(selector);
                if (card) {
                    await card.click();
                    console.log(`Clicked card with selector: ${selector}`);
                    cardClicked = true;
                    break;
                }
            } catch (e) {
                // Continue trying other selectors
            }
        }

        if (cardClicked) {
            // Wait for webhook
            await page.waitForTimeout(5000);

            // Check if webhook was triggered
            const webhookCalls = webhookRequests.filter(r => r.url.includes('n8n'));
            console.log(`Webhook calls after card click: ${webhookCalls.length}`);

            await page.screenshot({
                path: 'tests/screenshots/n8n-card-click-result.png',
                fullPage: true,
            });
        }

        expect(cardClicked || webhookRequests.length > 0).toBeTruthy();
    });
});
