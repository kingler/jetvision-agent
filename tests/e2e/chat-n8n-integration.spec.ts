import { test, expect } from '@playwright/test';

test.describe('Chat N8N Integration', () => {
  // Use the correct port where dev server is running
  const baseURL = 'http://localhost:3002';

  test('should send a business intelligence prompt and receive structured response', async ({ page }) => {
    // Navigate to the chat interface
    await page.goto(baseURL);
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Look for chat input elements - checking multiple possible selectors
    const chatInput = page.locator('input[type="text"]').first() ||
                     page.locator('textarea').first() ||
                     page.locator('[placeholder*="message"]').first() ||
                     page.locator('[placeholder*="chat"]').first() ||
                     page.locator('[data-testid="chat-input"]').first();
    
    // Wait for chat input to be visible
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    // Type a business intelligence query that should trigger Apollo.io fallback
    const testPrompt = 'Find executive assistants in New York for private aviation companies';
    await chatInput.fill(testPrompt);
    
    // Look for send button - checking multiple possible selectors
    const sendButton = page.locator('button[type="submit"]').first() ||
                      page.locator('button').filter({ hasText: 'Send' }).first() ||
                      page.locator('[data-testid="send-button"]').first() ||
                      page.locator('button').last(); // Often the send button is the last button
    
    // Click send button
    await sendButton.click();
    
    // Wait for the user message to appear in the chat
    await expect(page.locator('text=' + testPrompt)).toBeVisible({ timeout: 5000 });
    
    // Wait for the response to start appearing - look for status updates or response content
    await page.waitForFunction(() => {
      // Look for any signs of response processing
      const statusElements = document.querySelectorAll('[data-status], .status, .processing');
      const responseElements = document.querySelectorAll('.message, .chat-message, [data-message]');
      return statusElements.length > 0 || responseElements.length > 1; // More than just user message
    }, { timeout: 15000 });
    
    // Look for Apollo.io specific content that should appear in the fallback response
    const apollioResponse = page.locator('text=*Apollo.io*').first();
    await expect(apollioResponse).toBeVisible({ timeout: 20000 });
    
    // Check for structured lead data in the response
    const leadNames = ['Sarah Johnson', 'Michael Chen', 'Emma Rodriguez'];
    
    for (const leadName of leadNames) {
      await expect(page.locator(`text=${leadName}`)).toBeVisible({ timeout: 5000 });
    }
    
    // Verify contact information is present
    await expect(page.locator('text=*@techventure.com*')).toBeVisible();
    await expect(page.locator('text=*linkedin.com/in/*')).toBeVisible();
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/chat-apollo-response.png', fullPage: true });
  });

  test('should handle non-business intelligence queries with appropriate fallback', async ({ page }) => {
    // Navigate to the chat interface
    await page.goto(baseURL);
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Look for chat input
    const chatInput = page.locator('input[type="text"]').first() ||
                     page.locator('textarea').first() ||
                     page.locator('[placeholder*="message"]').first();
    
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    // Type a general query that should trigger the generic error message
    const testPrompt = 'What is the weather like today?';
    await chatInput.fill(testPrompt);
    
    // Find and click send button
    const sendButton = page.locator('button[type="submit"]').first() ||
                      page.locator('button').filter({ hasText: 'Send' }).first() ||
                      page.locator('button').last();
    
    await sendButton.click();
    
    // Wait for the user message to appear
    await expect(page.locator('text=' + testPrompt)).toBeVisible({ timeout: 5000 });
    
    // Wait for the generic error response
    const errorMessage = 'I received your request and our system is processing it. However, I encountered an issue with the workflow execution.';
    await expect(page.locator(`text=*${errorMessage}*`)).toBeVisible({ timeout: 15000 });
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/chat-generic-response.png', fullPage: true });
  });

  test('should display chat messages in correct thread order', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Send multiple messages to test thread continuity
    const messages = [
      'Hello, this is my first message',
      'Find executive assistants in Boston',
      'What about travel managers?'
    ];
    
    for (const message of messages) {
      const chatInput = page.locator('input[type="text"]').first() ||
                       page.locator('textarea').first();
      
      await chatInput.fill(message);
      
      const sendButton = page.locator('button[type="submit"]').first() ||
                        page.locator('button').filter({ hasText: 'Send' }).first();
      
      await sendButton.click();
      
      // Wait for this message to appear before sending the next one
      await expect(page.locator(`text=${message}`)).toBeVisible({ timeout: 5000 });
      
      // Small delay between messages
      await page.waitForTimeout(1000);
    }
    
    // Verify all user messages are present in the chat thread
    for (const message of messages) {
      await expect(page.locator(`text=${message}`)).toBeVisible();
    }
    
    // Take final screenshot of the complete chat thread
    await page.screenshot({ path: 'test-results/chat-thread-complete.png', fullPage: true });
  });
});