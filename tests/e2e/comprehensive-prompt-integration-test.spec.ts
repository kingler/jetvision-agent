import { test, expect } from '@playwright/test';

test.describe('Comprehensive Prompt Integration Test', () => {
  const baseURL = 'http://localhost:3001';
  let webhookResponses: any[] = [];

  test.beforeEach(async ({ page }) => {
    webhookResponses = [];
    
    // Intercept N8N webhook responses to capture structured data
    page.route('**/api/n8n-webhook', async (route) => {
      const request = route.request();
      
      // Continue with the request
      const response = await route.continue();
      
      console.log('🔍 Webhook request intercepted:', {
        method: request.method(),
        url: request.url(),
        hasBody: !!request.postData()
      });
      
      return response;
    });
    
    // Monitor console for any errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text());
      }
    });
  });

  test('should test Apollo lead generation prompts', async ({ page }) => {
    test.setTimeout(120000);
    
    console.log('🎯 Testing Apollo Lead Generation Prompts...');
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Dismiss welcome modal
    await dismissWelcomeModal(page);
    
    // Test different Apollo lead generation prompts
    const apolloPrompts = [
      "Find executive assistants at NYC private equity firms",
      "Search for EAs at tech companies in San Francisco", 
      "Identify decision makers at Fortune 500 companies",
      "Generate leads for private aviation services in Miami"
    ];
    
    for (const prompt of apolloPrompts) {
      console.log(`\n📊 Testing Apollo prompt: "${prompt}"`);
      
      const result = await sendPromptAndCapture(page, prompt);
      
      // Validate Apollo-specific response characteristics
      expect(result.hasResponse).toBe(true);
      expect(result.responseText.length).toBeGreaterThan(200);
      
      // Check for Apollo-related content
      const hasApolloContent = result.responseText.toLowerCase().includes('apollo') ||
                              result.responseText.toLowerCase().includes('leads') ||
                              result.responseText.toLowerCase().includes('executive assistant') ||
                              result.responseText.toLowerCase().includes('contact');
      
      console.log(`✅ Apollo content detected: ${hasApolloContent}`);
      expect(hasApolloContent).toBe(true);
      
      // Wait before next test
      await page.waitForTimeout(2000);
    }
  });
  
  test('should test Avinode charter operation prompts', async ({ page }) => {
    test.setTimeout(120000);
    
    console.log('✈️ Testing Avinode Charter Operations Prompts...');
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    await dismissWelcomeModal(page);
    
    const avinodePrompts = [
      "Search for heavy jets from New York to London next Tuesday",
      "Find empty leg flights this weekend",
      "Check aircraft availability for Miami to Los Angeles",
      "Analyze fleet utilization metrics for this month"
    ];
    
    for (const prompt of avinodePrompts) {
      console.log(`\n🛩️ Testing Avinode prompt: "${prompt}"`);
      
      const result = await sendPromptAndCapture(page, prompt);
      
      expect(result.hasResponse).toBe(true);
      expect(result.responseText.length).toBeGreaterThan(200);
      
      // Check for aviation-related content
      const hasAviationContent = result.responseText.toLowerCase().includes('aircraft') ||
                                result.responseText.toLowerCase().includes('flight') ||
                                result.responseText.toLowerCase().includes('aviation') ||
                                result.responseText.toLowerCase().includes('charter');
      
      console.log(`✅ Aviation content detected: ${hasAviationContent}`);
      expect(hasAviationContent).toBe(true);
      
      await page.waitForTimeout(2000);
    }
  });
  
  test('should test business intelligence and analysis prompts', async ({ page }) => {
    test.setTimeout(120000);
    
    console.log('📈 Testing Business Intelligence Prompts...');
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    await dismissWelcomeModal(page);
    
    const businessPrompts = [
      "Analyze Fortune 500 decision-making structures for private aviation",
      "What are the key performance indicators for our aviation business?",
      "Compare conversion rates with last quarter",
      "Generate comprehensive Monday executive briefing"
    ];
    
    for (const prompt of businessPrompts) {
      console.log(`\n📊 Testing business prompt: "${prompt}"`);
      
      const result = await sendPromptAndCapture(page, prompt);
      
      expect(result.hasResponse).toBe(true);
      expect(result.responseText.length).toBeGreaterThan(200);
      
      // Check for business analysis content
      const hasBusinessContent = result.responseText.toLowerCase().includes('analysis') ||
                                result.responseText.toLowerCase().includes('business') ||
                                result.responseText.toLowerCase().includes('kpi') ||
                                result.responseText.toLowerCase().includes('performance');
      
      console.log(`✅ Business content detected: ${hasBusinessContent}`);
      expect(hasBusinessContent).toBe(true);
      
      await page.waitForTimeout(2000);
    }
  });
  
  test('should test general conversation prompts', async ({ page }) => {
    test.setTimeout(90000);
    
    console.log('💬 Testing General Conversation Prompts...');
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    await dismissWelcomeModal(page);
    
    const conversationPrompts = [
      "Hello, how can you help me today?",
      "What services does JetVision provide?", 
      "Thank you for your assistance",
      "Can you help me understand private aviation options?"
    ];
    
    for (const prompt of conversationPrompts) {
      console.log(`\n💭 Testing conversation prompt: "${prompt}"`);
      
      const result = await sendPromptAndCapture(page, prompt);
      
      expect(result.hasResponse).toBe(true);
      expect(result.responseText.length).toBeGreaterThan(50);
      
      // Check for conversational and aviation context
      const hasJetVisionContext = result.responseText.toLowerCase().includes('jetvision') ||
                                 result.responseText.toLowerCase().includes('aviation') ||
                                 result.responseText.toLowerCase().includes('charter') ||
                                 result.responseText.toLowerCase().includes('private jet');
      
      console.log(`✅ JetVision context maintained: ${hasJetVisionContext}`);
      expect(hasJetVisionContext).toBe(true);
      
      await page.waitForTimeout(1500);
    }
  });
  
  test('should test N8N workflow integration with direct webhook', async ({ page }) => {
    test.setTimeout(60000);
    
    console.log('🔧 Testing Direct N8N Webhook Integration...');
    
    const testPayloads = [
      {
        name: "Apollo Lead Search",
        payload: {
          message: "Find executive assistants at NYC private equity firms",
          threadId: "test-apollo-direct"
        },
        expectKeywords: ['apollo', 'executive', 'assistant', 'leads']
      },
      {
        name: "Charter Operations",
        payload: {
          message: "Search heavy jets for international flight to Paris",
          threadId: "test-charter-direct"  
        },
        expectKeywords: ['aircraft', 'flight', 'aviation', 'charter']
      },
      {
        name: "Business Analysis",
        payload: {
          message: "Analyze decision-making units at Fortune 500 companies",
          threadId: "test-analysis-direct"
        },
        expectKeywords: ['analysis', 'decision', 'fortune', 'business']
      }
    ];
    
    for (const testCase of testPayloads) {
      console.log(`\n🔍 Testing direct webhook: ${testCase.name}`);
      
      const response = await page.request.post('/api/n8n-webhook', {
        data: testCase.payload,
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`Response status: ${response.status()}`);
      expect(response.status()).toBe(200);
      
      const responseBody = await response.text();
      console.log(`Response length: ${responseBody.length} characters`);
      
      // Validate response contains expected content
      let hasExpectedContent = false;
      for (const keyword of testCase.expectKeywords) {
        if (responseBody.toLowerCase().includes(keyword)) {
          hasExpectedContent = true;
          break;
        }
      }
      
      console.log(`✅ Expected content found: ${hasExpectedContent}`);
      expect(hasExpectedContent).toBe(true);
      expect(responseBody.length).toBeGreaterThan(100);
      
      // Check if it's a streaming response
      const isStreaming = responseBody.includes('event:') && responseBody.includes('data:');
      console.log(`📡 Streaming response: ${isStreaming}`);
    }
  });
  
  test('should validate structured data in responses', async ({ page }) => {
    test.setTimeout(90000);
    
    console.log('🔍 Testing Structured Data Validation...');
    
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    await dismissWelcomeModal(page);
    
    // Test Apollo lead generation for structured data
    console.log('\n📊 Testing structured Apollo response...');
    
    const apolloResult = await sendPromptAndCapture(page, "Find 5 executive assistants in Manhattan");
    
    // Look for structured data patterns in the response
    const hasStructuredElements = apolloResult.responseText.includes('**') ||
                                 apolloResult.responseText.includes('•') ||
                                 apolloResult.responseText.includes('Name:') ||
                                 apolloResult.responseText.includes('Email:') ||
                                 apolloResult.responseText.includes('Company:');
    
    console.log(`✅ Structured data patterns found: ${hasStructuredElements}`);
    expect(hasStructuredElements).toBe(true);
    
    // Check for professional formatting
    const hasProfessionalFormatting = apolloResult.responseText.includes('**Top Candidates:**') ||
                                     apolloResult.responseText.includes('**Recommended Next Steps:**') ||
                                     apolloResult.responseText.includes('**🎯');
    
    console.log(`✅ Professional formatting found: ${hasProfessionalFormatting}`);
    expect(hasProfessionalFormatting).toBe(true);
  });
});

