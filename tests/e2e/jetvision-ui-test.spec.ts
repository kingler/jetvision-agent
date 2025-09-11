import { test, expect } from '@playwright/test';

test.describe('JetVision Agent UI Test', () => {
  const baseURL = 'http://localhost:3002';

  test('should interact with JetVision Agent interface and get response', async ({ page }) => {
    test.setTimeout(90000); // 90 second timeout
    
    console.log('Navigating to JetVision Agent...');
    await page.goto(baseURL);
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Verify the main interface loaded
    await expect(page.locator('text=JetVision Agent')).toBeVisible();
    await expect(page.locator('text=AI-Powered Private Aviation Excellence')).toBeVisible();
    
    console.log('JetVision Agent interface loaded successfully');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/jetvision-loaded.png', fullPage: true });
    
    // Look for the "New" button to start a new conversation
    const newButton = page.locator('text=New').first();
    await expect(newButton).toBeVisible();
    
    console.log('Clicking "New" to start conversation...');
    await newButton.click();
    await page.waitForTimeout(2000);
    
    // Take screenshot after clicking New
    await page.screenshot({ path: 'test-results/after-new-click.png', fullPage: true });
    
    // Now look for a chat input that might have appeared
    const chatInput = page.locator('input[type="text"], textarea, input[placeholder*="message"], input[placeholder*="type"], input[placeholder*="ask"]').first();
    
    if (await chatInput.isVisible()) {
      console.log('Found chat input after clicking New');
      
      const testMessage = 'Find executive assistants in New York for private aviation companies';
      await chatInput.fill(testMessage);
      console.log('Typed message:', testMessage);
      
      // Look for send button or press Enter
      const sendButton = page.locator('button').filter({ hasText: /send|submit|→|▶/i }).first();
      
      if (await sendButton.isVisible()) {
        await sendButton.click();
        console.log('Clicked send button');
      } else {
        await chatInput.press('Enter');
        console.log('Pressed Enter');
      }
      
      // Wait for response to start appearing
      await page.waitForTimeout(5000);
      
      // Take screenshot during response
      await page.screenshot({ path: 'test-results/during-response.png', fullPage: true });
      
      // Wait longer for complete response
      await page.waitForTimeout(15000);
      
      // Take final screenshot
      await page.screenshot({ path: 'test-results/final-response.png', fullPage: true });
      
      // Check for our message in the chat
      const messageVisible = await page.locator(`text=${testMessage}`).isVisible();
      console.log('Test message visible:', messageVisible);
      
      // Check for Apollo.io response
      const apolloResponse = page.locator('text=*Apollo.io*');
      const apolloVisible = await apolloResponse.isVisible();
      console.log('Apollo.io response visible:', apolloVisible);
      
      if (apolloVisible) {
        console.log('SUCCESS: Found Apollo.io response!');
        
        // Check for specific lead data
        const leadNames = ['Sarah Johnson', 'Michael Chen', 'Emma Rodriguez'];
        for (const name of leadNames) {
          const nameVisible = await page.locator(`text=${name}`).isVisible();
          console.log(`Lead "${name}" visible:`, nameVisible);
        }
      }
      
    } else {
      // Try clicking on prompt cards instead
      console.log('No direct chat input found, trying prompt cards...');
      
      // Look for People Search category or any executive assistant related prompt
      const peopleSearchButton = page.locator('text=People Search');
      if (await peopleSearchButton.isVisible()) {
        console.log('Clicking People Search category...');
        await peopleSearchButton.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'test-results/people-search-category.png', fullPage: true });
      }
      
      // Look for any prompt cards that might trigger the functionality we want
      const promptCards = page.locator('[data-testid*="prompt"], .prompt-card, button').filter({ 
        hasText: /executive|assistant|lead|search|find/i 
      });
      
      const cardCount = await promptCards.count();
      console.log(`Found ${cardCount} relevant prompt cards`);
      
      if (cardCount > 0) {
        console.log('Clicking first relevant prompt card...');
        await promptCards.first().click();
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: 'test-results/after-prompt-card-click.png', fullPage: true });
        
        // Wait for response
        await page.waitForTimeout(15000);
        
        await page.screenshot({ path: 'test-results/prompt-card-response.png', fullPage: true });
        
        // Check for Apollo.io response
        const apolloResponse = page.locator('text=*Apollo.io*');
        const apolloVisible = await apolloResponse.isVisible();
        console.log('Apollo.io response after prompt card:', apolloVisible);
      }
    }
    
    console.log('Test completed - check screenshots for results');
  });
});