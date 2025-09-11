import { chromium } from 'playwright';
import fs from 'fs';

async function testN8NUIFlow() {
  console.log('🚀 Starting N8N UI Flow Test...');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  let networkRequests = [];
  let n8nRequests = [];
  let responses = [];

  // Monitor network activity
  page.on('request', request => {
    const url = request.url();
    networkRequests.push({
      url,
      method: request.method(),
      postData: request.postData(),
      timestamp: Date.now()
    });
    
    // Track N8N webhook calls specifically
    if (url.includes('/api/n8n-webhook') || url.includes('n8n.vividwalls.blog')) {
      n8nRequests.push({
        url,
        method: request.method(),
        postData: request.postData(),
        timestamp: Date.now()
      });
      console.log(`🔗 N8N Request: ${request.method()} ${url}`);
    }
  });

  page.on('response', response => {
    const url = response.url();
    responses.push({
      url,
      status: response.status(),
      timestamp: Date.now()
    });
    
    if (url.includes('/api/n8n-webhook') || url.includes('n8n.vividwalls.blog')) {
      console.log(`📥 N8N Response: ${response.status()} ${url}`);
    }
  });

  try {
    // Navigate to the app
    console.log('🌐 Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-screenshots/01-initial-load.png',
      fullPage: true 
    });

    console.log('⏳ Waiting for app to load...');
    await page.waitForTimeout(3000);

    // Look for and dismiss welcome modals
    try {
      const welcomeModal = page.locator('.modal, [role="dialog"], [data-testid*="modal"]').first();
      if (await welcomeModal.isVisible({ timeout: 5000 })) {
        console.log('📝 Found welcome modal, attempting to dismiss...');
        await page.screenshot({ path: 'test-screenshots/02-welcome-modal.png', fullPage: true });
        
        // Try multiple dismiss strategies
        const dismissSelectors = [
          'button:has-text("Close")',
          'button:has-text("Dismiss")', 
          'button:has-text("Get Started")',
          'button:has-text("Continue")',
          '[aria-label="Close"]',
          'button[data-testid*="close"]'
        ];
        
        let dismissed = false;
        for (const selector of dismissSelectors) {
          try {
            const button = page.locator(selector).first();
            if (await button.isVisible({ timeout: 1000 })) {
              await button.click();
              dismissed = true;
              break;
            }
          } catch (e) {
            // Continue trying other selectors
          }
        }
        
        if (!dismissed) {
          await page.keyboard.press('Escape');
        }
        
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('ℹ️  No welcome modal found or already dismissed');
    }

    // Find chat interface
    console.log('🔍 Looking for chat interface...');
    const chatSelectors = [
      'input[placeholder*="message"]',
      'textarea[placeholder*="message"]', 
      'input[placeholder*="ask"]',
      'textarea[placeholder*="ask"]',
      '[data-testid="chat-input"]',
      '[contenteditable="true"]',
      'input[type="text"]',
      'textarea'
    ];

    let chatInput = null;
    for (const selector of chatSelectors) {
      try {
        chatInput = page.locator(selector).first();
        if (await chatInput.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found chat input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        chatInput = null;
      }
    }

    if (!chatInput) {
      console.log('❌ No chat input found, taking screenshot for debugging...');
      await page.screenshot({ path: 'test-screenshots/03-no-chat-input.png', fullPage: true });
      throw new Error('Could not find chat input element');
    }

    await page.screenshot({ 
      path: 'test-screenshots/03-chat-interface-ready.png',
      fullPage: true 
    });

    // Send test prompt
    const testPrompt = "Find executive assistants at NYC private equity firms";
    console.log(`💬 Sending test prompt: "${testPrompt}"`);
    
    await chatInput.clear();
    await chatInput.fill(testPrompt);
    await page.waitForTimeout(500);

    await page.screenshot({ 
      path: 'test-screenshots/04-prompt-entered.png',
      fullPage: true 
    });

    // Send the message
    const sendSelectors = [
      'button:has-text("Send")',
      '[data-testid="send-button"]',
      'button[type="submit"]',
      'button:near(input)',
      'button:near(textarea)'
    ];

    let sent = false;
    for (const selector of sendSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          sent = true;
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }

    if (!sent) {
      console.log('📤 No send button found, trying Enter key...');
      await chatInput.focus();
      await page.keyboard.press('Enter');
    }

    console.log('📤 Message sent, waiting for response...');
    await page.waitForTimeout(5000);

    await page.screenshot({ 
      path: 'test-screenshots/05-message-sent.png',
      fullPage: true 
    });

    // Wait for AI response
    console.log('⏳ Waiting for AI response to complete...');
    await page.waitForTimeout(15000);

    // Capture final state
    await page.screenshot({ 
      path: 'test-screenshots/06-final-response.png',
      fullPage: true 
    });

    // Analyze page content
    const bodyText = await page.locator('body').textContent();
    
    // Look for response indicators
    const messageElements = await page.locator('.message, .response, [data-testid*="message"], div:has-text("executive"), div:has-text("private equity"), div:has-text("Apollo")').all();
    
    let responseTexts = [];
    for (const element of messageElements) {
      const text = await element.textContent();
      if (text && text.trim() && text.length > 10) {
        responseTexts.push(text.trim());
      }
    }

    // Analysis
    const hasN8NIndicators = bodyText.includes('Apollo') || 
                            bodyText.includes('leads found') ||
                            bodyText.includes('executive assistant') ||
                            bodyText.includes('private equity') ||
                            responseTexts.some(text => text.includes('Apollo') || text.includes('executive'));

    const hasFallbackIndicators = bodyText.includes('fallback') ||
                                bodyText.includes('enhanced response') ||
                                bodyText.includes('generated response');

    // Create test report
    const testReport = {
      timestamp: new Date().toISOString(),
      testPrompt,
      networkRequests: {
        total: networkRequests.length,
        n8nRelated: n8nRequests.length,
        requests: n8nRequests
      },
      uiAnalysis: {
        responseTexts,
        hasN8NIndicators,
        hasFallbackIndicators,
        totalResponseElements: messageElements.length,
        bodyTextSample: bodyText.substring(0, 1000)
      },
      conclusion: hasN8NIndicators && !hasFallbackIndicators ? 'N8N_WORKING' :
                 hasFallbackIndicators ? 'FALLBACK_ACTIVE' : 'UNCLEAR_STATUS'
    };

    // Create results directory if it doesn't exist
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results', { recursive: true });
    }

    // Write report
    fs.writeFileSync(
      'test-results/n8n-ui-verification-report.json',
      JSON.stringify(testReport, null, 2)
    );

    console.log('\n📊 TEST RESULTS:');
    console.log('='.repeat(50));
    console.log(`Total network requests: ${networkRequests.length}`);
    console.log(`N8N-related requests: ${n8nRequests.length}`);
    console.log(`Response elements found: ${messageElements.length}`);
    console.log(`Has N8N indicators: ${hasN8NIndicators}`);
    console.log(`Has fallback indicators: ${hasFallbackIndicators}`);
    console.log(`Conclusion: ${testReport.conclusion}`);
    console.log('='.repeat(50));

    if (n8nRequests.length > 0) {
      console.log('\n🔗 N8N Network Activity:');
      n8nRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req.method} ${req.url}`);
      });
    }

    if (responseTexts.length > 0) {
      console.log('\n📝 Response Texts Found:');
      responseTexts.slice(0, 3).forEach((text, index) => {
        console.log(`${index + 1}. ${text.substring(0, 200)}...`);
      });
    }

    console.log('\n✅ Test completed successfully!');
    console.log('📊 Report saved to: test-results/n8n-ui-verification-report.json');
    console.log('🖼️  Screenshots saved to: test-screenshots/');

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will remain open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-screenshots/error.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testN8NUIFlow().catch(console.error);