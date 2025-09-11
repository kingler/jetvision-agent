import { test, expect } from '@playwright/test';

test.describe('Prompt Card Network Diagnostic', () => {
  const baseURL = 'http://localhost:3001';
  let webhookRequests: any[] = [];

  test.beforeEach(async ({ page }) => {
    webhookRequests = [];
    
    page.route('**/api/n8n-webhook', async (route) => {
      const request = route.request();
      const requestBody = request.postData();
      
      const requestDetails = {
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        body: requestBody ? JSON.parse(requestBody) : null,
        timestamp: new Date().toISOString()
      };
      
      webhookRequests.push(requestDetails);
      
      console.log('\n🔍 N8N Webhook Request Captured:');
      console.log('URL:', request.url());
      console.log('Method:', request.method());
      console.log('Headers:', JSON.stringify(request.headers(), null, 2));
      console.log('Body:', JSON.stringify(requestDetails.body, null, 2));
      
      await route.continue();
    });
  });

  test('should capture prompt card submission payload structure', async ({ page }) => {
    test.setTimeout(120000);
    
    console.log('🚀 Starting prompt card network diagnostic...');
    
    await page.goto(baseURL);
    console.log('✅ Navigated to application');
    
    await page.waitForLoadState('networkidle');
    
    try {
      const welcomeModal = page.locator('[data-testid="welcome-modal"], .modal, [role="dialog"]').first();
      if (await welcomeModal.isVisible({ timeout: 5000 })) {
        console.log('📝 Welcome modal detected, attempting to dismiss...');
        
        const dismissStrategies = [
          () => page.locator('[data-testid="welcome-modal-close"], button[aria-label="Close"], .modal-close').first().click(),
          () => page.locator('button:has-text("Continue"), button:has-text("Get Started"), button:has-text("OK")').first().click(),
          () => page.keyboard.press('Escape'),
          () => page.locator('.modal-backdrop, .overlay').first().click({ position: { x: 10, y: 10 } })
        ];
        
        for (const strategy of dismissStrategies) {
          try {
            await strategy();
            await page.waitForTimeout(1000);
            if (!await welcomeModal.isVisible({ timeout: 2000 })) {
              console.log('✅ Welcome modal dismissed successfully');
              break;
            }
          } catch (e) {
            console.log('Trying next dismissal strategy');
          }
        }
      }
    } catch (e) {
      console.log('ℹ️ No welcome modal found or already dismissed');
    }
    
    await page.waitForTimeout(2000);
    
    console.log('🔍 Looking for prompt cards access...');
    
    const promptCardSelectors = [
      '[data-testid="prompt-cards-button"]',
      'button:has-text("Prompt Cards")',
      'button:has-text("Prompts")',
      '.prompt-cards-trigger',
      '[aria-label*="prompt"]',
      'button[title*="prompt"]'
    ];
    
    let promptCardsButton = null;
    for (const selector of promptCardSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          promptCardsButton = element;
          console.log(`✅ Found prompt cards button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`Selector ${selector} not found, trying next`);
      }
    }
    
    if (!promptCardsButton) {
      console.log('⚠️ Prompt cards button not found, searching for alternatives...');
      await page.screenshot({ path: 'debug-no-prompt-cards-button.png', fullPage: true });
      
      const allButtons = await page.locator('button, [role="button"], .clickable').all();
      console.log(`Found ${allButtons.length} clickable elements`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        try {
          const text = await allButtons[i].textContent();
          const ariaLabel = await allButtons[i].getAttribute('aria-label');
          console.log(`Button ${i}: "${text}" (aria-label: "${ariaLabel}")`);
        } catch (e) {
          console.log(`Could not get text for button ${i}`);
        }
      }
      
      if (allButtons.length > 0) {
        console.log('🎯 Attempting to click potential prompt cards triggers...');
        for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
          try {
            await allButtons[i].click();
            await page.waitForTimeout(1000);
            
            const modalAppeared = await page.locator('.modal, [role="dialog"], .prompt-cards').isVisible({ timeout: 2000 });
            if (modalAppeared) {
              console.log(`✅ Found prompt cards interface via button ${i}`);
              break;
            }
          } catch (e) {
            console.log(`Button ${i} click failed, trying next`);
          }
        }
      }
    } else {
      console.log('🎯 Clicking prompt cards button...');
      await promptCardsButton.click();
      await page.waitForTimeout(2000);
    }
    
    const promptCardModal = page.locator('.modal, [role="dialog"], .prompt-cards-modal, .prompt-library').first();
    
    if (await promptCardModal.isVisible({ timeout: 5000 })) {
      console.log('✅ Prompt cards interface opened');
      
      console.log('🔍 Searching for Apollo-related prompt cards...');
      
      const apolloSelectors = [
        'text="Apollo"',
        'text="Lead Generation"', 
        'text="Executive Assistants"',
        'text="NYC"',
        'text="Private Equity"'
      ];
      
      let selectedPromptCard = null;
      for (const selector of apolloSelectors) {
        try {
          const apolloCard = page.locator(selector).first();
          if (await apolloCard.isVisible({ timeout: 2000 })) {
            console.log(`✅ Found Apollo-related card: ${selector}`);
            
            const cardContainer = apolloCard.locator('..').locator('..');
            const actionButtons = cardContainer.locator('button:has-text("Select"), button:has-text("Use"), button:has-text("Insert")');
            
            if (await actionButtons.first().isVisible({ timeout: 2000 })) {
              selectedPromptCard = actionButtons.first();
              break;
            } else {
              selectedPromptCard = apolloCard;
              break;
            }
          }
        } catch (e) {
          console.log(`Apollo selector ${selector} not found`);
        }
      }
      
      if (!selectedPromptCard) {
        console.log('⚠️ No Apollo-specific cards found, trying first available card...');
        const firstCard = page.locator('button:has-text("Select"), button:has-text("Use"), .prompt-card button').first();
        if (await firstCard.isVisible({ timeout: 3000 })) {
          selectedPromptCard = firstCard;
        }
      }
      
      if (selectedPromptCard) {
        console.log('🎯 Submitting prompt card...');
        
        webhookRequests = [];
        
        await selectedPromptCard.click();
        
        await page.waitForTimeout(5000);
        
        console.log('\n📊 NETWORK ANALYSIS RESULTS:');
        console.log(`Total webhook requests captured: ${webhookRequests.length}`);
        
        if (webhookRequests.length > 0) {
          webhookRequests.forEach((req, index) => {
            console.log(`\n--- Request ${index + 1} ---`);
            console.log('Timestamp:', req.timestamp);
            console.log('Method:', req.method);
            console.log('URL:', req.url);
            
            if (req.body) {
              console.log('\n🔍 Request Body Analysis:');
              console.log('Full payload:', JSON.stringify(req.body, null, 2));
              
              if (req.body.fullPrompt) {
                console.log('\n📝 Full Prompt Field:');
                console.log(req.body.fullPrompt);
                
                const hasApolloContent = req.body.fullPrompt.toLowerCase().includes('apollo');
                console.log('Contains Apollo references:', hasApolloContent);
              }
              
              if (req.body.prompt) {
                console.log('\n📝 Short Prompt Field:');
                console.log(req.body.prompt);
              }
              
              if (req.body.category) {
                console.log('\n📂 Category:', req.body.category);
              }
              
              if (req.body.parameters) {
                console.log('\n⚙️ Parameters:', JSON.stringify(req.body.parameters, null, 2));
              }
              
              const isSystemLevel = req.body.fullPrompt && req.body.fullPrompt.includes('As a JetVision');
              console.log('Contains system-level instructions:', isSystemLevel);
              
              const hasMCPReferences = req.body.fullPrompt && (
                req.body.fullPrompt.includes('Apollo.io') || 
                req.body.fullPrompt.includes('apollo') ||
                req.body.fullPrompt.includes('mcp')
              );
              console.log('Contains MCP tool references:', hasMCPReferences);
            }
          });
          
          expect(webhookRequests.length).toBeGreaterThan(0);
          expect(webhookRequests[0].body).toBeDefined();
          
        } else {
          console.log('❌ No webhook requests captured!');
          console.log('This indicates the prompt card is not sending data to N8N webhook');
          
          await page.screenshot({ path: 'debug-no-webhook-request.png', fullPage: true });
        }
        
      } else {
        console.log('❌ Could not find any prompt cards to test');
        await page.screenshot({ path: 'debug-no-prompt-cards-found.png', fullPage: true });
      }
      
    } else {
      console.log('❌ Could not access prompt cards interface');
      await page.screenshot({ path: 'debug-no-prompt-modal.png', fullPage: true });
    }
    
    console.log('\n📋 DIAGNOSTIC SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Webhook requests captured: ${webhookRequests.length}`);
    
    if (webhookRequests.length > 0) {
      const firstRequest = webhookRequests[0];
      console.log('✅ Successfully captured prompt card → N8N webhook integration');
      console.log('✅ Request payload structure documented');
      
      if (firstRequest.body?.fullPrompt?.includes('As a JetVision')) {
        console.log('⚠️ System-level instructions detected in payload');
      }
      
      if (firstRequest.body?.fullPrompt?.toLowerCase().includes('apollo')) {
        console.log('✅ Apollo MCP references found in payload');
      } else {
        console.log('❌ No Apollo MCP references in payload');
      }
    } else {
      console.log('❌ No integration detected - prompt cards may not be connected to N8N webhook');
    }
  });
});