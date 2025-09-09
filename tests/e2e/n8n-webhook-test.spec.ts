import { test, expect, Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 120000; // 2 minutes for full test
const RESPONSE_TIMEOUT = 60000; // 1 minute for AI response

// Screenshot directory
const SCREENSHOTS_DIR = join(__dirname, '../../screenshots/n8n-tests');

// Helper function to ensure screenshot directory exists
function ensureScreenshotDir() {
    try {
        mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    } catch (error) {
        // Directory might already exist, ignore error
    }
}

// Helper function to take and save screenshot
async function takeScreenshot(page: Page, name: string, description?: string) {
    ensureScreenshotDir();
    const filename = `${Date.now()}-${name}.png`;
    const filepath = join(SCREENSHOTS_DIR, filename);
    
    await page.screenshot({ 
        path: filepath, 
        fullPage: true 
    });
    
    console.log(`📸 Screenshot saved: ${filename}`);
    if (description) {
        console.log(`   Description: ${description}`);
    }
    
    return filepath;
}

// Helper function to wait for network idle (no pending requests)
async function waitForNetworkIdle(page: Page, timeout = 10000) {
    await page.waitForLoadState('networkidle', { timeout });
}

// Helper function to clear the chat input
async function clearChatInput(page: Page) {
    // Find the chat editor and clear it
    const chatEditor = page.locator('[data-testid="chat-editor"], .ProseMirror, [role="textbox"]').first();
    await chatEditor.click();
    
    // Clear existing content using keyboard shortcuts
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Wait a moment for the clear to take effect
    await page.waitForTimeout(500);
}

// Helper function to type in the chat input with realistic timing
async function typeInChatInput(page: Page, text: string) {
    const chatEditor = page.locator('[data-testid="chat-editor"], .ProseMirror, [role="textbox"]').first();
    
    // Focus on the editor
    await chatEditor.click();
    
    // Type with realistic delay between characters
    await chatEditor.type(text, { delay: 50 });
    
    // Wait for the text to be processed
    await page.waitForTimeout(1000);
}

// Helper function to submit the chat message
async function submitMessage(page: Page) {
    // Look for the send button (multiple possible selectors)
    const sendButton = page.locator('button[type="submit"], button:has-text("Send"), [data-testid="send-button"]').first();
    
    // Alternative: use Enter key if send button isn't found
    try {
        await expect(sendButton).toBeVisible({ timeout: 5000 });
        await sendButton.click();
    } catch {
        // Fallback: use keyboard shortcut
        await page.keyboard.press('Enter');
    }
}

// Helper function to wait for response and extract content
async function waitForResponse(page: Page, timeout = RESPONSE_TIMEOUT) {
    console.log('⏳ Waiting for AI response...');
    
    // Wait for loading indicators to disappear
    await page.waitForSelector('[data-testid="generating-status"], .animate-pulse', { 
        state: 'detached', 
        timeout: timeout 
    });
    
    // Wait for response content to appear
    await page.waitForSelector('[data-testid="message-content"], [data-testid="thread-item"]', { 
        timeout: timeout 
    });
    
    // Additional wait for content to fully load
    await page.waitForTimeout(2000);
}

test.describe('JetVision Agent N8N Webhook Integration', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(TEST_TIMEOUT);
        
        // Navigate to the application
        console.log(`🌐 Navigating to ${BASE_URL}...`);
        await page.goto(BASE_URL);
        
        // Wait for page to load completely
        await waitForNetworkIdle(page);
        
        // Take initial screenshot
        await takeScreenshot(page, 'initial-load', 'Application loaded successfully');
    });

    test('should load the JetVision Agent application and display chat interface', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle(/JetVision|Chat/i);
        
        // Verify greeting is displayed
        const greeting = page.locator('h1:has-text("JetVision Agent")');
        await expect(greeting).toBeVisible();
        
        // Verify chat input is present
        const chatInput = page.locator('[data-chat-input="true"]');
        await expect(chatInput).toBeVisible();
        
        // Take screenshot of loaded interface
        await takeScreenshot(page, 'interface-loaded', 'Chat interface is visible and ready');
        
        console.log('✅ Chat interface loaded successfully');
    });

    test('should submit lead generation prompt and receive meaningful response', async ({ page }) => {
        // Test prompt for lead generation
        const testPrompt = "Find executive assistants at Fortune 500 companies in New York";
        
        console.log(`📝 Testing prompt: "${testPrompt}"`);
        
        // Clear any existing input
        await clearChatInput(page);
        
        // Type the test prompt
        await typeInChatInput(page, testPrompt);
        
        // Take screenshot before submission
        await takeScreenshot(page, 'prompt-entered', `Prompt entered: ${testPrompt}`);
        
        // Submit the message
        console.log('📤 Submitting message...');
        await submitMessage(page);
        
        // Take screenshot after submission
        await takeScreenshot(page, 'message-submitted', 'Message submitted, waiting for response');
        
        // Wait for response
        await waitForResponse(page);
        
        // Take screenshot of response
        await takeScreenshot(page, 'response-received', 'Response received from N8N webhook');
        
        // Verify response content
        const responseElements = await page.locator('[data-testid="message-content"], [data-testid="thread-item"], .message-content').all();
        let responseText = '';
        
        for (const element of responseElements) {
            const text = await element.textContent();
            if (text && text.trim().length > 0) {
                responseText += text + ' ';
            }
        }
        
        responseText = responseText.trim();
        console.log(`📄 Response received (${responseText.length} characters):`, responseText.substring(0, 200) + '...');
        
        // Verify response is not empty
        expect(responseText).not.toBe('');
        expect(responseText.length).toBeGreaterThan(10);
        
        // Verify response is not the generic "Empty response received" error
        expect(responseText.toLowerCase()).not.toContain('empty response received');
        expect(responseText.toLowerCase()).not.toContain('no data available');
        
        // Verify response contains relevant business intelligence terms
        const hasBusinessTerms = 
            responseText.toLowerCase().includes('executive') ||
            responseText.toLowerCase().includes('assistant') ||
            responseText.toLowerCase().includes('fortune') ||
            responseText.toLowerCase().includes('company') ||
            responseText.toLowerCase().includes('contact') ||
            responseText.toLowerCase().includes('lead') ||
            responseText.toLowerCase().includes('business') ||
            responseText.toLowerCase().includes('apollo');
        
        expect(hasBusinessTerms).toBe(true);
        
        console.log('✅ Response contains meaningful business intelligence data');
        
        // Take final screenshot
        await takeScreenshot(page, 'test-completed', 'Test completed successfully with meaningful response');
    });

    test('should handle complex lead generation queries', async ({ page }) => {
        const complexPrompt = "Generate a list of C-suite executives at technology companies in San Francisco with 100-500 employees, including their contact information and company details";
        
        console.log(`📝 Testing complex prompt: "${complexPrompt}"`);
        
        // Clear and enter complex prompt
        await clearChatInput(page);
        await typeInChatInput(page, complexPrompt);
        
        // Submit and wait for response
        await submitMessage(page);
        await takeScreenshot(page, 'complex-prompt-submitted', 'Complex lead generation prompt submitted');
        
        await waitForResponse(page);
        
        // Verify response
        const responseContent = await page.locator('body').textContent();
        
        expect(responseContent).not.toContain('Empty response received');
        expect(responseContent).not.toContain('error occurred');
        
        // Verify it contains structured data indicators
        const hasStructuredData = 
            responseContent?.toLowerCase().includes('executives') ||
            responseContent?.toLowerCase().includes('technology') ||
            responseContent?.toLowerCase().includes('san francisco') ||
            responseContent?.toLowerCase().includes('contact') ||
            responseContent?.toLowerCase().includes('company');
        
        expect(hasStructuredData).toBe(true);
        
        await takeScreenshot(page, 'complex-response', 'Complex query response received');
        
        console.log('✅ Complex lead generation query handled successfully');
    });

    test('should verify N8N webhook connectivity', async ({ page }) => {
        console.log('🔗 Testing N8N webhook connectivity...');
        
        // Monitor network requests to the webhook
        const webhookRequests: any[] = [];
        
        page.on('request', (request) => {
            if (request.url().includes('n8n-webhook') || request.url().includes('webhook')) {
                webhookRequests.push({
                    url: request.url(),
                    method: request.method(),
                    headers: request.headers(),
                });
                console.log(`📡 Webhook request detected: ${request.method()} ${request.url()}`);
            }
        });
        
        // Submit a simple test message
        const testMessage = "Test N8N webhook connectivity";
        await clearChatInput(page);
        await typeInChatInput(page, testMessage);
        await submitMessage(page);
        
        // Wait for webhook calls
        await page.waitForTimeout(5000);
        
        // Verify webhook was called
        expect(webhookRequests.length).toBeGreaterThan(0);
        console.log(`✅ ${webhookRequests.length} webhook request(s) detected`);
        
        // Wait for response
        await waitForResponse(page);
        
        await takeScreenshot(page, 'webhook-test', 'Webhook connectivity test completed');
    });

    test.afterEach(async ({ page }, testInfo) => {
        // Take final screenshot regardless of test result
        const status = testInfo.status;
        await takeScreenshot(page, `final-${status}`, `Test completed with status: ${status}`);
        
        if (status === 'failed') {
            console.log('❌ Test failed - check screenshots for debugging');
        } else {
            console.log('✅ Test completed successfully');
        }
    });
});