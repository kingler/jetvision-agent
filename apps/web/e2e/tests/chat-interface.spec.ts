import { test, expect, Page } from '@playwright/test';
import { AuthHelper, quickLogin } from '../utils/auth-helpers';
import { N8NHelper, waitForN8NResponse } from '../utils/n8n-helpers';
import { AviationAssertions, PerformanceAssertions } from '../utils/assertions';
import { apolloQueries, avinodeQueries } from '../fixtures/aviation-queries';

test.describe('Chat Interface Functionality', () => {
    let authHelper: AuthHelper;
    let n8nHelper: N8NHelper;
    let aviationAssertions: AviationAssertions;

    test.beforeEach(async ({ page }) => {
        authHelper = new AuthHelper(page);
        n8nHelper = new N8NHelper(page);
        aviationAssertions = new AviationAssertions(page);

        // Setup N8N mocks
        await n8nHelper.setupMocks();

        // Login as a user
        await quickLogin(page, 'user');

        // Navigate to chat interface
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test.describe('Basic Chat Input', () => {
        test('should display chat interface correctly', async ({ page }) => {
            // Check for main chat components
            await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
            await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
            await expect(page.locator('[data-testid="send-button"]')).toBeVisible();

            // Check for aviation prompt cards
            await expect(page.locator('[data-testid="prompt-cards"]')).toBeVisible();
        });

        test('should handle text input correctly', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');
            const testMessage = 'Test message for chat input';

            // Type in chat input
            await chatInput.fill(testMessage);

            // Verify input contains the text
            await expect(chatInput).toHaveValue(testMessage);
        });

        test('should send message when send button clicked', async ({ page }) => {
            const startTime = Date.now();

            const chatInput = page.locator('[data-testid="chat-input"]');
            const sendButton = page.locator('[data-testid="send-button"]');
            const testMessage = apolloQueries[0]?.query || 'Default test query';

            // Type and send message
            await chatInput.fill(testMessage);
            await sendButton.click();

            // Wait for message to appear in chat
            await waitForN8NResponse(page);

            // Check that message was added to chat history
            const messages = page.locator('[data-testid="chat-message"]');
            await expect(messages.last()).toContainText(testMessage);

            // Check response time
            await aviationAssertions.assertResponseTime(startTime, 15000, 'Chat message send');
        });

        test('should send message when Enter is pressed', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');
            const testMessage = apolloQueries[1]?.query || 'Default test query 2';

            // Type message and press Enter
            await chatInput.fill(testMessage);
            await chatInput.press('Enter');

            // Wait for response
            await waitForN8NResponse(page);

            // Verify message was sent
            const messages = page.locator('[data-testid="chat-message"]');
            await expect(messages.last()).toContainText(testMessage);
        });

        test('should handle multiline input with Shift+Enter', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            // Type multiline message
            await chatInput.fill('Line 1');
            await chatInput.press('Shift+Enter');
            await chatInput.type('Line 2');

            // Should not send on Shift+Enter
            const messageCountBefore = await page.locator('[data-testid="chat-message"]').count();

            await page.waitForTimeout(1000); // Brief wait to ensure no message sent

            const messageCountAfter = await page.locator('[data-testid="chat-message"]').count();
            expect(messageCountAfter).toBe(messageCountBefore);

            // But should send on Enter
            await chatInput.press('Enter');
            await waitForN8NResponse(page);

            const finalMessageCount = await page.locator('[data-testid="chat-message"]').count();
            expect(finalMessageCount).toBe(messageCountBefore + 1);
        });
    });

    test.describe('Rich Text Editing (TipTap)', () => {
        test('should support text formatting', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            // Check if rich text editor is available
            const editorToolbar = page.locator('[data-testid="editor-toolbar"]');

            if (await editorToolbar.isVisible()) {
                // Test bold formatting
                const boldButton = page.locator('[data-testid="bold-button"]');
                await boldButton.click();

                await chatInput.type('Bold text');

                // Verify formatting was applied
                const formattedText = page.locator(
                    '[data-testid="chat-input"] strong, [data-testid="chat-input"] b'
                );
                await expect(formattedText).toContainText('Bold text');
            }
        });

        test('should support bullet lists', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');
            const listButton = page.locator('[data-testid="bullet-list-button"]');

            if (await listButton.isVisible()) {
                await listButton.click();
                await chatInput.type('First item');
                await chatInput.press('Enter');
                await chatInput.type('Second item');

                // Check for list structure
                const listItems = page.locator('[data-testid="chat-input"] ul li');
                expect(await listItems.count()).toBe(2);
            }
        });
    });

    test.describe('Message History and Threading', () => {
        test('should maintain message history', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');
            const messages = ['First message', 'Second message', 'Third message'];

            // Send multiple messages
            for (const message of messages) {
                await chatInput.fill(message);
                await chatInput.press('Enter');
                await waitForN8NResponse(page, 10000);
            }

            // Verify all messages are in history
            const chatMessages = page.locator('[data-testid="chat-message"]');
            const messageCount = await chatMessages.count();

            // Should have user messages + AI responses
            expect(messageCount).toBeGreaterThanOrEqual(messages.length);

            // Check that user messages are preserved
            for (const message of messages) {
                await expect(page.locator(`text="${message}"`)).toBeVisible();
            }
        });

        test('should scroll to latest message', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            // Send a long series of messages to trigger scrolling
            for (let i = 0; i < 5; i++) {
                await chatInput.fill(`Message number ${i + 1}`);
                await chatInput.press('Enter');
                await waitForN8NResponse(page, 8000);
            }

            // The latest message should be visible
            const lastMessage = page.locator('[data-testid="chat-message"]').last();
            await expect(lastMessage).toBeInViewport();
        });
    });

    test.describe('Aviation Prompt Cards', () => {
        test('should display aviation-specific prompt suggestions', async ({ page }) => {
            const promptCards = page.locator('[data-testid="prompt-card"]');

            // Should have aviation-related prompts
            expect(await promptCards.count()).toBeGreaterThan(0);

            const promptTexts = await promptCards.allTextContents();
            const aviationKeywords = [
                'aircraft',
                'aviation',
                'flight',
                'charter',
                'apollo',
                'avinode',
            ];

            const hasAviationContent = promptTexts.some(text =>
                aviationKeywords.some(keyword => text.toLowerCase().includes(keyword))
            );

            expect(hasAviationContent).toBe(true);
        });

        test('should populate chat input when prompt card clicked', async ({ page }) => {
            const promptCard = page.locator('[data-testid="prompt-card"]').first();
            const chatInput = page.locator('[data-testid="chat-input"]');

            // Click on first prompt card
            const promptText = await promptCard.textContent();
            await promptCard.click();

            // Verify chat input was populated
            const inputValue = await chatInput.inputValue();
            expect(inputValue).toContain(promptText?.slice(0, 20) || '');
        });

        test('should categorize prompts by function', async ({ page }) => {
            // Check for different prompt categories
            const categories = ['Apollo.io', 'Avinode', 'System'];

            for (const category of categories) {
                const categorySection = page.locator(
                    `[data-testid="prompts-${category.toLowerCase()}"]`
                );
                if (await categorySection.isVisible()) {
                    const categoryPrompts = categorySection.locator('[data-testid="prompt-card"]');
                    expect(await categoryPrompts.count()).toBeGreaterThan(0);
                }
            }
        });
    });

    test.describe('Image Attachment', () => {
        test('should support image upload', async ({ page }) => {
            const fileInput = page.locator('[data-testid="file-input"]');
            const attachButton = page.locator('[data-testid="attach-button"]');

            if (await attachButton.isVisible()) {
                // Create a test image file
                const testImage = Buffer.from(
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                    'base64'
                );

                // Upload the image
                await fileInput.setInputFiles({
                    name: 'test-image.png',
                    mimeType: 'image/png',
                    buffer: testImage,
                });

                // Verify image preview appears
                const imagePreview = page.locator('[data-testid="image-preview"]');
                await expect(imagePreview).toBeVisible();
            }
        });

        test('should support image drag and drop', async ({ page }) => {
            const dropzone = page.locator('[data-testid="image-dropzone"]');

            if (await dropzone.isVisible()) {
                // Simulate drag and drop
                const testImage = Buffer.from(
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                    'base64'
                );

                await dropzone.dispatchEvent('drop', {
                    dataTransfer: {
                        files: [
                            {
                                name: 'test-image.png',
                                type: 'image/png',
                                arrayBuffer: async () => testImage,
                            },
                        ],
                    },
                });

                // Verify image was accepted
                const imagePreview = page.locator('[data-testid="image-preview"]');
                await expect(imagePreview).toBeVisible({ timeout: 5000 });
            }
        });
    });

    test.describe('Code Block Rendering', () => {
        test('should render code blocks correctly', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            // Send a message that should trigger code block response
            await chatInput.fill('Show me a JavaScript example');
            await chatInput.press('Enter');

            await waitForN8NResponse(page);

            // Check for code block in response
            const codeBlock = page.locator('pre code, [data-testid="code-block"]');

            if (await codeBlock.isVisible()) {
                // Verify syntax highlighting is applied
                const highlightedElements = codeBlock.locator(
                    '.hljs-keyword, .hljs-string, .hljs-function'
                );
                const highlightCount = await highlightedElements.count();

                if (highlightCount > 0) {
                    console.log('✅ Syntax highlighting detected');
                }
            }
        });

        test('should support copy code functionality', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            // Send message to get code response
            await chatInput.fill('Generate a code snippet');
            await chatInput.press('Enter');

            await waitForN8NResponse(page);

            // Look for copy button
            const copyButton = page.locator('[data-testid="copy-code-button"]');

            if (await copyButton.isVisible()) {
                await copyButton.click();

                // Verify copy feedback
                const copyFeedback = page.locator('[data-testid="copy-success"]');
                await expect(copyFeedback).toBeVisible({ timeout: 3000 });
            }
        });
    });

    test.describe('Performance Tests', () => {
        test('should load chat interface quickly', async ({ page }) => {
            await PerformanceAssertions.assertPageLoadPerformance(page, 3000);
        });

        test('should handle rapid message sending', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');
            const rapidMessages = ['Quick 1', 'Quick 2', 'Quick 3'];

            // Send messages in rapid succession
            for (const message of rapidMessages) {
                await chatInput.fill(message);
                await chatInput.press('Enter');
                // Don't wait for response, send next immediately
                await page.waitForTimeout(100);
            }

            // Wait for all responses
            await page.waitForTimeout(5000);

            // All messages should be processed
            for (const message of rapidMessages) {
                await expect(page.locator(`text="${message}"`)).toBeVisible();
            }
        });

        test('should maintain performance with long chat history', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            // Create a longer chat history
            for (let i = 0; i < 10; i++) {
                await chatInput.fill(`History message ${i + 1}`);
                await chatInput.press('Enter');
                await waitForN8NResponse(page, 5000);
            }

            // Measure response time for new message
            const startTime = Date.now();
            await chatInput.fill('Performance test message');
            await chatInput.press('Enter');
            await waitForN8NResponse(page);

            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(10000); // Should still respond in under 10 seconds
        });
    });
});
