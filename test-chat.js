// Test script for JetVision chat integration with n8n
// Run this in the browser console at http://localhost:3000/chat

async function testJetVisionChat() {
    console.log('Testing JetVision n8n integration...');
    
    // Test message
    const testMessage = "Hello, I need help finding executive contacts in the aviation industry using Apollo.io";
    
    try {
        const response = await fetch('/api/completion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: testMessage,
                mode: 'concise',
                threadId: 'test-' + Date.now(),
                threadItemId: 'item-' + Date.now(),
                parentThreadItemId: null,
                messages: [
                    {
                        role: 'user',
                        content: testMessage
                    }
                ],
                webSearch: false,
                showSuggestions: false,
                mcpConfig: {}
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Error response:', error);
            return;
        }

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete events
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
                if (line.startsWith('event:')) {
                    const eventType = line.substring(6).trim();
                    console.log('Event:', eventType);
                }
                if (line.startsWith('data:')) {
                    try {
                        const data = JSON.parse(line.substring(5));
                        console.log('Data:', data);
                    } catch (e) {
                        // Not JSON, might be heartbeat
                    }
                }
            }
        }
        
        console.log('Test complete!');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Instructions:
console.log(`
===========================================
JetVision n8n Integration Test
===========================================
1. Open http://localhost:3000/chat in your browser
2. Open the browser console (F12)
3. Copy and paste this entire script
4. Run: testJetVisionChat()
5. Watch the console for responses

The test will send a message to the n8n webhook
and display the response in the console.
===========================================
`);

// Export for browser
if (typeof window !== 'undefined') {
    window.testJetVisionChat = testJetVisionChat;
}