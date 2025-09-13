import { test, expect } from '@playwright/test';

test.describe('Apollo Directives Basic Test', () => {
    test('should load the application', async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:3000', { timeout: 30000 });

        // Wait for the page to load
        await page.waitForLoadState('domcontentloaded');

        // Take screenshot of the home page
        await page.screenshot({
            path: 'tests/screenshots/home-page.png',
            fullPage: true,
        });

        // Check if the page has loaded
        const title = await page.title();
        console.log('Page title:', title);

        // Try to navigate to chat
        await page.goto('http://localhost:3000/chat', { timeout: 30000 });
        await page.waitForLoadState('domcontentloaded');

        // Take screenshot of chat page
        await page.screenshot({
            path: 'tests/screenshots/chat-page.png',
            fullPage: true,
        });

        // Look for any prompt cards
        const promptElements = await page.$$('[class*="prompt"], [class*="card"], button');
        console.log('Found elements:', promptElements.length);

        // Look for Apollo-specific text
        const apolloTexts = [
            'Private Equity',
            'Executive Assistant',
            'Real Estate',
            'Lead Generation',
            'Apollo',
        ];

        for (const text of apolloTexts) {
            const elements = await page.$$(`text=/${text}/i`);
            if (elements.length > 0) {
                console.log(`Found "${text}":`, elements.length, 'occurrences');
            }
        }

        // Look for chat input
        const chatInputs = await page.$$('textarea, input[type="text"], [contenteditable="true"]');
        console.log('Found input elements:', chatInputs.length);

        if (chatInputs.length > 0) {
            // Try to type in the first input
            await chatInputs[0].fill('Test query: Find private equity CEOs');
            await page.screenshot({
                path: 'tests/screenshots/with-input.png',
                fullPage: true,
            });
        }
    });
});
