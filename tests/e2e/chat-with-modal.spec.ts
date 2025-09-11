import { test, expect } from '@playwright/test';

test.describe('JetVision Chat with Modal Handling', () => {
  const baseURL = 'http://localhost:3002';

  test('should close welcome modal and test chat functionality', async ({ page }) => {
    test.setTimeout(90000); // 90 second timeout
    
    console.log('Navigating to JetVision Agent...');
    await page.goto(baseURL);
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take initial screenshot to see the modal
    await page.screenshot({ path: 'test-results/initial-with-modal.png', fullPage: true });
    
    // Look for and close the welcome modal
    console.log('Looking for welcome modal to close...');
    
    // Common modal close patterns
    const closeButtons = [
      page.locator('[data-testid="close-modal"]'),
      page.locator('button[aria-label="Close"]'),
      page.locator('button').filter({ hasText: /close|×|✕/i }),
      page.locator('[role="button"][aria-label*="close"]'),
      page.locator('.modal button').last(), // Often the last button in a modal
      page.locator('[data-dialog-close]'),
      page.getByRole('button', { name: /close|dismiss|continue|get started|ok/i })
    ];
    
    let modalClosed = false;
    
    for (const closeButton of closeButtons) {
      if (await closeButton.isVisible()) {
        console.log('Found close button, clicking...');
        await closeButton.click();
        await page.waitForTimeout(1000);
        modalClosed = true;
        break;
      }
    }
    
    // Try clicking outside the modal if no close button found
    if (!modalClosed) {
      console.log('No close button found, trying to click outside modal...');
      await page.mouse.click(50, 50); // Click top-left corner
      await page.waitForTimeout(1000);
    }
    
    // Try pressing Escape key
    if (!modalClosed) {
      console.log('Trying Escape key...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }
    
    // Take screenshot after attempting to close modal
    await page.screenshot({ path: 'test-results/after-modal-close.png', fullPage: true });
    
    // Now try to interact with the main interface
    console.log('Looking for chat interface after modal...');
    
    // Click "New" to start a new conversation
    const newButton = page.locator('text=New').first();
    if (await newButton.isVisible()) {
      console.log('Clicking "New" button...');
      await newButton.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-results/after-new-click.png', fullPage: true });
    }
    
    // Look for chat input
    const chatInput = page.locator('input[type="text"], textarea, input[placeholder*="message"], input[placeholder*="type"], input[placeholder*="ask"], input[placeholder*="prompt"]').first();
    
    if (await chatInput.isVisible()) {
      console.log('Found chat input, sending message...');
      
      const testMessage = 'Find executive assistants in New York for private aviation companies';
      await chatInput.fill(testMessage);
      console.log('Typed message:', testMessage);
      
      await page.screenshot({ path: 'test-results/message-typed.png', fullPage: true });
      
      // Send the message
      const sendButton = page.locator('button').filter({ hasText: /send|submit|→|▶/i }).first();
      
      if (await sendButton.isVisible()) {
        console.log('Clicking send button...');
        await sendButton.click();
      } else {
        console.log('Pressing Enter to send...');
        await chatInput.press('Enter');
      }
      
      // Wait for message to appear and response to start
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: 'test-results/message-sent.png', fullPage: true });
      
      // Wait for response - look for processing indicators
      console.log('Waiting for response...');
      
      // Look for status updates or response content
      await page.waitForFunction(() => {
        const statusElements = document.querySelectorAll('[data-status], .status, .processing');
        const responseElements = document.querySelectorAll('.message, .response, [data-message]');
        return statusElements.length > 0 || responseElements.length > 1;
      }, { timeout: 20000 }).catch(() => {
        console.log('No status indicators found, continuing...');
      });
      
      await page.waitForTimeout(10000); // Wait for response to complete
      
      await page.screenshot({ path: 'test-results/response-received.png', fullPage: true });
      
      // Check for our message in the interface
      const messageVisible = await page.locator(`text=${testMessage}`).isVisible();
      console.log('Test message visible in chat:', messageVisible);
      
      // Check for Apollo.io response content
      const apolloResponse = page.locator('text=*Apollo.io*');
      const apolloVisible = await apolloResponse.isVisible();
      console.log('Apollo.io response visible:', apolloVisible);
      
      if (apolloVisible) {
        console.log('SUCCESS: Apollo.io response detected!');
        
        // Check for specific lead data
        const leadNames = ['Sarah Johnson', 'Michael Chen', 'Emma Rodriguez'];
        for (const name of leadNames) {
          const nameVisible = await page.locator(`text=${name}`).isVisible();
          if (nameVisible) {
            console.log(`SUCCESS: Found lead data for "${name}"`);
          }
        }
        
        await page.screenshot({ path: 'test-results/success-with-leads.png', fullPage: true });
      } else {
        // Check for any response content
        const responseContent = await page.locator('body').textContent();
        console.log('Page content includes Apollo:', responseContent?.includes('Apollo'));
        console.log('Page content includes executive:', responseContent?.includes('executive'));
      }
      
    } else {
      console.log('No chat input found after modal close');
      
      // Try interacting with prompt cards
      const promptCards = page.locator('button, [role="button"]').filter({ 
        hasText: /executive|assistant|lead|search|people/i 
      });
      
      const cardCount = await promptCards.count();
      console.log(`Found ${cardCount} prompt cards`);
      
      if (cardCount > 0) {
        console.log('Clicking first relevant prompt card...');
        await promptCards.first().click();
        await page.waitForTimeout(10000);
        
        await page.screenshot({ path: 'test-results/prompt-card-response.png', fullPage: true });
      }
    }
    
    console.log('Test completed');
  });
});