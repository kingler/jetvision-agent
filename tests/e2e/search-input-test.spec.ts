import { test, expect } from '@playwright/test';

test.describe('JetVision Search Input Test', () => {
  const baseURL = 'http://localhost:3002';

  test('should find and use the search input for chat', async ({ page }) => {
    test.setTimeout(45000);
    
    console.log('Loading JetVision Agent...');
    await page.goto(baseURL);
    await page.waitForTimeout(5000); // Wait longer for initial load
    
    await page.screenshot({ path: 'test-results/search-initial.png', fullPage: true });
    
    // Look specifically for the search input that was mentioned in error logs
    const searchInput = page.locator('input[placeholder="Search..."]');
    
    console.log('Looking for search input...');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    
    console.log('Found search input, typing message...');
    
    const testMessage = 'Find executive assistants in New York';
    await searchInput.fill(testMessage);
    
    await page.screenshot({ path: 'test-results/search-typed.png', fullPage: true });
    
    // Press Enter to submit
    console.log('Pressing Enter to send...');
    await searchInput.press('Enter');
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/search-sent.png', fullPage: true });
    
    console.log('Waiting for response...');
    await page.waitForTimeout(15000); // Wait for N8N response
    
    await page.screenshot({ path: 'test-results/search-response.png', fullPage: true });
    
    // Check page content for Apollo.io response
    const content = await page.locator('body').textContent();
    const hasApollo = content?.includes('Apollo.io') || false;
    const hasSarah = content?.includes('Sarah Johnson') || false;
    const hasEmail = content?.includes('@') || false; // Look for email addresses
    
    console.log('=== RESPONSE ANALYSIS ===');
    console.log('Has Apollo.io:', hasApollo);
    console.log('Has Sarah Johnson:', hasSarah); 
    console.log('Has email addresses:', hasEmail);
    console.log('Content length:', content?.length || 0);
    
    if (hasApollo && hasSarah) {
      console.log('🎉 SUCCESS: Full Apollo.io response detected!');
      await page.screenshot({ path: 'test-results/search-SUCCESS.png', fullPage: true });
    } else if (hasApollo) {
      console.log('✅ PARTIAL SUCCESS: Apollo.io mentioned in response');
    } else {
      console.log('ℹ️  Response received, checking for any business data...');
      
      // Look for any structured business data
      const hasExecutive = content?.includes('executive') || false;
      const hasAssistant = content?.includes('assistant') || false;
      const hasContact = content?.includes('contact') || content?.includes('phone') || false;
      
      console.log('Has executive:', hasExecutive);
      console.log('Has assistant:', hasAssistant);
      console.log('Has contact info:', hasContact);
    }
    
    console.log('✅ Test completed successfully');
  });
});