/**
 * Simple JetVision Debug Test
 * This test will connect to the UI and analyze the structure without authentication complexity
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function simpleDebug() {
    console.log('🚁 Starting Simple JetVision Debug Test...\n');
    
    const browser = await chromium.launch({ 
        headless: false, // Visible browser for debugging
        timeout: 60000
    });
    
    const page = await browser.newPage();
    
    // Track all network activity
    const networkLogs = [];
    
    page.on('request', (request) => {
        networkLogs.push({
            type: 'request',
            method: request.method(),
            url: request.url(),
            timestamp: new Date().toISOString()
        });
        
        if (request.url().includes('webhook') || request.url().includes('n8n')) {
            console.log(`🔵 OUTGOING: ${request.method()} ${request.url()}`);
        }
    });
    
    page.on('response', (response) => {
        networkLogs.push({
            type: 'response',
            status: response.status(),
            url: response.url(),
            timestamp: new Date().toISOString()
        });
        
        if (response.url().includes('webhook') || response.url().includes('n8n')) {
            console.log(`🟢 RESPONSE: ${response.status()} ${response.url()}`);
        }
    });
    
    page.on('console', (msg) => {
        console.log(`📝 CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    
    try {
        console.log('🌐 Navigating to localhost:3000...');
        
        // Use a more lenient timeout and load strategy
        await page.goto('http://localhost:3000', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        // Wait a bit for any dynamic content
        await page.waitForTimeout(3000);
        
        console.log('📸 Taking screenshot...');
        await page.screenshot({ path: './test-recordings/page-screenshot.png', fullPage: true });
        
        // Get basic page info
        const pageInfo = await page.evaluate(() => ({
            title: document.title,
            url: window.location.href,
            hasAuthError: document.body.textContent.includes('sign') || document.body.textContent.includes('auth') || document.body.textContent.includes('login'),
            interactiveElements: Array.from(document.querySelectorAll('button, input, textarea, [contenteditable="true"]')).map(el => ({
                tag: el.tagName.toLowerCase(),
                type: el.type || null,
                id: el.id || null,
                className: el.className || null,
                placeholder: el.placeholder || null,
                textContent: el.textContent?.substring(0, 50) || null,
                visible: !el.hidden && el.offsetWidth > 0 && el.offsetHeight > 0
            })),
            allText: document.body.textContent.substring(0, 500)
        }));
        
        console.log('\n📊 Page Analysis:');
        console.log(`Title: ${pageInfo.title}`);
        console.log(`URL: ${pageInfo.url}`);
        console.log(`Possible auth issue: ${pageInfo.hasAuthError}`);
        console.log(`Interactive elements found: ${pageInfo.interactiveElements.length}`);
        
        console.log('\n🔍 Interactive Elements:');
        pageInfo.interactiveElements.forEach((el, idx) => {
            console.log(`  ${idx + 1}. ${el.tag}${el.type ? `[${el.type}]` : ''} - ${el.className || 'no class'} - Visible: ${el.visible}`);
            if (el.placeholder) console.log(`     Placeholder: ${el.placeholder}`);
            if (el.textContent && el.textContent.trim()) console.log(`     Text: ${el.textContent}`);
        });
        
        console.log('\n📄 First 500 chars of page content:');
        console.log(pageInfo.allText);
        
        // Look for potential chat inputs more broadly
        console.log('\n🔍 Looking for potential chat elements...');
        
        const chatElements = await page.evaluate(() => {
            const elements = [];
            
            // Look for various input types
            document.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(el => {
                const text = (el.placeholder || el.className || el.id || '').toLowerCase();
                if (text.includes('message') || text.includes('chat') || text.includes('type') || text.includes('search') || text.includes('input')) {
                    elements.push({
                        selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ')[0] : ''),
                        placeholder: el.placeholder,
                        className: el.className,
                        id: el.id,
                        visible: !el.hidden && el.offsetWidth > 0 && el.offsetHeight > 0,
                        contentEditable: el.contentEditable
                    });
                }
            });
            
            return elements;
        });
        
        console.log('💬 Potential Chat Elements:', chatElements);
        
        // If we found chat elements, try to interact with them
        if (chatElements.length > 0) {
            console.log('\n🧪 Testing chat interaction...');
            
            for (const chatEl of chatElements.slice(0, 3)) { // Test first 3 elements
                try {
                    console.log(`Testing element: ${chatEl.selector}`);
                    
                    // Try multiple selector strategies
                    let element;
                    if (chatEl.id) {
                        element = page.locator(`#${chatEl.id}`);
                    } else if (chatEl.className) {
                        element = page.locator(`.${chatEl.className.split(' ')[0]}`);
                    } else {
                        element = page.locator(chatEl.selector);
                    }
                    
                    // Check if element is visible and interactable
                    if (await element.isVisible({ timeout: 2000 })) {
                        console.log('  ✅ Element is visible, attempting interaction...');
                        
                        // Try to focus and type
                        await element.focus();
                        await element.fill('Test message for N8N integration');
                        
                        console.log('  📝 Text entered successfully');
                        
                        // Look for send button nearby
                        const sendButton = await page.locator('button:has-text("Send"), button[type="submit"], button:near(:focus)').first();
                        
                        if (await sendButton.isVisible({ timeout: 1000 })) {
                            console.log('  🔘 Found send button, clicking...');
                            
                            const networkBefore = networkLogs.length;
                            await sendButton.click();
                            
                            // Wait and check for network activity
                            await page.waitForTimeout(5000);
                            
                            const networkAfter = networkLogs.length;
                            console.log(`  📊 Network activity: ${networkBefore} -> ${networkAfter} requests`);
                            
                            // Check for new elements in the UI
                            const messagesAfter = await page.locator('[class*="message"], [data-testid*="message"], .chat-message, .message').count();
                            console.log(`  💬 Message elements found: ${messagesAfter}`);
                            
                            break; // Successfully tested one element
                        } else {
                            console.log('  ⚠️ No send button found');
                        }
                    } else {
                        console.log('  ❌ Element not visible');
                    }
                } catch (error) {
                    console.log(`  ❌ Error testing element: ${error.message}`);
                }
            }
        } else {
            console.log('❌ No potential chat elements found');
        }
        
        // Take final screenshot
        await page.screenshot({ path: './test-recordings/final-screenshot.png', fullPage: true });
        
        // Filter N8N related network logs
        const n8nLogs = networkLogs.filter(log => 
            log.url.includes('webhook') || 
            log.url.includes('n8n') || 
            log.url.includes('jetvision-agent')
        );
        
        console.log(`\n📡 N8N Network Activity: ${n8nLogs.length} requests`);
        n8nLogs.forEach((log, idx) => {
            console.log(`  ${idx + 1}. ${log.type.toUpperCase()}: ${log.method || ''} ${log.url} ${log.status || ''}`);
        });
        
        return {
            success: true,
            pageInfo,
            chatElements,
            networkLogs,
            n8nLogs: n8nLogs.length
        };
        
    } catch (error) {
        console.log(`🔥 Error: ${error.message}`);
        
        // Try to take an error screenshot
        try {
            await page.screenshot({ path: './test-recordings/error-screenshot.png', fullPage: true });
        } catch (e) {}
        
        return {
            success: false,
            error: error.message
        };
    } finally {
        await browser.close();
    }
}

// Run the test
simpleDebug()
    .then((result) => {
        fs.writeFileSync('./test-recordings/simple-debug-report.json', JSON.stringify(result, null, 2));
        console.log('\n📝 Report saved to: ./test-recordings/simple-debug-report.json');
        
        if (result.success) {
            console.log('✅ Simple debug test completed');
            if (result.n8nLogs === 0) {
                console.log('⚠️ WARNING: No N8N network activity detected!');
                console.log('   This suggests the frontend is not communicating with N8N webhooks.');
            }
        } else {
            console.log(`❌ Test failed: ${result.error}`);
        }
    })
    .catch(console.error);