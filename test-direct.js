import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import { join } from 'path';

async function testJetVisionChat() {
  console.log('🚀 Starting JetVision Agent Chat Interface Test');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  try {
    // Navigate with a more lenient wait condition
    console.log('🌐 Navigating to JetVision Agent...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait a moment for any dynamic content
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-screenshots/direct-01-initial-load.png',
      fullPage: true 
    });
    
    // Check for and close any modal that might be blocking interaction
    console.log('🔍 Checking for modal popups...');
    const modalCloseButton = page.locator('button:has-text("×"), [aria-label="close"], .modal button');
    if (await modalCloseButton.first().isVisible({ timeout: 5000 })) {
      console.log('✅ Found modal, closing it...');
      await modalCloseButton.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: 'test-screenshots/direct-02-modal-closed.png',
        fullPage: true 
      });
    }
    
    // Try to find and click "New" button to start a chat
    console.log('🔄 Looking for New chat button...');
    const newButton = page.locator('button:has-text("New"), .new-chat, [data-testid="new-chat"]');
    if (await newButton.first().isVisible({ timeout: 5000 })) {
      console.log('✅ Clicking New button...');
      await newButton.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: 'test-screenshots/direct-03-new-chat-clicked.png',
        fullPage: true 
      });
    }
    
    // Look for chat input with a broad search
    console.log('📝 Looking for chat input field...');
    await page.waitForTimeout(2000);
    
    const inputSelectors = [
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]',
      '.chat-input',
      '[placeholder*="message"]',
      '[placeholder*="type"]'
    ];
    
    let chatInput = null;
    for (const selector of inputSelectors) {
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        if (await element.isVisible() && await element.isEnabled()) {
          chatInput = element;
          console.log(`✅ Found chat input using selector: ${selector}`);
          break;
        }
      }
      if (chatInput) break;
    }
    
    if (!chatInput) {
      console.log('❌ No chat input found. Taking screenshot for debugging...');
      await page.screenshot({ 
        path: 'test-screenshots/direct-04-no-input-found.png',
        fullPage: true 
      });
      
      // Let's try to find any interactive elements on the page
      const allInputs = await page.locator('textarea, input, [contenteditable]').all();
      console.log(`🔍 Found ${allInputs.length} total input elements on page`);
      
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const isVisible = await input.isVisible();
        const isEnabled = await input.isEnabled();
        console.log(`  Input ${i + 1}: visible=${isVisible}, enabled=${isEnabled}`);
        
        if (isVisible && isEnabled) {
          chatInput = input;
          console.log(`✅ Using input element ${i + 1} as chat input`);
          break;
        }
      }
    }
    
    if (!chatInput) {
      throw new Error('Could not find any usable chat input field');
    }
    
    // Test lead generation prompt
    console.log('💼 Testing lead generation prompt...');
    const leadPrompt = "Find me 3 executive assistants in New York";
    
    await chatInput.scrollIntoViewIfNeeded();
    await chatInput.click();
    await chatInput.fill(leadPrompt);
    
    await page.screenshot({ 
      path: 'test-screenshots/direct-05-lead-prompt-entered.png',
      fullPage: true 
    });
    
    // Try to submit the prompt
    console.log('📤 Submitting prompt...');
    
    // Look for submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Send")',
      'button:has-text("Submit")',
      '[aria-label*="send"]',
      '.send-button'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      const submitButton = page.locator(selector).first();
      if (await submitButton.isVisible({ timeout: 1000 })) {
        console.log(`✅ Found submit button: ${selector}`);
        await submitButton.click();
        submitted = true;
        break;
      }
    }
    
    if (!submitted) {
      console.log('🔄 No submit button found, trying Enter key...');
      await chatInput.press('Enter');
    }
    
    await page.screenshot({ 
      path: 'test-screenshots/direct-06-prompt-submitted.png',
      fullPage: true 
    });
    
    // Wait for and analyze response
    console.log('⏳ Waiting for response (up to 2 minutes)...');
    
    let responseFound = false;
    let responseText = '';
    
    for (let attempt = 0; attempt < 24; attempt++) {
      console.log(`🔍 Checking for response (attempt ${attempt + 1}/24)...`);
      
      // Look for any new content that might be a response
      const responseSelectors = [
        '.message:not(.user-message)',
        '.ai-message',
        '.assistant-message',
        '.bot-response',
        '[data-role="assistant"]'
      ];
      
      for (const selector of responseSelectors) {
        const responses = await page.locator(selector).all();
        if (responses.length > 0) {
          const lastResponse = responses[responses.length - 1];
          if (await lastResponse.isVisible()) {
            responseText = await lastResponse.textContent();
            if (responseText && responseText.trim().length > 10) {
              responseFound = true;
              console.log('✅ Found response!');
              break;
            }
          }
        }
      }
      
      if (responseFound) break;
      
      await page.waitForTimeout(5000);
      await page.screenshot({ 
        path: `test-screenshots/direct-07-waiting-${attempt + 1}.png`,
        fullPage: true 
      });
    }
    
    await page.screenshot({ 
      path: 'test-screenshots/direct-08-final-result.png',
      fullPage: true 
    });
    
    // Analyze the results
    console.log('\n🎯 === TEST RESULTS ===');
    
    if (responseFound) {
      console.log('✅ Response received!');
      console.log('📄 Response content (first 500 chars):');
      console.log(responseText.substring(0, 500));
      
      // Analyze response quality
      const hasProgressIndicators = responseText.toLowerCase().includes('progress') || 
                                  responseText.toLowerCase().includes('status') ||
                                  responseText.toLowerCase().includes('analyzing') ||
                                  responseText.toLowerCase().includes('deployed');
      
      const hasStructuredData = responseText.toLowerCase().includes('contact') ||
                              responseText.toLowerCase().includes('email') ||
                              responseText.toLowerCase().includes('phone') ||
                              responseText.toLowerCase().includes('company') ||
                              responseText.toLowerCase().includes('assistant');
      
      const hasGenericResponse = responseText.includes('Our system of agents have been deployed') ||
                               responseText.includes('Empty response received');
      
      const isEmpty = responseText.trim().length < 50;
      
      console.log('\n📊 Quality Analysis:');
      console.log(`  - Response Length: ${responseText.length} characters`);
      console.log(`  - Has Progress Indicators: ${hasProgressIndicators ? '✅' : '❌'}`);
      console.log(`  - Has Structured Data: ${hasStructuredData ? '✅' : '❌'}`);
      console.log(`  - Avoids Generic Response: ${!hasGenericResponse ? '✅' : '❌'}`);
      console.log(`  - Non-Empty Response: ${!isEmpty ? '✅' : '❌'}`);
      
      if (hasGenericResponse) {
        console.log('⚠️  WARNING: Response contains generic "system deployed" message');
      }
      
      if (isEmpty) {
        console.log('❌ ISSUE: Response is too short or empty');
      }
      
      // Overall assessment
      const qualityScore = [hasProgressIndicators, hasStructuredData, !hasGenericResponse, !isEmpty]
                          .filter(Boolean).length;
      
      console.log(`\n🎯 Quality Score: ${qualityScore}/4`);
      
      if (qualityScore >= 3) {
        console.log('✅ SUCCESS: JetVision Agent is providing quality responses!');
      } else if (qualityScore >= 2) {
        console.log('⚠️  PARTIAL: Response quality needs improvement');
      } else {
        console.log('❌ FAILED: Significant response quality issues detected');
      }
      
    } else {
      console.log('❌ No response received within timeout period');
      console.log('🚨 CRITICAL: JetVision Agent is not responding to user inputs');
    }
    
    // Check the server logs for N8N webhook issues
    console.log('\n📋 Key Findings from Server Logs:');
    console.log('  - N8N Webhook: Consistently returning "Empty JSON response"');
    console.log('  - Clerk Auth: Experiencing infinite redirect loops');
    console.log('  - Apollo MCP: Running in mock mode (no API key)');
    
    console.log('\n🔧 Recommendations:');
    console.log('  1. Fix N8N webhook configuration to return structured responses');
    console.log('  2. Resolve Clerk authentication configuration');
    console.log('  3. Verify N8N workflow is processing requests correctly');
    console.log('  4. Test with proper Apollo.io API credentials');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ 
      path: 'test-screenshots/direct-09-error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
    console.log('🧹 Browser closed');
  }
}

// Run the test
testJetVisionChat().catch(console.error);