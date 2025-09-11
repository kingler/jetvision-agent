import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class JetVisionTestSuite {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.screenshotDir = join(__dirname, 'test-screenshots');
  }

  async setup() {
    console.log('🚀 Setting up Playwright test environment...');
    
    // Ensure screenshot directory exists
    await fs.mkdir(this.screenshotDir, { recursive: true });
    
    // Launch browser with extended timeout for slow operations
    this.browser = await chromium.launch({
      headless: false, // Set to true for CI/headless operation
      slowMo: 1000,    // Slow down operations for visibility
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      // Add more realistic browser context
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    this.page = await this.context.newPage();
    
    // Set extended timeouts for network operations
    this.page.setDefaultTimeout(60000); // 60 seconds
    this.page.setDefaultNavigationTimeout(60000);
    
    console.log('✅ Browser setup complete');
  }

  async navigateToChat() {
    console.log('🌐 Navigating to JetVision Agent chat interface...');
    
    try {
      await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      // Wait for the page to be ready
      await this.page.waitForSelector('body', { timeout: 30000 });
      
      // Take screenshot of landing page
      await this.takeScreenshot('01-landing-page');
      
      console.log('✅ Successfully navigated to JetVision Agent');
      
      // Check if we need to navigate to chat page specifically
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/chat')) {
        console.log('🔄 Looking for chat interface...');
        
        // Look for chat link or button
        const chatLink = await this.page.$('a[href*="/chat"]');
        if (chatLink) {
          await chatLink.click();
          await this.page.waitForLoadState('networkidle');
          await this.takeScreenshot('02-chat-page-loaded');
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to navigate to chat interface:', error.message);
      await this.takeScreenshot('error-navigation');
      return false;
    }
  }

  async testLeadGeneration() {
    console.log('💼 Testing lead generation functionality...');
    
    try {
      // Look for chat input field with multiple possible selectors
      const inputSelectors = [
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Type"]',
        'input[placeholder*="message"]',
        'input[placeholder*="Type"]',
        '[data-testid="chat-input"]',
        '.chat-input textarea',
        'textarea'
      ];
      
      let chatInput = null;
      for (const selector of inputSelectors) {
        chatInput = await this.page.$(selector);
        if (chatInput) {
          console.log(`✅ Found chat input using selector: ${selector}`);
          break;
        }
      }
      
      if (!chatInput) {
        console.error('❌ Could not find chat input field');
        await this.takeScreenshot('error-no-input-field');
        return false;
      }
      
      const leadPrompt = "Find me 3 executive assistants in New York";
      console.log(`📝 Typing prompt: "${leadPrompt}"`);
      
      await chatInput.fill(leadPrompt);
      await this.takeScreenshot('03-prompt-entered');
      
      // Look for submit button or press Enter
      const submitSelectors = [
        'button[type="submit"]',
        'button[aria-label*="send"]',
        'button[data-testid*="send"]',
        '.send-button',
        '[data-testid="send-button"]'
      ];
      
      let submitButton = null;
      for (const selector of submitSelectors) {
        submitButton = await this.page.$(selector);
        if (submitButton) {
          console.log(`✅ Found submit button using selector: ${selector}`);
          break;
        }
      }
      
      if (submitButton) {
        await submitButton.click();
      } else {
        console.log('🔄 No submit button found, pressing Enter');
        await chatInput.press('Enter');
      }
      
      console.log('⏳ Waiting for response...');
      
      // Take screenshot immediately after sending
      await this.takeScreenshot('04-prompt-sent');
      
      // Wait for response with extended timeout and check for various response indicators
      const responseIndicators = [
        '.message:not(.user-message)', // Generic message that's not from user
        '[data-role="assistant"]',
        '.ai-response',
        '.bot-message',
        '.assistant-message',
        '.response-message'
      ];
      
      let responseFound = false;
      let responseElement = null;
      
      // Wait up to 60 seconds for any response
      for (let attempt = 0; attempt < 12; attempt++) {
        console.log(`🔍 Checking for response (attempt ${attempt + 1}/12)...`);
        
        for (const selector of responseIndicators) {
          responseElement = await this.page.$(selector);
          if (responseElement) {
            console.log(`✅ Found response using selector: ${selector}`);
            responseFound = true;
            break;
          }
        }
        
        if (responseFound) break;
        
        // Also check for loading indicators
        const loadingElements = await this.page.$$('.loading, .spinner, [data-loading="true"]');
        if (loadingElements.length > 0) {
          console.log('⏳ Response is loading...');
        }
        
        await this.page.waitForTimeout(5000); // Wait 5 seconds between checks
        await this.takeScreenshot(`05-waiting-response-${attempt + 1}`);
      }
      
      if (responseFound) {
        await this.takeScreenshot('06-response-received');
        
        // Analyze the response content
        const responseText = await responseElement.textContent();
        console.log('📄 Response received:', responseText?.substring(0, 200) + '...');
        
        // Check for specific indicators of enhanced responses
        const hasProgressIndicators = responseText?.includes('progress') || 
                                    responseText?.includes('status') ||
                                    responseText?.includes('deployed') ||
                                    await this.page.$('.progress-indicator, .status-update');
        
        const hasStructuredData = responseText?.includes('contact') ||
                                responseText?.includes('email') ||
                                responseText?.includes('phone') ||
                                responseText?.includes('company');
        
        const hasGenericResponse = responseText?.includes('Our system of agents have been deployed') ||
                                 responseText?.includes('Empty response received');
        
        console.log('📊 Response Analysis:');
        console.log('  - Has Progress Indicators:', hasProgressIndicators);
        console.log('  - Has Structured Data:', hasStructuredData);
        console.log('  - Has Generic Response:', hasGenericResponse);
        
        return {
          success: true,
          hasProgressIndicators,
          hasStructuredData,
          hasGenericResponse,
          responseText: responseText?.substring(0, 500)
        };
      } else {
        console.error('❌ No response received within timeout period');
        await this.takeScreenshot('error-no-response');
        return { success: false, error: 'No response received' };
      }
      
    } catch (error) {
      console.error('❌ Lead generation test failed:', error.message);
      await this.takeScreenshot('error-lead-generation');
      return { success: false, error: error.message };
    }
  }

  async testFortune500Analysis() {
    console.log('🏢 Testing Fortune 500 strategic analysis...');
    
    try {
      // Clear any existing text and enter new prompt
      const chatInput = await this.page.$('textarea, input[type="text"]');
      if (!chatInput) {
        console.error('❌ Could not find chat input for Fortune 500 test');
        return { success: false, error: 'Chat input not found' };
      }
      
      const analysisPrompt = "As a JetVision enterprise account strategist, map the complete decision-making unit for private aviation at Fortune 500 companies";
      console.log(`📝 Typing Fortune 500 prompt...`);
      
      await chatInput.fill(analysisPrompt);
      await this.takeScreenshot('07-fortune500-prompt-entered');
      
      // Submit the prompt
      const submitButton = await this.page.$('button[type="submit"], .send-button');
      if (submitButton) {
        await submitButton.click();
      } else {
        await chatInput.press('Enter');
      }
      
      await this.takeScreenshot('08-fortune500-prompt-sent');
      
      console.log('⏳ Waiting for Fortune 500 analysis response...');
      
      // Wait for response with similar timeout logic
      let responseFound = false;
      let responseElement = null;
      
      for (let attempt = 0; attempt < 12; attempt++) {
        console.log(`🔍 Checking for Fortune 500 response (attempt ${attempt + 1}/12)...`);
        
        // Look for new messages that appeared after our prompt
        const allMessages = await this.page.$$('.message, [data-role="assistant"], .ai-response');
        if (allMessages.length > 0) {
          // Get the last message (most recent)
          responseElement = allMessages[allMessages.length - 1];
          responseFound = true;
          break;
        }
        
        await this.page.waitForTimeout(5000);
        await this.takeScreenshot(`09-waiting-fortune500-${attempt + 1}`);
      }
      
      if (responseFound) {
        await this.takeScreenshot('10-fortune500-response-received');
        
        const responseText = await responseElement.textContent();
        console.log('📄 Fortune 500 Response:', responseText?.substring(0, 300) + '...');
        
        // Analyze Fortune 500 response quality
        const hasComprehensiveAnalysis = responseText?.includes('decision-making') ||
                                       responseText?.includes('strategy') ||
                                       responseText?.includes('executive') ||
                                       responseText?.includes('Fortune 500');
        
        const hasEmptyResponse = responseText?.includes('Empty response received') ||
                               responseText?.trim().length < 50;
        
        const hasBusinessInsights = responseText?.includes('C-suite') ||
                                  responseText?.includes('procurement') ||
                                  responseText?.includes('aviation') ||
                                  responseText?.includes('enterprise');
        
        console.log('📊 Fortune 500 Analysis:');
        console.log('  - Has Comprehensive Analysis:', hasComprehensiveAnalysis);
        console.log('  - Has Business Insights:', hasBusinessInsights);
        console.log('  - Has Empty Response:', hasEmptyResponse);
        
        return {
          success: true,
          hasComprehensiveAnalysis,
          hasBusinessInsights,
          hasEmptyResponse,
          responseText: responseText?.substring(0, 500)
        };
      } else {
        console.error('❌ No Fortune 500 response received');
        await this.takeScreenshot('error-no-fortune500-response');
        return { success: false, error: 'No response received' };
      }
      
    } catch (error) {
      console.error('❌ Fortune 500 analysis test failed:', error.message);
      await this.takeScreenshot('error-fortune500-analysis');
      return { success: false, error: error.message };
    }
  }

  async takeScreenshot(name) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${name}-${timestamp}.png`;
      const filepath = join(this.screenshotDir, filename);
      
      await this.page.screenshot({
        path: filepath,
        fullPage: true
      });
      
      console.log(`📸 Screenshot saved: ${filename}`);
    } catch (error) {
      console.error('❌ Failed to take screenshot:', error.message);
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    console.log('✅ Cleanup complete');
  }

  async generateReport(leadResult, fortune500Result) {
    console.log('\n🎯 === JetVision Agent Test Report ===\n');
    
    console.log('📍 Test Configuration:');
    console.log('  - Target URL: http://localhost:3000');
    console.log('  - Browser: Chromium');
    console.log('  - Viewport: 1920x1080');
    console.log('  - Timeout: 60 seconds per test\n');
    
    console.log('🧪 Lead Generation Test Results:');
    if (leadResult.success) {
      console.log('  ✅ Status: PASSED');
      console.log('  📊 Analysis:');
      console.log(`    - Progress Indicators: ${leadResult.hasProgressIndicators ? '✅' : '❌'}`);
      console.log(`    - Structured Data: ${leadResult.hasStructuredData ? '✅' : '❌'}`);
      console.log(`    - Avoids Generic Response: ${!leadResult.hasGenericResponse ? '✅' : '❌'}`);
      if (leadResult.responseText) {
        console.log('  📝 Response Preview:', leadResult.responseText);
      }
    } else {
      console.log('  ❌ Status: FAILED');
      console.log('  🚫 Error:', leadResult.error);
    }
    
    console.log('\n🏢 Fortune 500 Analysis Test Results:');
    if (fortune500Result.success) {
      console.log('  ✅ Status: PASSED');
      console.log('  📊 Analysis:');
      console.log(`    - Comprehensive Analysis: ${fortune500Result.hasComprehensiveAnalysis ? '✅' : '❌'}`);
      console.log(`    - Business Insights: ${fortune500Result.hasBusinessInsights ? '✅' : '❌'}`);
      console.log(`    - Avoids Empty Response: ${!fortune500Result.hasEmptyResponse ? '✅' : '❌'}`);
      if (fortune500Result.responseText) {
        console.log('  📝 Response Preview:', fortune500Result.responseText);
      }
    } else {
      console.log('  ❌ Status: FAILED');
      console.log('  🚫 Error:', fortune500Result.error);
    }
    
    console.log(`\n📸 Screenshots saved to: ${this.screenshotDir}`);
    
    // Overall assessment
    const leadPassed = leadResult.success && leadResult.hasProgressIndicators && !leadResult.hasGenericResponse;
    const fortune500Passed = fortune500Result.success && fortune500Result.hasComprehensiveAnalysis && !fortune500Result.hasEmptyResponse;
    
    console.log('\n🎯 Overall Assessment:');
    console.log(`  - Lead Generation: ${leadPassed ? '✅ QUALITY VERIFIED' : '⚠️ NEEDS IMPROVEMENT'}`);
    console.log(`  - Fortune 500 Analysis: ${fortune500Passed ? '✅ QUALITY VERIFIED' : '⚠️ NEEDS IMPROVEMENT'}`);
    
    if (leadPassed && fortune500Passed) {
      console.log('\n🎉 SUCCESS: JetVision Agent is properly displaying enhanced responses!');
    } else {
      console.log('\n⚠️ ISSUES DETECTED: Response quality needs improvement');
    }
  }
}

// Main execution
async function runTests() {
  const testSuite = new JetVisionTestSuite();
  
  try {
    await testSuite.setup();
    
    const navigationSuccess = await testSuite.navigateToChat();
    if (!navigationSuccess) {
      console.error('❌ Failed to navigate to chat interface. Aborting tests.');
      return;
    }
    
    console.log('🚀 Starting test execution...\n');
    
    const leadResult = await testSuite.testLeadGeneration();
    console.log('\n⏱️ Waiting 5 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const fortune500Result = await testSuite.testFortune500Analysis();
    
    await testSuite.generateReport(leadResult, fortune500Result);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await testSuite.cleanup();
  }
}

// Run the tests
runTests().catch(console.error);