import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('N8N Integration UI Verification', () => {
  test('Verify N8N workflow response vs fallback in UI', async ({ page }) => {
    let networkRequests = [];
    let n8nRequests = [];
    let responses = [];

    // Monitor all network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData(),
        timestamp: Date.now()
      });
      
      // Track N8N webhook calls specifically
      if (request.url().includes('/api/n8n-webhook') || request.url().includes('n8n.vividwalls.blog')) {
        n8nRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
          timestamp: Date.now()
        });
      }
    });

    // Monitor all network responses
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: Date.now()
      });
    });

    // Navigate to the app (now running on port 3002)
    console.log('🚀 Navigating to JetVision Agent at http://localhost:3002...');
    await page.goto('http://localhost:3002', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-screenshots/01-initial-load.png',
      fullPage: true 
    });

    // Wait for the app to load and look for welcome modals or chat interface
    console.log('⏳ Waiting for app to load...');
    await page.waitForTimeout(3000);

    // Look for and dismiss any welcome modals
    const welcomeModal = page.locator('[data-testid="welcome-modal"], .modal, [role="dialog"]').first();
    if (await welcomeModal.isVisible({ timeout: 5000 })) {
      console.log('📝 Found welcome modal, attempting to dismiss...');
      await page.screenshot({ path: 'test-screenshots/02-welcome-modal.png', fullPage: true });
      
      // Try different ways to dismiss the modal
      const dismissButton = page.locator('button:has-text("Close"), button:has-text("Dismiss"), button:has-text("Get Started"), button:has-text("Continue"), [aria-label="Close"]').first();
      if (await dismissButton.isVisible({ timeout: 2000 })) {
        await dismissButton.click();
        await page.waitForTimeout(1000);
      } else {
        // Try clicking outside the modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }

    // Look for the chat interface
    console.log('🔍 Looking for chat interface...');
    const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[placeholder*="ask"], textarea[placeholder*="ask"], [data-testid="chat-input"], [contenteditable="true"]').first();
    const sendButton = page.locator('button:has-text("Send"), [data-testid="send-button"], button[type="submit"]').first();

    // Wait for chat interface to be available
    await chatInput.waitFor({ state: 'visible', timeout: 30000 });
    
    await page.screenshot({ 
      path: 'test-screenshots/03-chat-interface-ready.png',
      fullPage: true 
    });

    // Clear any existing content and send Apollo lead generation prompt
    const testPrompt = "Find executive assistants at NYC private equity firms";
    console.log(`💬 Sending test prompt: "${testPrompt}"`);
    
    await chatInput.clear();
    await chatInput.fill(testPrompt);
    await page.waitForTimeout(500);

    // Take screenshot before sending
    await page.screenshot({ 
      path: 'test-screenshots/04-prompt-entered.png',
      fullPage: true 
    });

    // Send the message
    if (await sendButton.isVisible({ timeout: 2000 })) {
      await sendButton.click();
    } else {
      await page.keyboard.press('Enter');
    }

    console.log('📤 Message sent, waiting for response...');
    
    // Wait for response to appear
    await page.waitForTimeout(5000);

    // Take screenshot after sending
    await page.screenshot({ 
      path: 'test-screenshots/05-message-sent.png',
      fullPage: true 
    });

    // Wait longer for the AI response to complete
    console.log('⏳ Waiting for AI response to complete...');
    await page.waitForTimeout(15000);

    // Look for response indicators
    const responseElements = await page.locator('.message, .response, [data-testid*="message"], [data-testid*="response"]').all();
    console.log(`📨 Found ${responseElements.length} message elements`);

    // Take final screenshot of the response
    await page.screenshot({ 
      path: 'test-screenshots/06-final-response.png',
      fullPage: true 
    });

    // Extract response text content
    let responseTexts = [];
    for (const element of responseElements) {
      const text = await element.textContent();
      if (text && text.trim()) {
        responseTexts.push(text.trim());
      }
    }

    // Look for specific indicators of N8N vs fallback
    const pageContent = await page.content();
    const bodyText = await page.locator('body').textContent();
    
    // Check for N8N success indicators
    const hasN8NIndicators = bodyText.includes('Apollo') || 
                            bodyText.includes('leads found') ||
                            bodyText.includes('executive assistant') ||
                            bodyText.includes('private equity');

    // Check for fallback indicators
    const hasFallbackIndicators = bodyText.includes('fallback') ||
                                bodyText.includes('enhanced response') ||
                                bodyText.includes('generated response');

    // Log network analysis
    console.log('\n📊 NETWORK ANALYSIS:');
    console.log(`Total network requests: ${networkRequests.length}`);
    console.log(`N8N-related requests: ${n8nRequests.length}`);

    if (n8nRequests.length > 0) {
      console.log('\n🔗 N8N Requests:');
      n8nRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req.method} ${req.url}`);
        if (req.postData) {
          console.log(`   Data: ${req.postData.substring(0, 200)}...`);
        }
      });
    }

    // Log response analysis
    console.log('\n📝 RESPONSE ANALYSIS:');
    console.log(`Response texts found: ${responseTexts.length}`);
    responseTexts.forEach((text, index) => {
      console.log(`${index + 1}. ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
    });

    console.log('\n🎯 INTEGRATION STATUS:');
    console.log(`Has N8N indicators: ${hasN8NIndicators}`);
    console.log(`Has fallback indicators: ${hasFallbackIndicators}`);

    // Create detailed test report
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
        totalResponseElements: responseElements.length
      },
      conclusion: hasN8NIndicators && !hasFallbackIndicators ? 'N8N_WORKING' :
                 hasFallbackIndicators ? 'FALLBACK_ACTIVE' : 'UNCLEAR_STATUS'
    };

    // Write report to file
    fs.writeFileSync(
      'test-results/n8n-ui-verification-report.json',
      JSON.stringify(testReport, null, 2)
    );

    console.log('\n📄 Test report written to: test-results/n8n-ui-verification-report.json');

    // Assertions for test validation
    expect(responseTexts.length).toBeGreaterThan(0);
    
    // Take one final screenshot with browser console open
    await page.keyboard.press('F12'); // Open dev tools
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'test-screenshots/07-with-devtools.png',
      fullPage: true 
    });

    console.log('\n✅ N8N UI verification test completed successfully!');
    console.log('🖼️  Screenshots saved to test-screenshots/');
    console.log('📊 Network analysis and response details captured');
  });

  test('Direct N8N webhook test', async ({ page }) => {
    // Test the webhook endpoint directly
    console.log('🔗 Testing N8N webhook endpoint directly...');
    
    const testPayload = {
      prompt: "Find executive assistants at NYC private equity firms",
      context: "Lead generation request from JetVision Agent UI test"
    };

    try {
      const response = await page.request.post('http://localhost:3002/api/n8n-webhook', {
        data: testPayload,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json().catch(() => ({}));
      
      console.log('📥 Direct webhook response:');
      console.log(`Status: ${response.status()}`);
      console.log(`Data:`, responseData);

      // Log the response for analysis
      fs.writeFileSync(
        'test-results/direct-n8n-webhook-response.json',
        JSON.stringify({
          status: response.status(),
          headers: response.headers(),
          data: responseData,
          timestamp: new Date().toISOString()
        }, null, 2)
      );

      expect(response.status()).toBe(200);

    } catch (error) {
      console.error('❌ Direct webhook test failed:', error);
      throw error;
    }
  });
});