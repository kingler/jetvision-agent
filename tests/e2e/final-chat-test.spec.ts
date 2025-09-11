import { test, expect } from '@playwright/test';

test.describe('Final JetVision Chat Test', () => {
  const baseURL = 'http://localhost:3002';

  test('should close modal and send business intelligence prompt', async ({ page }) => {
    test.setTimeout(60000);
    
    console.log('Loading JetVision Agent...');
    await page.goto(baseURL);
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/final-initial.png', fullPage: true });
    
    // Handle the modal - try multiple approaches
    console.log('Attempting to close welcome modal...');
    
    // Method 1: Try to find and click close button
    const closeButton = page.locator('button').filter({ hasText: /×|✕|close/i }).first();
    if (await closeButton.isVisible()) {
      try {
        // Force click the close button even if outside viewport
        await closeButton.click({ force: true });
        console.log('Force clicked close button');
        await page.waitForTimeout(1000);
      } catch (e) {
        console.log('Close button click failed, trying alternative');
      }
    }
    
    // Method 2: Press Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    
    // Method 3: Click outside the modal content
    await page.mouse.click(100, 100);
    await page.waitForTimeout(1000);
    
    // Method 4: Look for "Get Started" or "Continue" type buttons
    const actionButtons = page.locator('button').filter({ hasText: /get started|continue|dismiss|ok/i });
    if (await actionButtons.count() > 0) {
      await actionButtons.first().click();
      console.log('Clicked action button to dismiss modal');
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ path: 'test-results/final-after-modal.png', fullPage: true });
    
    // Now try to start a new conversation
    console.log('Starting new conversation...');
    
    // Click the "New" button in the sidebar
    const newButton = page.locator('text=New').first();
    if (await newButton.isVisible()) {
      await newButton.click();
      await page.waitForTimeout(2000);
      console.log('Clicked New button');
    }
    
    await page.screenshot({ path: 'test-results/final-after-new.png', fullPage: true });
    
    // Look for chat input - try various selectors
    const inputSelectors = [
      'input[type="text"]',
      'textarea',
      'input[placeholder*="message"]',
      'input[placeholder*="type"]',
      'input[placeholder*="ask"]',
      'input[placeholder*="prompt"]',
      '[contenteditable="true"]',
      '[data-testid*="input"]',
      '[role="textbox"]'
    ];
    
    let chatInput = null;
    for (const selector of inputSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        chatInput = element;
        console.log(`Found chat input with selector: ${selector}`);
        break;
      }
    }
    
    if (chatInput) {
      console.log('Sending test message...');
      
      const testMessage = 'Find executive assistants in New York';
      await chatInput.fill(testMessage);
      console.log('Typed:', testMessage);
      
      await page.screenshot({ path: 'test-results/final-message-typed.png', fullPage: true });
      
      // Send the message - try Enter key first
      await chatInput.press('Enter');
      console.log('Pressed Enter to send message');
      
      // Wait for message to be sent and response to start
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: 'test-results/final-message-sent.png', fullPage: true });
      
      // Wait for response to appear
      console.log('Waiting for response...');
      await page.waitForTimeout(15000);
      
      await page.screenshot({ path: 'test-results/final-response.png', fullPage: true });
      
      // Check for Apollo.io response
      const pageContent = await page.locator('body').textContent();
      const hasApollo = pageContent?.includes('Apollo.io') || false;
      const hasExecutive = pageContent?.includes('executive') || false;
      const hasSarah = pageContent?.includes('Sarah Johnson') || false;
      
      console.log('Response analysis:');
      console.log('- Contains Apollo.io:', hasApollo);
      console.log('- Contains executive:', hasExecutive); 
      console.log('- Contains Sarah Johnson:', hasSarah);
      
      if (hasApollo && hasSarah) {
        console.log('🎉 SUCCESS: Apollo.io response with lead data detected!');
        
        // Take success screenshot
        await page.screenshot({ path: 'test-results/final-SUCCESS.png', fullPage: true });
        
        // Verify our original message is visible
        const messageVisible = await page.locator(`text=${testMessage}`).isVisible();
        console.log('Original message visible in chat:', messageVisible);
        
      } else {
        console.log('⚠️  Response received but may not contain expected Apollo.io data');
      }
      
    } else {
      console.log('❌ No chat input found - trying alternative interactions');
      
      // Try clicking on prompt cards instead
      const promptCards = page.locator('button, [role="button"]').filter({ 
        hasText: /executive|assistant|people|search/i 
      });
      
      const cardCount = await promptCards.count();
      console.log(`Found ${cardCount} prompt cards`);
      
      if (cardCount > 0) {
        await promptCards.first().click();
        console.log('Clicked prompt card');
        await page.waitForTimeout(10000);
        
        await page.screenshot({ path: 'test-results/final-prompt-card.png', fullPage: true });
      }
    }
    
    console.log('✅ Test completed - check screenshots for results');
  });
});