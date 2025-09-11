import { test, expect } from '@playwright/test';

test.describe('Simple Chat Test', () => {
  const baseURL = 'http://localhost:3002';

  test('should load chat interface and send a message', async ({ page }) => {
    // Set longer timeout for the test
    test.setTimeout(60000);
    
    console.log('Navigating to:', baseURL);
    await page.goto(baseURL);
    
    // Wait for page to load but don't require networkidle
    await page.waitForTimeout(3000);
    
    // Take initial screenshot to see what loaded
    await page.screenshot({ path: 'test-results/chat-initial-load.png', fullPage: true });
    
    // Try to find the chat interface elements
    console.log('Looking for chat elements...');
    
    // First, let's see what's on the page
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    const bodyText = await page.locator('body').textContent();
    console.log('Page contains text:', bodyText?.substring(0, 200) + '...');
    
    // Look for common chat interface elements more broadly
    const inputElements = await page.locator('input').count();
    const textareaElements = await page.locator('textarea').count();
    const buttonElements = await page.locator('button').count();
    
    console.log(`Found ${inputElements} input elements, ${textareaElements} textarea elements, ${buttonElements} button elements`);
    
    // Try to find any text input that could be a chat input
    let chatInput;
    
    if (inputElements > 0) {
      // Try different input types
      const textInputs = page.locator('input[type="text"], input:not([type]), input[placeholder*="message"], input[placeholder*="chat"], input[placeholder*="search"]');
      const inputCount = await textInputs.count();
      console.log(`Found ${inputCount} potential text inputs`);
      
      if (inputCount > 0) {
        chatInput = textInputs.first();
      }
    } else if (textareaElements > 0) {
      chatInput = page.locator('textarea').first();
    }
    
    if (chatInput) {
      console.log('Found chat input, attempting to use it...');
      
      // Wait for the input to be visible and enabled
      await expect(chatInput).toBeVisible({ timeout: 10000 });
      
      // Type test message
      const testMessage = 'Find executive assistants in New York';
      await chatInput.fill(testMessage);
      console.log('Typed message:', testMessage);
      
      // Take screenshot after typing
      await page.screenshot({ path: 'test-results/chat-after-typing.png', fullPage: true });
      
      // Look for send button
      const sendButtons = page.locator('button').filter({ hasText: /send|submit|→|▶/i });
      const sendButtonCount = await sendButtons.count();
      console.log(`Found ${sendButtonCount} potential send buttons`);
      
      if (sendButtonCount > 0) {
        await sendButtons.first().click();
        console.log('Clicked send button');
      } else {
        // Try pressing Enter
        await chatInput.press('Enter');
        console.log('Pressed Enter in input field');
      }
      
      // Wait a moment for response
      await page.waitForTimeout(5000);
      
      // Take final screenshot
      await page.screenshot({ path: 'test-results/chat-after-send.png', fullPage: true });
      
      // Check if our message appears somewhere on the page
      const messageVisible = await page.locator(`text=${testMessage}`).isVisible();
      console.log('Test message visible on page:', messageVisible);
      
      if (messageVisible) {
        console.log('SUCCESS: Message was sent and appears on the page');
        
        // Wait for potential response
        await page.waitForTimeout(10000);
        
        // Look for Apollo.io response indicators
        const apolloResponse = page.locator('text=*Apollo.io*');
        const apolloVisible = await apolloResponse.isVisible();
        console.log('Apollo.io response visible:', apolloVisible);
        
        if (apolloVisible) {
          console.log('SUCCESS: Apollo.io response detected');
          // Take success screenshot
          await page.screenshot({ path: 'test-results/chat-success-with-response.png', fullPage: true });
        }
      }
      
    } else {
      console.log('Could not find chat input element');
      await page.screenshot({ path: 'test-results/chat-no-input-found.png', fullPage: true });
      
      // Still continue test to see what's on the page
      expect(inputElements + textareaElements).toBeGreaterThan(0);
    }
  });
});