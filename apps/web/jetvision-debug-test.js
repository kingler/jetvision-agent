/**
 * JetVision Agent Chat Interface Debug Test
 * 
 * This test will inspect the chat interface, test N8N integration,
 * and identify issues with message response display.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function debugChatInterface() {
    console.log('🚁 Starting JetVision Agent Chat Interface Debug Test...\n');
    
    const browser = await chromium.launch({ 
        headless: false, // Run with visible browser for debugging
        devtools: true,   // Open DevTools
        slowMo: 1000     // Slow down actions for visibility
    });
    
    const context = await browser.newContext({
        recordVideo: {
            dir: './test-recordings/',
            size: { width: 1280, height: 720 }
        }
    });
    
    const page = await context.newPage();
    
    // Track network requests and responses
    const networkLogs = [];
    const consoleLogs = [];
    const errors = [];
    
    page.on('console', (msg) => {
        consoleLogs.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location(),
            timestamp: new Date().toISOString()
        });
        console.log(`🟡 CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    
    page.on('pageerror', (error) => {
        errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        console.log(`🔴 PAGE ERROR: ${error.message}`);
    });
    
    page.on('requestfailed', (request) => {
        const failure = {
            url: request.url(),
            method: request.method(),
            failure: request.failure(),
            timestamp: new Date().toISOString()
        };
        networkLogs.push({ type: 'failed', ...failure });
        console.log(`❌ REQUEST FAILED: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    page.on('response', async (response) => {
        try {
            const request = response.request();
            const responseData = {
                url: request.url(),
                method: request.method(),
                status: response.status(),
                statusText: response.statusText(),
                headers: Object.fromEntries(await response.allHeaders()),
                timestamp: new Date().toISOString()
            };
            
            // Log N8N webhook calls specifically
            if (request.url().includes('webhook') || request.url().includes('n8n')) {
                console.log(`📡 N8N WEBHOOK: ${request.method()} ${request.url()} - Status: ${response.status()}`);
                
                try {
                    const body = await response.text();
                    responseData.body = body;
                    console.log(`📝 Response Body: ${body.substring(0, 200)}...`);
                } catch (e) {
                    console.log(`⚠️ Could not read response body: ${e.message}`);
                }
            }
            
            networkLogs.push({ type: 'response', ...responseData });
        } catch (error) {
            console.log(`⚠️ Error processing response: ${error.message}`);
        }
    });
    
    try {
        console.log('🌐 Navigating to http://localhost:3000...');
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // Take a screenshot of initial state
        await page.screenshot({ 
            path: './test-recordings/01-initial-load.png',
            fullPage: true 
        });
        
        console.log('📊 Analyzing page structure...');
        
        // Inspect the DOM structure
        const domStructure = await page.evaluate(() => {
            const structure = {
                title: document.title,
                url: window.location.href,
                chatElements: {
                    container: !!document.querySelector('[data-testid="chat-container"]'),
                    input: !!document.querySelector('[data-testid="chat-input"]'),
                    sendButton: !!document.querySelector('[data-testid="send-button"]'),
                    messages: !!document.querySelector('[data-testid="chat-message"]'),
                    promptCards: !!document.querySelector('[data-testid="prompt-cards"]')
                },
                alternativeSelectors: {
                    contentEditable: !!document.querySelector('[contenteditable="true"]'),
                    submitButton: !!document.querySelector('button[type="submit"]'),
                    chatInput: !!document.querySelector('[data-chat-input="true"]'),
                    textareas: document.querySelectorAll('textarea').length,
                    inputs: document.querySelectorAll('input[type="text"]').length
                },
                allInteractiveElements: Array.from(document.querySelectorAll('button, input, textarea, [contenteditable]')).map(el => ({
                    tagName: el.tagName.toLowerCase(),
                    type: el.type || 'none',
                    id: el.id || 'none',
                    className: el.className || 'none',
                    testId: el.getAttribute('data-testid') || 'none',
                    placeholder: el.placeholder || 'none',
                    contentEditable: el.contentEditable || 'false'
                }))
            };
            
            return structure;
        });
        
        console.log('🔍 DOM Structure Analysis:');
        console.log(JSON.stringify(domStructure, null, 2));
        
        // Try to find chat input with multiple strategies
        let chatInput = null;
        let sendButton = null;
        
        const inputSelectors = [
            '[data-testid="chat-input"]',
            '[contenteditable="true"]',
            '[data-chat-input="true"]',
            'textarea[placeholder*="chat"]',
            'textarea[placeholder*="message"]',
            'textarea[placeholder*="type"]',
            'input[type="text"][placeholder*="chat"]',
            'input[type="text"][placeholder*="message"]',
            '.chat-input',
            '#chat-input'
        ];
        
        for (const selector of inputSelectors) {
            try {
                const element = await page.locator(selector).first();
                if (await element.isVisible({ timeout: 2000 })) {
                    chatInput = element;
                    console.log(`✅ Found chat input using selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }
        
        const buttonSelectors = [
            '[data-testid="send-button"]',
            'button[type="submit"]',
            'button:has-text("Send")',
            'button:has-text("Submit")',
            '.send-button',
            '#send-button'
        ];
        
        for (const selector of buttonSelectors) {
            try {
                const element = await page.locator(selector).first();
                if (await element.isVisible({ timeout: 2000 })) {
                    sendButton = element;
                    console.log(`✅ Found send button using selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }
        
        if (!chatInput) {
            console.log('❌ Could not find chat input element');
            
            // Take screenshot for debugging
            await page.screenshot({ 
                path: './test-recordings/02-no-input-found.png',
                fullPage: true 
            });
            
            return {
                success: false,
                error: 'Chat input not found',
                domStructure,
                networkLogs,
                consoleLogs,
                errors
            };
        }
        
        if (!sendButton) {
            console.log('❌ Could not find send button element');
        }
        
        console.log('💬 Testing message sending...');
        
        // Test messages that should trigger N8N workflows
        const testMessages = [
            'Find executive assistants at Fortune 500 companies in NYC',
            'Search for Gulfstream aircraft availability for charter',
            'Show me Apollo lead generation statistics',
            'Check avinode aircraft listings'
        ];
        
        for (let i = 0; i < testMessages.length; i++) {
            const message = testMessages[i];
            console.log(`\n📝 Testing message ${i + 1}: "${message}"`);
            
            // Clear previous content
            try {
                await chatInput.clear();
            } catch (e) {
                // If clear doesn't work, try other methods
                await chatInput.fill('');
            }
            
            // Type the message
            await chatInput.fill(message);
            
            // Take screenshot before sending
            await page.screenshot({ 
                path: `./test-recordings/03-${i + 1}-before-send.png`,
                fullPage: true 
            });
            
            const messagesBefore = await page.locator('[data-testid="chat-message"], .message, .chat-message').count();
            console.log(`📊 Messages before sending: ${messagesBefore}`);
            
            // Send the message
            if (sendButton) {
                await sendButton.click();
            } else {
                // Try Enter key
                await chatInput.press('Enter');
            }
            
            console.log('⏳ Waiting for response...');
            
            // Wait and monitor for changes
            const startTime = Date.now();
            const timeout = 15000; // 15 seconds
            let responded = false;
            
            while (Date.now() - startTime < timeout) {
                const messagesNow = await page.locator('[data-testid="chat-message"], .message, .chat-message').count();
                
                if (messagesNow > messagesBefore) {
                    console.log(`✅ New message detected! Messages count: ${messagesBefore} -> ${messagesNow}`);
                    responded = true;
                    break;
                }
                
                // Check for loading/typing indicators
                const hasLoadingIndicator = await page.locator('[data-testid="typing-indicator"], [data-testid="generating-status"], .loading, .typing').count() > 0;
                if (hasLoadingIndicator) {
                    console.log('🔄 Loading indicator detected');
                }
                
                await page.waitForTimeout(1000);
            }
            
            // Take screenshot after sending
            await page.screenshot({ 
                path: `./test-recordings/04-${i + 1}-after-send.png`,
                fullPage: true 
            });
            
            if (!responded) {
                console.log(`❌ No response received for message "${message}" within ${timeout}ms`);
            } else {
                console.log(`✅ Response received for message "${message}"`);
                
                // Try to extract response content
                try {
                    const allMessages = await page.locator('[data-testid="chat-message"], .message, .chat-message').allTextContents();
                    console.log('📋 All messages in chat:');
                    allMessages.forEach((msg, idx) => {
                        console.log(`  ${idx + 1}: ${msg.substring(0, 100)}...`);
                    });
                } catch (e) {
                    console.log(`⚠️ Could not extract message contents: ${e.message}`);
                }
            }
            
            // Brief pause between tests
            await page.waitForTimeout(2000);
        }
        
        // Final screenshot
        await page.screenshot({ 
            path: './test-recordings/05-final-state.png',
            fullPage: true 
        });
        
        console.log('\n📊 Test Summary:');
        console.log(`- Console logs: ${consoleLogs.length}`);
        console.log(`- Network requests: ${networkLogs.length}`);
        console.log(`- Errors: ${errors.length}`);
        
        // Filter for N8N-related network activity
        const n8nRequests = networkLogs.filter(log => 
            log.url?.includes('webhook') || 
            log.url?.includes('n8n') ||
            log.url?.includes('jetvision-agent')
        );
        
        console.log(`- N8N webhook calls: ${n8nRequests.length}`);
        
        if (n8nRequests.length > 0) {
            console.log('\n📡 N8N Network Activity:');
            n8nRequests.forEach((req, idx) => {
                console.log(`  ${idx + 1}. ${req.method} ${req.url} - Status: ${req.status || 'N/A'}`);
                if (req.body) {
                    console.log(`     Body: ${req.body.substring(0, 100)}...`);
                }
            });
        } else {
            console.log('\n❌ No N8N webhook calls detected - This indicates a problem!');
        }
        
        return {
            success: true,
            domStructure,
            networkLogs,
            consoleLogs,
            errors,
            n8nRequests,
            testResults: {
                chatInputFound: !!chatInput,
                sendButtonFound: !!sendButton,
                messagesProcessed: testMessages.length,
                n8nCallsDetected: n8nRequests.length
            }
        };
        
    } catch (error) {
        console.log(`🔥 Test failed with error: ${error.message}`);
        console.log(error.stack);
        
        // Take error screenshot
        try {
            await page.screenshot({ 
                path: './test-recordings/error-screenshot.png',
                fullPage: true 
            });
        } catch (e) {
            console.log('Could not take error screenshot');
        }
        
        return {
            success: false,
            error: error.message,
            stack: error.stack,
            networkLogs,
            consoleLogs,
            errors
        };
    } finally {
        console.log('\n🏁 Cleaning up...');
        await context.close();
        await browser.close();
    }
}

// Run the debug test
debugChatInterface()
    .then((result) => {
        const reportPath = './test-recordings/debug-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
        console.log(`\n📝 Debug report saved to: ${reportPath}`);
        
        if (result.success) {
            console.log('✅ Debug test completed successfully');
        } else {
            console.log('❌ Debug test completed with issues');
            console.log(`Error: ${result.error}`);
        }
    })
    .catch((error) => {
        console.error('🔥 Debug test crashed:', error);
        process.exit(1);
    });