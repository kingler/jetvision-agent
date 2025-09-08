/**
 * TipTap + N8N Integration Test
 * This test specifically targets the TipTap editor and tests N8N webhook integration
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function testTipTapN8NIntegration() {
    console.log('🚁 Starting TipTap + N8N Integration Test...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500
    });
    
    const page = await browser.newPage();
    
    // Network monitoring with detailed logging
    const networkLogs = [];
    
    page.on('console', (msg) => {
        console.log(`💬 CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    
    page.on('request', (request) => {
        const log = {
            type: 'request',
            method: request.method(),
            url: request.url(),
            timestamp: new Date().toISOString(),
            headers: {} // Simplified - avoid async in event handler
        };
        
        if (request.method() === 'POST') {
            try {
                log.postData = request.postDataJSON();
                console.log(`🟦 POST REQUEST: ${request.url()}`);
                console.log(`📤 POST DATA:`, JSON.stringify(log.postData, null, 2));
            } catch (e) {
                log.postDataText = request.postData();
                console.log(`🟦 POST REQUEST: ${request.url()}`);
                console.log(`📤 POST DATA (text):`, log.postDataText);
            }
        }
        
        if (request.url().includes('webhook') || request.url().includes('n8n') || request.url().includes('api/chat')) {
            console.log(`🔵 POTENTIAL N8N: ${request.method()} ${request.url()}`);
        }
        
        networkLogs.push(log);
    });
    
    page.on('response', (response) => {
        const log = {
            type: 'response',
            status: response.status(),
            url: response.url(),
            timestamp: new Date().toISOString(),
            headers: {} // Simplified - avoid async in event handler
        };
        
        if (response.url().includes('webhook') || response.url().includes('n8n') || response.url().includes('api/chat')) {
            console.log(`🟢 N8N RESPONSE: ${response.status()} ${response.url()}`);
            
            // Note: body will be read later if needed
        }
        
        networkLogs.push(log);
    });
    
    try {
        console.log('🌐 Navigating to localhost:3000...');
        await page.goto('http://localhost:3000', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log('⏳ Waiting for page to fully load...');
        await page.waitForTimeout(3000);
        
        // Take initial screenshot
        await page.screenshot({ path: './test-recordings/tiptap-01-initial.png', fullPage: true });
        
        // Find TipTap editor specifically
        console.log('🔍 Looking for TipTap editor...');
        const tipTapSelector = '.tiptap.ProseMirror';
        
        try {
            await page.waitForSelector(tipTapSelector, { timeout: 5000 });
            console.log('✅ TipTap editor found!');
        } catch (e) {
            console.log('❌ TipTap editor not found, looking for alternatives...');
            
            // Check what content editable elements exist
            const contentEditableElements = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('[contenteditable="true"], .tiptap, .ProseMirror')).map(el => ({
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id,
                    contentEditable: el.contentEditable,
                    visible: el.offsetWidth > 0 && el.offsetHeight > 0
                }));
            });
            
            console.log('📋 Content editable elements found:', contentEditableElements);
            
            if (contentEditableElements.length === 0) {
                throw new Error('No content editable elements found');
            }
        }
        
        // Check for authentication requirement
        const needsAuth = await page.evaluate(() => {
            return document.body.textContent.includes('Log in') || document.body.textContent.includes('Sign up');
        });
        
        if (needsAuth) {
            console.log('🔐 Authentication required, but proceeding with test...');
        }
        
        // Find and interact with the TipTap editor
        const editor = page.locator(tipTapSelector).first();
        
        console.log('📝 Testing TipTap editor interaction...');
        
        // Focus on the editor
        await editor.click();
        await page.waitForTimeout(500);
        
        // Test different N8N-triggering messages
        const testMessages = [
            {
                message: 'Find executive assistants at Fortune 500 companies in NYC',
                expectedEndpoint: 'apollo',
                description: 'Apollo lead generation'
            },
            {
                message: 'Search for available Gulfstream aircraft for charter',
                expectedEndpoint: 'avinode',
                description: 'Avinode aircraft search'
            },
            {
                message: 'Generate weekly conversion report for private jet bookings',
                expectedEndpoint: 'analytics',
                description: 'Analytics workflow'
            }
        ];
        
        for (let i = 0; i < testMessages.length; i++) {
            const { message, expectedEndpoint, description } = testMessages[i];
            
            console.log(`\n🧪 Test ${i + 1}: ${description}`);
            console.log(`📝 Message: "${message}"`);
            
            // Clear editor
            await editor.click();
            await page.keyboard.press('Control+a');
            await page.keyboard.press('Delete');
            
            // Type message
            await editor.type(message);
            await page.waitForTimeout(500);
            
            // Take screenshot before sending
            await page.screenshot({ 
                path: `./test-recordings/tiptap-02-${i + 1}-before-send.png`, 
                fullPage: true 
            });
            
            // Look for send button (multiple strategies)
            const sendButtons = [
                'button[type="submit"]:visible',
                'button:has-text("Send"):visible',
                'button:has-text("Submit"):visible',
                '[data-testid="send-button"]:visible'
            ];
            
            let sendButton = null;
            for (const selector of sendButtons) {
                try {
                    const btn = page.locator(selector).first();
                    if (await btn.isVisible({ timeout: 1000 })) {
                        sendButton = btn;
                        console.log(`✅ Found send button: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Continue looking
                }
            }
            
            const networkBefore = networkLogs.length;
            console.log(`📊 Network requests before: ${networkBefore}`);
            
            // Send the message
            if (sendButton) {
                await sendButton.click();
                console.log('🚀 Message sent via button click');
            } else {
                // Try Enter key
                await editor.press('Enter');
                console.log('🚀 Message sent via Enter key');
            }
            
            // Wait for network activity
            console.log('⏳ Waiting for network activity...');
            await page.waitForTimeout(5000);
            
            const networkAfter = networkLogs.length;
            console.log(`📊 Network requests after: ${networkAfter}`);
            
            // Check for N8N-specific activity
            const recentLogs = networkLogs.slice(networkBefore);
            const n8nLogs = recentLogs.filter(log => 
                log.url.includes('webhook') || 
                log.url.includes('n8n') || 
                log.url.includes('jetvision-agent') ||
                log.url.includes('/api/chat') ||
                log.url.includes('/api/message')
            );
            
            console.log(`📡 N8N-related requests: ${n8nLogs.length}`);
            
            if (n8nLogs.length > 0) {
                console.log('🎉 N8N activity detected!');
                n8nLogs.forEach((log, idx) => {
                    console.log(`  ${idx + 1}. ${log.method || 'RESP'} ${log.url} ${log.status || ''}`);
                    if (log.postData) {
                        console.log(`     POST: ${JSON.stringify(log.postData)}`);
                    }
                    if (log.body) {
                        console.log(`     RESPONSE: ${log.body.substring(0, 100)}...`);
                    }
                });
            } else {
                console.log('❌ No N8N activity detected');
                
                // Log all recent requests for debugging
                console.log('📋 Recent network activity:');
                recentLogs.slice(-5).forEach((log, idx) => {
                    console.log(`  ${idx + 1}. ${log.method || 'RESP'} ${log.url} ${log.status || ''}`);
                });
            }
            
            // Check for UI changes
            const messagesAfter = await page.locator('[class*="message"], [data-testid*="message"], .chat-message').count();
            console.log(`💬 UI messages after sending: ${messagesAfter}`);
            
            // Take screenshot after sending
            await page.screenshot({ 
                path: `./test-recordings/tiptap-03-${i + 1}-after-send.png`, 
                fullPage: true 
            });
            
            console.log('---');
        }
        
        // Final analysis
        const allN8NLogs = networkLogs.filter(log => 
            log.url.includes('webhook') || 
            log.url.includes('n8n') || 
            log.url.includes('jetvision-agent') ||
            log.url.includes('/api/chat') ||
            log.url.includes('/api/message')
        );
        
        console.log('\n🔍 FINAL ANALYSIS:');
        console.log(`Total network requests: ${networkLogs.length}`);
        console.log(`N8N-related requests: ${allN8NLogs.length}`);
        
        if (allN8NLogs.length === 0) {
            console.log('🚨 CRITICAL: No N8N webhook calls detected!');
            console.log('   This indicates the frontend is NOT integrated with N8N workflows.');
            
            // Look for API endpoints that might be used instead
            const apiLogs = networkLogs.filter(log => log.url.includes('/api/'));
            console.log(`📡 API endpoint calls detected: ${apiLogs.length}`);
            
            if (apiLogs.length > 0) {
                console.log('🔍 API endpoints called:');
                [...new Set(apiLogs.map(log => log.url))].forEach(url => {
                    console.log(`  - ${url}`);
                });
            }
        } else {
            console.log('✅ N8N integration detected');
            allN8NLogs.forEach((log, idx) => {
                console.log(`  ${idx + 1}. ${log.method || 'RESP'} ${log.url}`);
            });
        }
        
        return {
            success: true,
            totalNetworkRequests: networkLogs.length,
            n8nRequests: allN8NLogs.length,
            networkLogs: networkLogs,
            testResults: {
                tipTapEditorFound: true,
                messagesAttempted: testMessages.length,
                n8nIntegrationWorking: allN8NLogs.length > 0
            }
        };
        
    } catch (error) {
        console.log(`🔥 Test failed: ${error.message}`);
        
        try {
            await page.screenshot({ path: './test-recordings/tiptap-error.png', fullPage: true });
        } catch (e) {}
        
        return {
            success: false,
            error: error.message,
            networkLogs: networkLogs
        };
    } finally {
        await browser.close();
    }
}

// Run the test
testTipTapN8NIntegration()
    .then((result) => {
        fs.writeFileSync('./test-recordings/tiptap-n8n-report.json', JSON.stringify(result, null, 2));
        console.log('\n📝 Test report saved to: ./test-recordings/tiptap-n8n-report.json');
        
        if (result.success) {
            if (result.testResults.n8nIntegrationWorking) {
                console.log('✅ N8N integration is working!');
            } else {
                console.log('❌ N8N integration is NOT working!');
                console.log('   - Messages are being typed into TipTap editor');
                console.log('   - But no webhook calls to N8N are being made');
                console.log('   - This suggests a configuration or implementation issue');
            }
        } else {
            console.log(`❌ Test failed: ${result.error}`);
        }
    })
    .catch(console.error);