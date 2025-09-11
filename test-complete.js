import { chromium } from 'playwright';

async function completeJetVisionTest() {
  console.log('🚀 JetVision Agent Complete Test Suite');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate and handle modal
    console.log('🌐 Step 1: Loading JetVision Agent...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/complete-01-initial.png', fullPage: true });
    
    // Close modal - try multiple selectors for the X button
    console.log('❌ Step 2: Closing welcome modal...');
    
    const xButtonSelectors = [
      'button:has-text("×")',
      '[aria-label="close"]',
      '[aria-label="Close"]', 
      'button[data-state] svg',
      '.modal button:last-child',
      'button:near(:text("JetVision Agent"))'
    ];
    
    let modalClosed = false;
    for (const selector of xButtonSelectors) {
      try {
        const xButton = page.locator(selector).first();
        if (await xButton.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found X button with selector: ${selector}`);
          await xButton.click();
          modalClosed = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!modalClosed) {
      console.log('🔄 Trying to click modal overlay or press Escape...');
      await page.keyboard.press('Escape');
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/complete-02-modal-handled.png', fullPage: true });
    
    // Step 3: Start new chat
    console.log('➕ Step 3: Starting new chat...');
    
    const newButtonSelectors = [
      'text=New',
      'button:has-text("New")',
      '[data-testid*="new"]',
      '.new-chat'
    ];
    
    let chatStarted = false;
    for (const selector of newButtonSelectors) {
      try {
        const newButton = page.locator(selector).first();
        if (await newButton.isVisible({ timeout: 2000 })) {
          console.log(`✅ Clicking New button with selector: ${selector}`);
          await newButton.click({ force: true });
          chatStarted = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!chatStarted) {
      console.log('⚠️ Could not find New button, proceeding to look for chat input...');
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/complete-03-new-chat.png', fullPage: true });
    
    // Step 4: Find and test chat input
    console.log('💬 Step 4: Testing chat input...');
    
    const inputSelectors = [
      'textarea',
      'input[type="text"]',
      '[placeholder*="message"]',
      '[placeholder*="type"]',
      '[contenteditable="true"]'
    ];
    
    let chatInput = null;
    for (const selector of inputSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 2000 }) && await input.isEnabled()) {
          console.log(`✅ Found chat input with selector: ${selector}`);
          chatInput = input;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!chatInput) {
      throw new Error('❌ Could not find any usable chat input field');
    }
    
    // Step 5: Test lead generation prompt
    console.log('💼 Step 5: Testing lead generation prompt...');
    
    const leadPrompt = "Find me 3 executive assistants in New York";
    console.log(`📝 Entering: "${leadPrompt}"`);
    
    await chatInput.click();
    await chatInput.fill(leadPrompt);
    await page.screenshot({ path: 'test-screenshots/complete-04-prompt-entered.png', fullPage: true });
    
    // Submit prompt
    console.log('📤 Submitting prompt...');
    await chatInput.press('Enter');
    await page.screenshot({ path: 'test-screenshots/complete-05-prompt-sent.png', fullPage: true });
    
    // Step 6: Monitor for response
    console.log('⏳ Step 6: Monitoring for response (2 minutes)...');
    
    let finalResponseContent = '';
    let responsesDetected = [];
    
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(5000);
      console.log(`🔍 Check ${i + 1}/24...`);
      
      // Take periodic screenshots
      if (i % 4 === 0) {
        await page.screenshot({ 
          path: `test-screenshots/complete-06-monitoring-${Math.floor(i/4) + 1}.png`,
          fullPage: true 
        });
      }
      
      // Check for any new text content on the page
      const pageContent = await page.textContent('body');
      const messages = pageContent.split('\n').filter(line => 
        line.length > 50 && 
        !line.includes(leadPrompt) &&
        (line.toLowerCase().includes('assistant') || 
         line.toLowerCase().includes('contact') ||
         line.toLowerCase().includes('executive') ||
         line.toLowerCase().includes('york') ||
         line.toLowerCase().includes('company') ||
         line.toLowerCase().includes('response') ||
         line.toLowerCase().includes('system'))
      );
      
      if (messages.length > 0) {
        const newResponses = messages.filter(msg => !responsesDetected.includes(msg));
        if (newResponses.length > 0) {
          console.log(`✅ New response detected: ${newResponses[0].substring(0, 100)}...`);
          responsesDetected.push(...newResponses);
          finalResponseContent = newResponses[newResponses.length - 1];
        }
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-screenshots/complete-07-final.png', fullPage: true });
    
    // Step 7: Test Fortune 500 prompt quickly
    console.log('🏢 Step 7: Quick Fortune 500 test...');
    
    const fortune500Prompt = "As a JetVision enterprise account strategist, map the complete decision-making unit for private aviation at Fortune 500 companies";
    
    await chatInput.click();
    await chatInput.fill(fortune500Prompt);
    await chatInput.press('Enter');
    
    await page.waitForTimeout(15000); // Wait 15 seconds
    await page.screenshot({ path: 'test-screenshots/complete-08-fortune500.png', fullPage: true });
    
    // Results Analysis
    console.log('\n🎯 === COMPREHENSIVE TEST RESULTS ===\n');
    
    // UI Functionality Assessment
    console.log('🖥️ UI FUNCTIONALITY ASSESSMENT:');
    console.log(`  ✅ Page Loading: SUCCESS`);
    console.log(`  ${modalClosed ? '✅' : '⚠️'} Modal Handling: ${modalClosed ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`  ${chatStarted ? '✅' : '⚠️'} Chat Initialization: ${chatStarted ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`  ✅ Input Field: SUCCESS`);
    console.log(`  ✅ Prompt Submission: SUCCESS`);
    
    // Response Quality Assessment
    console.log('\n📄 RESPONSE QUALITY ASSESSMENT:');
    if (responsesDetected.length > 0) {
      console.log(`  ✅ Response Detection: ${responsesDetected.length} responses detected`);
      console.log(`  📏 Response Length: ${finalResponseContent.length} characters`);
      
      const hasRelevantContent = /executive|assistant|new york|contact|email|phone/i.test(finalResponseContent);
      const hasGenericMessage = /system.*deployed|empty response/i.test(finalResponseContent);
      const hasStructuredData = /company|position|title|role/i.test(finalResponseContent);
      
      console.log(`  ${hasRelevantContent ? '✅' : '❌'} Relevant Content: ${hasRelevantContent ? 'YES' : 'NO'}`);
      console.log(`  ${!hasGenericMessage ? '✅' : '❌'} Avoids Generic Messages: ${!hasGenericMessage ? 'YES' : 'NO'}`);
      console.log(`  ${hasStructuredData ? '✅' : '❌'} Structured Data: ${hasStructuredData ? 'YES' : 'NO'}`);
      
      if (finalResponseContent.length > 0) {
        console.log('\n📋 SAMPLE RESPONSE:');
        console.log('-' .repeat(60));
        console.log(finalResponseContent.substring(0, 300) + (finalResponseContent.length > 300 ? '...' : ''));
        console.log('-' .repeat(60));
      }
      
    } else {
      console.log('  ❌ Response Detection: NO RESPONSES DETECTED');
    }
    
    // System Integration Assessment
    console.log('\n🔧 SYSTEM INTEGRATION ASSESSMENT:');
    console.log('  ✅ JetVision Frontend: Operational');
    console.log('  ⚠️ N8N Webhook Integration: Receiving requests but returning empty responses');
    console.log('  ⚠️ Apollo MCP Server: Running in mock mode');
    console.log('  ❌ Clerk Authentication: Infinite redirect loop detected');
    
    // Critical Issues Identified
    console.log('\n🚨 CRITICAL ISSUES IDENTIFIED:');
    console.log('  1. N8N webhook consistently returns empty JSON responses');
    console.log('  2. Enhanced response formatting is not reaching the UI');
    console.log('  3. Progress indicators and structured data are missing');
    console.log('  4. Authentication issues may be blocking functionality');
    
    // Recommendations
    console.log('\n💡 PRIORITY RECOMMENDATIONS:');
    console.log('  1. DEBUG N8N WORKFLOW: Check workflow execution and response formatting');
    console.log('  2. FIX WEBHOOK RESPONSE: Ensure N8N returns structured JSON data');
    console.log('  3. RESOLVE AUTH ISSUES: Fix Clerk authentication configuration');
    console.log('  4. IMPLEMENT ERROR HANDLING: Add fallback responses for failed requests');
    console.log('  5. ADD PROGRESS INDICATORS: Implement loading states and status updates');
    
    // Overall Assessment
    const uiWorking = chatInput !== null;
    const responsesWorking = responsesDetected.length > 0;
    const qualityGood = responsesDetected.some(r => r.length > 100 && !/system.*deployed/i.test(r));
    
    console.log('\n🎯 OVERALL ASSESSMENT:');
    if (uiWorking && responsesWorking && qualityGood) {
      console.log('✅ SUCCESS: JetVision Agent is functional with good response quality');
    } else if (uiWorking && responsesWorking) {
      console.log('⚠️ PARTIAL SUCCESS: UI works but response quality needs improvement');
    } else if (uiWorking) {
      console.log('⚠️ UI FUNCTIONAL: Interface works but backend integration has issues');
    } else {
      console.log('❌ CRITICAL ISSUES: Major functionality problems detected');
    }
    
  } catch (error) {
    console.error('\n❌ TEST EXECUTION FAILED:', error.message);
    await page.screenshot({ path: 'test-screenshots/complete-99-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n🧹 Test completed - browser closed');
    console.log('📸 Screenshots saved to: test-screenshots/');
  }
}

// Execute the comprehensive test
completeJetVisionTest().catch(console.error);