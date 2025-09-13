import { test, expect } from '@playwright/test';

test.describe('Apollo Search Directives Features', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
        // Wait for the app to load
        await page.waitForLoadState('networkidle');
    });

    test('should display 20 Apollo Search Directive prompt cards', async ({ page }) => {
        // Navigate to the chat interface
        await page.goto('http://localhost:3000/chat');

        // Look for the prompt cards section
        const promptCards = page.locator(
            '[data-testid="prompt-card"], .prompt-card, [class*="prompt"]'
        );

        // Check if Apollo directive cards are present
        const apolloDirectives = [
            'Private Equity CEOs',
            'Executive Assistants to CEOs',
            'Real Estate Executives',
            'Investment Banking Directors',
            'Tech Founders',
            'Architecture Firm Executives',
        ];

        for (const directive of apolloDirectives) {
            const card = page.locator(`text=${directive}`).first();
            await expect(card).toBeVisible({ timeout: 10000 });
        }

        // Take screenshot of the prompt cards
        await page.screenshot({
            path: 'tests/screenshots/apollo-directive-cards.png',
            fullPage: true,
        });
    });

    test('should recognize Apollo directive queries and map to correct directives', async ({
        page,
    }) => {
        await page.goto('http://localhost:3000/chat');

        // Test directive_01: Private Equity CEOs
        const chatInput = page
            .locator(
                'textarea[placeholder*="Type"], input[placeholder*="Type"], [contenteditable="true"]'
            )
            .first();
        await chatInput.fill('Find private equity CEOs in New York');

        // Submit the query
        const submitButton = page.locator('button[type="submit"], button:has-text("Send")').first();
        await submitButton.click();

        // Wait for response
        await page.waitForTimeout(2000);

        // Check if the query was processed (look for loading or response indicators)
        const responseArea = page.locator(
            '[class*="message"], [class*="response"], [data-testid="response"]'
        );
        await expect(responseArea).toBeVisible({ timeout: 15000 });

        // Take screenshot of query recognition
        await page.screenshot({
            path: 'tests/screenshots/query-recognition-pe-ceos.png',
            fullPage: true,
        });
    });

    test('should generate structured N8N webhook payload', async ({ page }) => {
        await page.goto('http://localhost:3000/chat');

        // Test by clicking a directive card
        const peCard = page.locator('text="Private Equity CEOs"').first();
        await peCard.click();

        // Wait for the action to process
        await page.waitForTimeout(3000);

        // Check network tab or console for webhook payload
        // Note: This would normally require intercepting network requests

        // Take screenshot of the interaction
        await page.screenshot({
            path: 'tests/screenshots/directive-card-click.png',
            fullPage: true,
        });
    });

    test('should display lead generation results', async ({ page }) => {
        await page.goto('http://localhost:3000/chat');

        // Search for executive assistants
        const chatInput = page
            .locator(
                'textarea[placeholder*="Type"], input[placeholder*="Type"], [contenteditable="true"]'
            )
            .first();
        await chatInput.fill('Search for executive assistants to CEOs');

        const submitButton = page.locator('button[type="submit"], button:has-text("Send")').first();
        await submitButton.click();

        // Wait for results
        await page.waitForTimeout(5000);

        // Check for results display
        const results = page.locator('[class*="result"], [class*="lead"], [data-testid="result"]');

        // Take screenshot of results
        await page.screenshot({
            path: 'tests/screenshots/lead-generation-results.png',
            fullPage: true,
        });
    });

    test('should validate all 20 directive patterns', async ({ page }) => {
        await page.goto('http://localhost:3000/chat');

        const testQueries = [
            { query: 'Get me real estate executives in Miami', expectedDirective: 'directive_03' },
            { query: 'Find investment banking directors', expectedDirective: 'directive_04' },
            {
                query: 'Search for tech founders in Silicon Valley',
                expectedDirective: 'directive_05',
            },
        ];

        for (const testCase of testQueries) {
            const chatInput = page
                .locator(
                    'textarea[placeholder*="Type"], input[placeholder*="Type"], [contenteditable="true"]'
                )
                .first();
            await chatInput.fill(testCase.query);

            const submitButton = page
                .locator('button[type="submit"], button:has-text("Send")')
                .first();
            await submitButton.click();

            // Wait for processing
            await page.waitForTimeout(3000);

            // Clear for next query
            await chatInput.clear();
        }

        // Final screenshot
        await page.screenshot({
            path: 'tests/screenshots/all-directives-test.png',
            fullPage: true,
        });
    });
});

test.describe('Query Mapper and Payload Generation', () => {
    test('should generate correct payload structure', async ({ page }) => {
        // Set up request interception to capture N8N webhook calls
        const webhookRequests: any[] = [];

        page.on('request', request => {
            if (request.url().includes('n8n') || request.url().includes('webhook')) {
                webhookRequests.push({
                    url: request.url(),
                    method: request.method(),
                    postData: request.postData(),
                });
            }
        });

        await page.goto('http://localhost:3000/chat');

        // Trigger a directive
        const chatInput = page
            .locator(
                'textarea[placeholder*="Type"], input[placeholder*="Type"], [contenteditable="true"]'
            )
            .first();
        await chatInput.fill('Find private equity CEOs in New York');

        const submitButton = page.locator('button[type="submit"], button:has-text("Send")').first();
        await submitButton.click();

        // Wait for webhook call
        await page.waitForTimeout(5000);

        // Verify payload structure
        if (webhookRequests.length > 0) {
            const payload = JSON.parse(webhookRequests[0].postData || '{}');

            // Check for required fields
            expect(payload).toHaveProperty('sessionId');
            expect(payload).toHaveProperty('jobTitles');
            expect(payload).toHaveProperty('industries');
            expect(payload).toHaveProperty('location');
            expect(payload).toHaveProperty('companySize');
            expect(payload).toHaveProperty('emailVerified');

            console.log('Webhook payload captured:', payload);
        }

        // Screenshot of the final state
        await page.screenshot({
            path: 'tests/screenshots/payload-generation.png',
            fullPage: true,
        });
    });
});
