import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('JetVision Agent Chat Interface Tests', () => {
  let screenshotCounter = 1;
  
  const takeScreenshot = async (page, name) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${screenshotCounter.toString().padStart(2, '0')}-${name}-${timestamp}.png`;
    screenshotCounter++;
    
    await page.screenshot({
      path: join(__dirname, 'test-screenshots', filename),
      fullPage: true
    });
    
    console.log(`📸 Screenshot saved: ${filename}`);
    return filename;
  };

  test.beforeEach(async ({ page }) => {
    // Set up page with reasonable timeouts
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    
    console.log('🌐 Navigating to JetVision Agent...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await takeScreenshot(page, 'homepage-loaded');
  });

  test('Lead Generation - Find executive assistants in New York', async ({ page }) => {
    console.log('💼 Testing lead generation functionality...');
    
    try {
      // Click the "New" button to start a new chat
      console.log('🔄 Starting new chat...');
      const newButton = page.locator('button:has-text("New"), .new-chat-button, [data-testid="new-chat"]').first();
      
      if (await newButton.isVisible()) {
        await newButton.click();
        await takeScreenshot(page, 'new-chat-clicked');
      } else {
        console.log('ℹ️ New button not found, looking for existing chat input...');
      }
      
      // Wait a moment for any navigation or loading
      await page.waitForTimeout(2000);
      
      // Find chat input field with multiple selectors
      const inputSelectors = [
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Type"]', 
        'textarea[placeholder*="Enter"]',
        'input[placeholder*="message"]',
        'textarea',
        '.chat-input textarea',
        '[data-testid="message-input"]'
      ];
      
      let chatInput = null;
      for (const selector of inputSelectors) {
        chatInput = page.locator(selector).first();
        if (await chatInput.isVisible()) {
          console.log(`✅ Found chat input using selector: ${selector}`);
          break;
        }
      }
      
      expect(chatInput).toBeTruthy();
      await chatInput.scrollIntoViewIfNeeded();
      
      const leadPrompt = "Find me 3 executive assistants in New York";
      console.log(`📝 Typing prompt: "${leadPrompt}"`);
      
      await chatInput.fill(leadPrompt);
      await takeScreenshot(page, 'lead-prompt-entered');
      
      // Submit the prompt
      console.log('📤 Submitting prompt...');
      const submitSelectors = [
        'button[type="submit"]',
        'button[aria-label*="send"]',
        'button[data-testid*="send"]', 
        '.send-button',
        'button:has-text("Send")'
      ];
      
      let submitted = false;
      for (const selector of submitSelectors) {
        const submitButton = page.locator(selector).first();
        if (await submitButton.isVisible()) {
          console.log(`✅ Found and clicking submit button: ${selector}`);
          await submitButton.click();
          submitted = true;
          break;
        }
      }
      
      if (!submitted) {
        console.log('🔄 No submit button found, pressing Enter');
        await chatInput.press('Enter');
      }
      
      await takeScreenshot(page, 'lead-prompt-sent');
      
      console.log('⏳ Waiting for response...');
      
      // Wait for response with extended timeout
      const responseSelectors = [
        '.message:not(.user-message)',
        '[data-role="assistant"]',
        '.ai-response',
        '.bot-message', 
        '.assistant-message',
        '.response-container'
      ];
      
      let responseFound = false;
      let responseElement = null;
      
      // Wait up to 2 minutes for response
      for (let attempt = 0; attempt < 24; attempt++) {
        console.log(`🔍 Checking for response (attempt ${attempt + 1}/24)...`);
        
        for (const selector of responseSelectors) {
          responseElement = page.locator(selector).first();
          if (await responseElement.isVisible()) {
            console.log(`✅ Found response using selector: ${selector}`);
            responseFound = true;
            break;
          }
        }
        
        if (responseFound) break;
        
        await page.waitForTimeout(5000); // Wait 5 seconds between checks
        await takeScreenshot(page, `waiting-response-${attempt + 1}`);
      }
      
      expect(responseFound).toBeTruthy();
      await takeScreenshot(page, 'lead-response-received');
      
      // Analyze the response
      const responseText = await responseElement.textContent();
      console.log('📄 Response received (first 300 chars):', responseText?.substring(0, 300));
      
      // Test for quality indicators
      const hasProgressIndicators = responseText?.toLowerCase().includes('progress') || 
                                  responseText?.toLowerCase().includes('status') ||
                                  responseText?.toLowerCase().includes('deployed') ||
                                  responseText?.toLowerCase().includes('analyzing');
      
      const hasStructuredData = responseText?.toLowerCase().includes('contact') ||
                              responseText?.toLowerCase().includes('email') ||
                              responseText?.toLowerCase().includes('phone') ||
                              responseText?.toLowerCase().includes('company') ||
                              responseText?.toLowerCase().includes('assistant');
      
      const hasGenericResponse = responseText?.includes('Our system of agents have been deployed') ||
                               responseText?.includes('Empty response received');
      
      console.log('📊 Lead Generation Response Analysis:');
      console.log(`  - Has Progress Indicators: ${hasProgressIndicators ? '✅' : '❌'}`);
      console.log(`  - Has Structured Data: ${hasStructuredData ? '✅' : '❌'}`);
      console.log(`  - Avoids Generic Response: ${!hasGenericResponse ? '✅' : '❌'}`);
      
      // Quality assertions
      expect(responseText?.length).toBeGreaterThan(50); // Response should have substantial content
      expect(hasGenericResponse).toBeFalsy(); // Should not have generic responses
      
      if (hasProgressIndicators) {
        console.log('✅ PASS: Response includes progress indicators');
      }
      if (hasStructuredData) {
        console.log('✅ PASS: Response includes structured data');
      }
      
    } catch (error) {
      await takeScreenshot(page, 'lead-generation-error');
      console.error('❌ Lead generation test failed:', error);
      throw error;
    }
  });

  test('Fortune 500 Strategic Analysis', async ({ page }) => {
    console.log('🏢 Testing Fortune 500 strategic analysis...');
    
    try {
      // Start new chat if needed
      const newButton = page.locator('button:has-text("New")').first();
      if (await newButton.isVisible()) {
        await newButton.click();
        await page.waitForTimeout(2000);
      }
      
      // Find chat input
      const chatInput = page.locator('textarea, input[type="text"]').first();
      await chatInput.scrollIntoViewIfNeeded();
      
      const analysisPrompt = "As a JetVision enterprise account strategist, map the complete decision-making unit for private aviation at Fortune 500 companies";
      console.log(`📝 Typing Fortune 500 prompt...`);
      
      await chatInput.fill(analysisPrompt);
      await takeScreenshot(page, 'fortune500-prompt-entered');
      
      // Submit prompt
      const submitButton = page.locator('button[type="submit"], .send-button').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
      } else {
        await chatInput.press('Enter');
      }
      
      await takeScreenshot(page, 'fortune500-prompt-sent');
      
      console.log('⏳ Waiting for Fortune 500 analysis response...');
      
      // Wait for response
      let responseFound = false;
      let responseElement = null;
      
      for (let attempt = 0; attempt < 24; attempt++) {
        console.log(`🔍 Checking for Fortune 500 response (attempt ${attempt + 1}/24)...`);
        
        responseElement = page.locator('.message:not(.user-message), [data-role="assistant"]').last();
        if (await responseElement.isVisible()) {
          responseFound = true;
          break;
        }
        
        await page.waitForTimeout(5000);
        await takeScreenshot(page, `waiting-fortune500-${attempt + 1}`);
      }
      
      expect(responseFound).toBeTruthy();
      await takeScreenshot(page, 'fortune500-response-received');
      
      const responseText = await responseElement.textContent();
      console.log('📄 Fortune 500 Response (first 300 chars):', responseText?.substring(0, 300));
      
      // Analyze Fortune 500 response quality
      const hasComprehensiveAnalysis = responseText?.toLowerCase().includes('decision-making') ||
                                     responseText?.toLowerCase().includes('strategy') ||
                                     responseText?.toLowerCase().includes('executive') ||
                                     responseText?.toLowerCase().includes('fortune');
      
      const hasBusinessInsights = responseText?.toLowerCase().includes('c-suite') ||
                                responseText?.toLowerCase().includes('procurement') ||
                                responseText?.toLowerCase().includes('aviation') ||
                                responseText?.toLowerCase().includes('enterprise');
      
      const hasEmptyResponse = responseText?.includes('Empty response received') ||
                             responseText?.trim().length < 50;
      
      console.log('📊 Fortune 500 Analysis:');
      console.log(`  - Has Comprehensive Analysis: ${hasComprehensiveAnalysis ? '✅' : '❌'}`);
      console.log(`  - Has Business Insights: ${hasBusinessInsights ? '✅' : '❌'}`);
      console.log(`  - Avoids Empty Response: ${!hasEmptyResponse ? '✅' : '❌'}`);
      
      // Quality assertions
      expect(responseText?.length).toBeGreaterThan(100);
      expect(hasEmptyResponse).toBeFalsy();
      
      if (hasComprehensiveAnalysis) {
        console.log('✅ PASS: Response includes comprehensive analysis');
      }
      if (hasBusinessInsights) {
        console.log('✅ PASS: Response includes business insights');
      }
      
    } catch (error) {
      await takeScreenshot(page, 'fortune500-analysis-error');
      console.error('❌ Fortune 500 analysis test failed:', error);
      throw error;
    }
  });
});