// Helper function to dismiss welcome modal
async function dismissWelcomeModal(page: any) {
  try {
    const welcomeModal = page.locator('[data-testid="welcome-modal"], .modal, [role="dialog"]').first();
    if (await welcomeModal.isVisible({ timeout: 3000 })) {
      console.log('📝 Dismissing welcome modal...');
      
      const dismissStrategies = [
        () => page.locator('[data-testid="welcome-modal-close"], button[aria-label="Close"]').first().click(),
        () => page.locator('button:has-text("Continue"), button:has-text("Get Started")').first().click(),
        () => page.keyboard.press('Escape')
      ];
      
      for (const strategy of dismissStrategies) {
        try {
          await strategy();
          await page.waitForTimeout(1000);
          if (!await welcomeModal.isVisible({ timeout: 2000 })) {
            console.log('✅ Welcome modal dismissed');
            break;
          }
        } catch (e) {
          // Try next strategy
        }
      }
    }
  } catch (e) {
    console.log('ℹ️ No welcome modal found');
  }
}

// Helper function to send prompt and capture response
async function sendPromptAndCapture(page: any, prompt: string) {
  const chatInputSelectors = [
    '[data-testid="chat-input"]',
    'textarea[placeholder*="message"]',
    'input[placeholder*="message"]', 
    '.chat-input',
    'textarea',
    'input[type="text"]'
  ];
  
  // Find chat input
  let chatInput = null;
  for (const selector of chatInputSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 })) {
        chatInput = element;
        break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  if (!chatInput) {
    throw new Error('Chat input not found');
  }
  
  // Clear and type prompt
  await chatInput.fill('');
  await chatInput.fill(prompt);
  await page.waitForTimeout(500);
  
  // Send message
  const sendButtonSelectors = [
    '[data-testid="send-button"]',
    'button[type="submit"]',
    'button:has-text("Send")',
    '.send-button',
    'button[aria-label*="send"]'
  ];
  
  let sent = false;
  for (const selector of sendButtonSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        sent = true;
        break;
      }
    } catch (e) {
      // Continue
    }
  }
  
  if (!sent) {
    // Try Enter key
    await chatInput.press('Enter');
  }
  
  console.log(`📤 Sent prompt: "${prompt}"`);
  
  // Wait for response
  await page.waitForTimeout(8000);
  
  // Look for response messages
  const responseSelectors = [
    '.chat-message',
    '.message',
    '[data-testid*="message"]',
    '.response',
    '[role="article"]'
  ];
  
  let responseText = '';
  let hasResponse = false;
  
  for (const selector of responseSelectors) {
    try {
      const messages = page.locator(selector);
      const count = await messages.count();
      
      if (count > 0) {
        // Get the last message (most recent response)
        const lastMessage = messages.last();
        responseText = await lastMessage.textContent() || '';
        
        if (responseText && responseText.length > 20) {
          hasResponse = true;
          console.log(`📥 Response received (${responseText.length} chars): "${responseText.substring(0, 100)}..."`);
          break;
        }
      }
    } catch (e) {
      // Continue
    }
  }
  
  return {
    hasResponse,
    responseText,
    responseLength: responseText.length
  };
}