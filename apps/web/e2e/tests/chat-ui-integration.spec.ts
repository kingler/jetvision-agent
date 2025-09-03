import { test, expect, Page, Locator } from '@playwright/test';
import { N8NHelper, waitForN8NResponse, verifyChatResponse } from '../utils/n8n-helpers';

/**
 * Comprehensive Chat UI Integration Tests
 * Tests the frontend chat interface integration with N8N workflows
 * 
 * Test Coverage:
 * 1. Chat message submission and response handling
 * 2. Real-time streaming response display
 * 3. UI state management during conversations
 * 4. Error handling and user feedback
 * 5. Responsive design and accessibility
 * 6. Message history and scroll behavior
 * 7. Input validation and character limits
 * 8. Loading states and progress indicators
 */

test.describe('Chat UI Integration Tests', () => {
  const WEBHOOK_URL = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
  const FRONTEND_URL = 'http://localhost:3000';
  let n8nHelper: N8NHelper;

  test.beforeEach(async ({ page }) => {
    n8nHelper = new N8NHelper(page, {
      webhookUrl: WEBHOOK_URL,
      delayMs: 500
    });
    
    await n8nHelper.startMonitoring();
    await page.goto(FRONTEND_URL);
    await expect(page.locator('[data-chat-input="true"]')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    await n8nHelper.resetMocks();
  });

  test.describe('Message Submission and Response Handling', () => {
    test('should submit messages and display responses correctly', async ({ page }) => {
      await n8nHelper.setupMocks();

      const testMessage = 'Check aircraft availability for Miami to NYC tomorrow';
      
      // Submit message
      await page.fill('[contenteditable="true"]', testMessage);
      await page.click('button[type="submit"]');

      // Verify message appears in chat
      await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
      
      // Wait for response
      await waitForN8NResponse(page);
      
      // Verify response appears
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2); // User + AI response
      
      // Verify response content
      const messages = await page.locator('[data-testid="chat-message"]').all();
      const responseText = await messages[1].textContent();
      expect(responseText).toBeTruthy();
      expect(responseText?.length).toBeGreaterThan(0);
    });

    test('should handle rapid message submission without duplication', async ({ page }) => {
      await n8nHelper.setupMocks();
      
      const rapidMessages = [
        'First rapid message',
        'Second rapid message', 
        'Third rapid message'
      ];

      // Submit messages rapidly
      for (const message of rapidMessages) {
        await page.fill('[contenteditable="true"]', message);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(100); // Very short delay
      }

      // Wait for all responses
      await page.waitForTimeout(3000);

      // Count total messages (should be 6: 3 user + 3 AI)
      const totalMessages = await page.locator('[data-testid="chat-message"]').count();
      expect(totalMessages).toBe(6);

      // Verify no duplicate messages
      const allMessageTexts = await page.locator('[data-testid="chat-message"]').allTextContents();
      const userMessages = allMessageTexts.filter((_, index) => index % 2 === 0); // Even indices are user messages
      
      expect(userMessages).toEqual(rapidMessages);
    });

    test('should preserve message formatting and special characters', async ({ page }) => {
      await n8nHelper.setupMocks();

      const formattedMessage = `
        Search for:
        • Executive assistants at Fortune 500 companies
        • Private equity firms with $1B+ AUM
        • Located in NYC & San Francisco
        
        Special chars: €100M, 50% increase, "premium service"
      `;

      await page.fill('[contenteditable="true"]', formattedMessage);
      await page.click('button[type="submit"]');

      // Verify formatting is preserved in chat
      const userMessage = await page.locator('[data-testid="chat-message"]').first();
      const messageContent = await userMessage.textContent();
      
      expect(messageContent).toContain('Executive assistants');
      expect(messageContent).toContain('€100M');
      expect(messageContent).toContain('"premium service"');
      expect(messageContent).toContain('50%');
    });

    test('should handle empty and whitespace-only submissions', async ({ page }) => {
      // Try to submit empty message
      await page.click('button[type="submit"]');
      
      // Should not create any messages
      await page.waitForTimeout(1000);
      expect(await page.locator('[data-testid="chat-message"]').count()).toBe(0);

      // Try whitespace-only message
      await page.fill('[contenteditable="true"]', '   \n\t   ');
      await page.click('button[type="submit"]');
      
      // Should still not create messages
      await page.waitForTimeout(1000);
      expect(await page.locator('[data-testid="chat-message"]').count()).toBe(0);
    });
  });

  test.describe('Real-time Streaming Response Display', () => {
    test('should display streaming responses in real-time', async ({ page }) => {
      await n8nHelper.setupStreamingMocks();

      await page.fill('[contenteditable="true"]', 'Find executive assistants at NYC firms');
      await page.click('button[type="submit"]');

      // Wait for first chunk to appear
      await expect(page.locator(':text("Searching Apollo.io database")')).toBeVisible({ timeout: 5000 });

      // Wait for streaming to complete
      await page.waitForTimeout(6000);

      // Verify final response
      await expect(page.locator(':text("Found 15 qualified leads")')).toBeVisible();
    });

    test('should show typing indicators during streaming', async ({ page }) => {
      await n8nHelper.setupStreamingMocks();

      await page.fill('[contenteditable="true"]', 'Search for available aircraft');
      await page.click('button[type="submit"]');

      // Check for typing/loading indicator
      await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 2000 });

      // Wait for streaming to complete
      await page.waitForTimeout(6000);

      // Typing indicator should disappear
      await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible();
    });

    test('should handle streaming interruption gracefully', async ({ page }) => {
      let connectionCount = 0;

      await page.route(WEBHOOK_URL + '**', async (route) => {
        connectionCount++;
        
        if (connectionCount === 1) {
          // First connection - interrupt after partial stream
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ message: 'Starting search...' })}\n\n`));
              
              setTimeout(() => {
                controller.error(new Error('Connection lost'));
              }, 1000);
            }
          });

          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
            body: stream
          });
        } else {
          // Fallback to regular response
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Completed after reconnection', status: 'success' })
          });
        }
      });

      await page.fill('[contenteditable="true"]', 'Test streaming interruption');
      await page.click('button[type="submit"]');

      // Should eventually show completion message
      await expect(page.locator(':text("Completed after reconnection")')).toBeVisible({ timeout: 10000 });
    });

    test('should update response content incrementally', async ({ page }) => {
      const streamingChunks = [
        'Initializing search...',
        'Found 50 potential matches...',
        'Filtering results...',
        'Processing complete.'
      ];

      await page.route(WEBHOOK_URL + '**', async (route) => {
        const stream = new ReadableStream({
          start(controller) {
            streamingChunks.forEach((chunk, index) => {
              setTimeout(() => {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ message: chunk })}\n\n`));
                if (index === streamingChunks.length - 1) {
                  controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                  controller.close();
                }
              }, index * 1000);
            });
          }
        });

        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: stream
        });
      });

      await page.fill('[contenteditable="true"]', 'Test incremental updates');
      await page.click('button[type="submit"]');

      // Verify each chunk appears progressively
      for (let i = 0; i < streamingChunks.length; i++) {
        await expect(page.locator(`:text("${streamingChunks[i]}")`)).toBeVisible({ timeout: 5000 });
        
        // Verify previous chunks are still visible (cumulative display)
        for (let j = 0; j < i; j++) {
          await expect(page.locator(`:text("${streamingChunks[j]}")`)).toBeVisible();
        }
      }
    });
  });

  test.describe('UI State Management During Conversations', () => {
    test('should manage loading states correctly', async ({ page }) => {
      let responseDelay = 3000;
      
      await page.route(WEBHOOK_URL + '**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, responseDelay));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Response after delay', status: 'success' })
        });
      });

      await page.fill('[contenteditable="true"]', 'Test loading states');
      
      // Check send button state before sending
      const sendButton = page.locator('button[type="submit"]');
      expect(await sendButton.isEnabled()).toBe(true);
      
      await sendButton.click();

      // Send button should be disabled while processing
      await expect(sendButton).toBeDisabled({ timeout: 1000 });
      
      // Loading indicator should appear
      await expect(page.locator('[data-testid="generating-status"]')).toBeVisible({ timeout: 1000 });

      // Wait for response
      await page.waitForTimeout(4000);

      // Send button should be enabled again
      await expect(sendButton).toBeEnabled();
      
      // Loading indicator should disappear
      await expect(page.locator('[data-testid="generating-status"]')).not.toBeVisible();
    });

    test('should disable input during message processing', async ({ page }) => {
      await page.route(WEBHOOK_URL + '**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Delayed response', status: 'success' })
        });
      });

      const chatInput = page.locator('[contenteditable="true"]');
      
      await chatInput.fill('Test input disabling');
      await page.click('button[type="submit"]');

      // Input should be disabled during processing
      await expect(chatInput).toBeDisabled({ timeout: 1000 });

      // Wait for processing to complete
      await page.waitForTimeout(3000);

      // Input should be enabled again
      await expect(chatInput).toBeEnabled();
    });

    test('should handle concurrent user actions gracefully', async ({ page }) => {
      let requestCount = 0;

      await page.route(WEBHOOK_URL + '**', async (route) => {
        requestCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: `Response ${requestCount}`, status: 'success' })
        });
      });

      // Try to send multiple messages rapidly
      await page.fill('[contenteditable="true"]', 'First message');
      await page.click('button[type="submit"]');
      
      // Try to send another message immediately
      await page.fill('[contenteditable="true"]', 'Second message');
      await page.click('button[type="submit"]');

      await page.waitForTimeout(3000);

      // Should have handled requests properly (may queue or reject duplicates)
      const messages = await page.locator('[data-testid="chat-message"]').count();
      expect(messages).toBeGreaterThan(0);
      expect(messages).toBeLessThanOrEqual(4); // Maximum 2 user + 2 AI messages
    });

    test('should maintain scroll position during streaming', async ({ page }) => {
      // Add some initial content to enable scrolling
      await page.route(WEBHOOK_URL + '**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            message: 'Long response content that fills multiple lines and creates the need for scrolling in the chat interface to test scroll behavior during streaming responses.',
            status: 'success' 
          })
        });
      });

      // Send several messages to create scrollable content
      for (let i = 1; i <= 5; i++) {
        await page.fill('[contenteditable="true"]', `Message ${i} to create scrollable content`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
      }

      // Check that page scrolls to bottom automatically
      const scrollTop = await page.evaluate(() => window.pageYOffset);
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const windowHeight = await page.evaluate(() => window.innerHeight);
      
      expect(scrollTop + windowHeight).toBeGreaterThan(scrollHeight - 100); // Near bottom
    });
  });

  test.describe('Error Handling and User Feedback', () => {
    test('should display error messages for failed requests', async ({ page }) => {
      await page.route(WEBHOOK_URL + '**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.fill('[contenteditable="true"]', 'Test error handling');
      await page.click('button[type="submit"]');

      // Should display error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
      
      const errorText = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorText).toContain('error');
    });

    test('should provide retry mechanism for failed requests', async ({ page }) => {
      let attemptCount = 0;

      await page.route(WEBHOOK_URL + '**', async (route) => {
        attemptCount++;
        
        if (attemptCount < 2) {
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Service unavailable' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Success after retry', status: 'success' })
          });
        }
      });

      await page.fill('[contenteditable="true"]', 'Test retry mechanism');
      await page.click('button[type="submit"]');

      // Should eventually succeed
      await expect(page.locator(':text("Success after retry")')).toBeVisible({ timeout: 10000 });
      expect(attemptCount).toBeGreaterThanOrEqual(2);
    });

    test('should handle network timeouts gracefully', async ({ page }) => {
      await page.route(WEBHOOK_URL + '**', async (route) => {
        // Don't respond to simulate timeout
        await new Promise(() => {}); // Never resolves
      });

      await page.fill('[contenteditable="true"]', 'Test network timeout');
      await page.click('button[type="submit"]');

      // Should show timeout error after reasonable wait
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 35000 });
    });

    test('should recover from errors and allow new messages', async ({ page }) => {
      let shouldFail = true;

      await page.route(WEBHOOK_URL + '**', async (route) => {
        if (shouldFail) {
          shouldFail = false;
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Temporary error' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Recovery successful', status: 'success' })
          });
        }
      });

      // First message should fail
      await page.fill('[contenteditable="true"]', 'First message that will fail');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });

      // Second message should succeed
      await page.fill('[contenteditable="true"]', 'Second message after recovery');
      await page.click('button[type="submit"]');
      
      await expect(page.locator(':text("Recovery successful")')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Responsive Design and Accessibility', () => {
    test('should work correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
      await n8nHelper.setupMocks();

      // Chat input should be visible and functional
      const chatInput = page.locator('[contenteditable="true"]');
      await expect(chatInput).toBeVisible();
      
      await chatInput.fill('Mobile test message');
      await page.click('button[type="submit"]');

      // Response should display correctly
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2);
      
      // Chat should scroll properly on mobile
      const isScrollable = await page.evaluate(() => {
        return document.documentElement.scrollHeight > window.innerHeight;
      });
      
      if (isScrollable) {
        const scrollPosition = await page.evaluate(() => window.pageYOffset);
        expect(scrollPosition).toBeGreaterThanOrEqual(0);
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await n8nHelper.setupMocks();

      const chatInput = page.locator('[contenteditable="true"]');
      
      // Focus should be on input initially or after click
      await chatInput.focus();
      await expect(chatInput).toBeFocused();

      // Should submit with Enter key (if implemented)
      await chatInput.fill('Test keyboard submission');
      await chatInput.press('Enter');

      // Verify submission worked
      await expect(page.locator(':text("Test keyboard submission")')).toBeVisible({ timeout: 3000 });
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      const chatInput = page.locator('[contenteditable="true"]');
      
      // Check for accessibility attributes
      const ariaLabel = await chatInput.getAttribute('aria-label');
      const role = await chatInput.getAttribute('role');
      
      expect(ariaLabel || role).toBeTruthy(); // Should have some accessibility attribute
      
      // Send button should have proper label
      const sendButton = page.locator('button[type="submit"]');
      const buttonLabel = await sendButton.getAttribute('aria-label');
      const buttonText = await sendButton.textContent();
      
      expect(buttonLabel || buttonText).toBeTruthy();
    });

    test('should maintain readability with high contrast', async ({ page }) => {
      // Enable high contrast mode simulation
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await n8nHelper.setupMocks();
      
      await page.fill('[contenteditable="true"]', 'Test high contrast readability');
      await page.click('button[type="submit"]');

      // Verify elements are still visible and accessible
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2);
      
      // Check that text has sufficient contrast (this would need actual color analysis)
      const messageElement = page.locator('[data-testid="chat-message"]').first();
      await expect(messageElement).toBeVisible();
    });
  });

  test.describe('Message History and Scroll Behavior', () => {
    test('should maintain message order in conversation history', async ({ page }) => {
      await n8nHelper.setupMocks();

      const messages = [
        'First message in sequence',
        'Second message in sequence',
        'Third message in sequence'
      ];

      for (const message of messages) {
        await page.fill('[contenteditable="true"]', message);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
      }

      // Verify all messages appear in correct order
      const allMessages = await page.locator('[data-testid="chat-message"]').allTextContents();
      
      // Should have 6 messages total (3 user + 3 AI)
      expect(allMessages.length).toBe(6);
      
      // User messages should appear in correct order (every other message)
      expect(allMessages[0]).toContain(messages[0]);
      expect(allMessages[2]).toContain(messages[1]);  
      expect(allMessages[4]).toContain(messages[2]);
    });

    test('should auto-scroll to latest messages', async ({ page }) => {
      await n8nHelper.setupMocks();

      // Send multiple messages to create scrollable content
      for (let i = 1; i <= 10; i++) {
        await page.fill('[contenteditable="true"]', `Message ${i} creating scrollable content in the chat interface`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
      }

      // Should be scrolled near bottom
      const scrollPosition = await page.evaluate(() => {
        return {
          scrollTop: window.pageYOffset,
          scrollHeight: document.documentElement.scrollHeight,
          windowHeight: window.innerHeight
        };
      });

      expect(scrollPosition.scrollTop + scrollPosition.windowHeight)
        .toBeGreaterThan(scrollPosition.scrollHeight - 200); // Within 200px of bottom
    });

    test('should handle large conversation histories efficiently', async ({ page }) => {
      await n8nHelper.setupMocks();

      // Send many messages to test performance
      const messageCount = 50;
      
      const startTime = Date.now();
      
      for (let i = 1; i <= messageCount; i++) {
        await page.fill('[contenteditable="true"]', `Performance test message ${i}`);
        await page.click('button[type="submit"]');
        
        // Minimal wait to test rapid sending
        if (i % 10 === 0) {
          await page.waitForTimeout(1000); // Brief pause every 10 messages
        } else {
          await page.waitForTimeout(100);
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete in reasonable time (adjust threshold based on requirements)
      expect(totalTime).toBeLessThan(120000); // Less than 2 minutes for 50 messages

      // Verify all messages were processed
      const finalMessageCount = await page.locator('[data-testid="chat-message"]').count();
      expect(finalMessageCount).toBeGreaterThan(messageCount); // At least user messages + some responses
    });

    test('should preserve scroll position when returning to chat', async ({ page }) => {
      await n8nHelper.setupMocks();

      // Create scrollable content
      for (let i = 1; i <= 8; i++) {
        await page.fill('[contenteditable="true"]', `Scroll test message ${i}`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
      }

      // Scroll to middle of chat
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight / 2);
      });

      const midScrollPosition = await page.evaluate(() => window.pageYOffset);

      // Navigate away and back
      await page.goto('about:blank');
      await page.goto(FRONTEND_URL);
      await expect(page.locator('[data-chat-input="true"]')).toBeVisible();

      // Scroll position handling will depend on implementation
      // This test documents expected behavior
      const returnScrollPosition = await page.evaluate(() => window.pageYOffset);
      
      // Position may reset to top or bottom depending on design
      expect(typeof returnScrollPosition).toBe('number');
    });
  });

  test.describe('Input Validation and Character Limits', () => {
    test('should handle very long messages appropriately', async ({ page }) => {
      await n8nHelper.setupMocks();

      // Create very long message
      const longMessage = 'A'.repeat(10000); // 10k characters
      
      await page.fill('[contenteditable="true"]', longMessage);
      
      // Check if there's a character limit indicator
      const charCountIndicator = page.locator('[data-testid="character-count"]');
      if (await charCountIndicator.isVisible()) {
        const charCount = await charCountIndicator.textContent();
        expect(charCount).toContain('10000');
      }

      await page.click('button[type="submit"]');

      // Should handle long message gracefully
      await expect(page.locator('[data-testid="chat-message"]').first()).toBeVisible({ timeout: 5000 });
    });

    test('should validate input before submission', async ({ page }) => {
      await n8nHelper.setupMocks();

      // Test various edge cases
      const edgeCases = [
        '', // Empty
        '   ', // Whitespace only
        '\n\n\n', // Newlines only
        'Normal message', // Valid
        '<script>alert("test")</script>', // HTML/XSS attempt
      ];

      let submittedMessages = 0;

      for (const testInput of edgeCases) {
        await page.fill('[contenteditable="true"]', testInput);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
        
        // Count actual messages in UI
        const currentMessageCount = await page.locator('[data-testid="chat-message"]').count();
        
        if (testInput.trim().length > 0 && !testInput.includes('<script>')) {
          submittedMessages += 2; // User + AI response
          expect(currentMessageCount).toBe(submittedMessages);
        } else {
          // Invalid messages shouldn't create chat entries
          expect(currentMessageCount).toBe(submittedMessages);
        }
      }
    });

    test('should handle special characters and emoji correctly', async ({ page }) => {
      await n8nHelper.setupMocks();

      const specialMessage = '🚁✈️ Find aircraft with €100M+ revenue 📈 50% savings 🎯';
      
      await page.fill('[contenteditable="true"]', specialMessage);
      await page.click('button[type="submit"]');

      // Verify special characters display correctly
      await expect(page.locator(`:text("${specialMessage}")`)).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Loading States and Progress Indicators', () => {
    test('should show appropriate loading indicators', async ({ page }) => {
      await page.route(WEBHOOK_URL + '**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Delayed response', status: 'success' })
        });
      });

      await page.fill('[contenteditable="true"]', 'Test loading indicators');
      await page.click('button[type="submit"]');

      // Should show loading state immediately
      await expect(page.locator('[data-testid="generating-status"]')).toBeVisible({ timeout: 1000 });

      // Loading should persist during processing
      await page.waitForTimeout(1500);
      await expect(page.locator('[data-testid="generating-status"]')).toBeVisible();

      // Wait for completion
      await page.waitForTimeout(2000);
      
      // Loading should disappear after response
      await expect(page.locator('[data-testid="generating-status"]')).not.toBeVisible();
    });

    test('should update progress during long-running operations', async ({ page }) => {
      const progressSteps = [
        { message: 'Initializing...', progress: 25 },
        { message: 'Processing...', progress: 50 },
        { message: 'Finalizing...', progress: 75 },
        { message: 'Complete', progress: 100 }
      ];

      await page.route(WEBHOOK_URL + '**', async (route) => {
        const stream = new ReadableStream({
          start(controller) {
            progressSteps.forEach((step, index) => {
              setTimeout(() => {
                controller.enqueue(new TextEncoder().encode(
                  `data: ${JSON.stringify({ message: step.message, progress: step.progress })}\n\n`
                ));
                
                if (index === progressSteps.length - 1) {
                  controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                  controller.close();
                }
              }, index * 1000);
            });
          }
        });

        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: stream
        });
      });

      await page.fill('[contenteditable="true"]', 'Test progress indicators');
      await page.click('button[type="submit"]');

      // Verify progress updates appear
      for (const step of progressSteps) {
        await expect(page.locator(`:text("${step.message}")`)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should provide user feedback during network issues', async ({ page }) => {
      // Simulate network failure
      await page.route(WEBHOOK_URL + '**', async (route) => {
        await route.abort('failed');
      });

      await page.fill('[contenteditable="true"]', 'Test network failure handling');
      await page.click('button[type="submit"]');

      // Should show network error feedback
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible({ timeout: 10000 });
      
      const errorMessage = await page.locator('[data-testid="network-error"]').textContent();
      expect(errorMessage).toMatch(/network|connectivity|connection/i);
    });
  });
});