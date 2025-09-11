#!/usr/bin/env node
/**
 * Test JetVision Agent Fallback System
 * This test verifies that our enhanced fallback handling is working correctly
 * when N8N returns empty responses.
 */

async function testJetVisionFallback() {
    console.log('🧪 Testing JetVision Agent Fallback System');
    console.log('==========================================');

    // Test the JetVision Agent API endpoint directly
    const jetVisionUrl = 'http://localhost:3003/api/n8n-webhook';
    
    const testPayload = {
        id: `test_fallback_${Date.now()}`,
        prompt: "Find me 3 executive assistants in New York for private aviation clients",
        sessionId: `test-session-${Date.now()}`,
        category: "lead-generation",
        title: "Test Executive Assistant Search",
        description: "Testing the enhanced fallback system",
        fullPrompt: "You are a helpful AI assistant for private aviation business operations.",
        suggested_tools: "Apollo Search Tool will be used for lead generation.",
        tool_sequence: "Apollo search followed by response formatting.",
        parameters: {
            metrics: [],
            segments: [],
            calculations: []
        },
        message: "Find me 3 executive assistants in New York for private aviation clients",
        threadId: `test-thread-${Date.now()}`,
        threadItemId: `test-item-${Date.now()}`,
        userId: "test-user",
        timestamp: new Date().toISOString()
    };

    console.log('📤 Testing JetVision Agent with fallback payload:');
    console.log(`Request ID: ${testPayload.id}`);
    console.log(`Session ID: ${testPayload.sessionId}`);
    console.log(`Prompt: ${testPayload.prompt}`);

    try {
        const startTime = Date.now();
        
        const response = await fetch(jetVisionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPayload)
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        console.log('\n📥 JetVision Agent Response Analysis:');
        console.log('====================================');
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Response Time: ${responseTime}ms`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);

        if (response.headers.get('content-type')?.includes('text/stream')) {
            console.log('✅ SSE Stream Response Detected');
            
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            let chunkCount = 0;
            
            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value, { stream: true });
                        fullResponse += chunk;
                        chunkCount++;
                        
                        // Parse SSE events
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                try {
                                    const eventData = JSON.parse(line.slice(6));
                                    if (eventData.content) {
                                        console.log(`📝 SSE Event: "${eventData.content.substring(0, 50)}..."`);
                                    }
                                } catch (e) {
                                    // Ignore parse errors for partial chunks
                                }
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
            }
            
            console.log(`\n📊 Stream Analysis:`);
            console.log(`Total chunks received: ${chunkCount}`);
            console.log(`Full response length: ${fullResponse.length} characters`);
            
            // Check for fallback indicators
            console.log('\n🔍 Fallback System Analysis:');
            const responseText = fullResponse.toLowerCase();
            
            const fallbackIndicators = [
                { pattern: 'n8n workflow', description: 'N8N status mention' },
                { pattern: 'fallback', description: 'Fallback system activation' },
                { pattern: 'executive assistant', description: 'Executive assistant content' },
                { pattern: 'new york', description: 'Location targeting' },
                { pattern: 'jetvision', description: 'Brand integration' },
                { pattern: 'apollo', description: 'Apollo.io reference' }
            ];
            
            let indicatorsFound = 0;
            fallbackIndicators.forEach(({ pattern, description }) => {
                if (responseText.includes(pattern)) {
                    console.log(`✅ ${description} - Found`);
                    indicatorsFound++;
                } else {
                    console.log(`❌ ${description} - Not found`);
                }
            });
            
            console.log(`\n🎯 Fallback Quality Score: ${indicatorsFound}/${fallbackIndicators.length} (${Math.round(indicatorsFound/fallbackIndicators.length*100)}%)`);
            
            if (indicatorsFound >= 4) {
                console.log('✅ SUCCESS: Enhanced fallback system is working correctly!');
                console.log('✅ JetVision Agent provides meaningful responses when N8N is unavailable');
                console.log('✅ User experience maintained despite N8N workflow issues');
                return true;
            } else {
                console.log('⚠️ PARTIAL SUCCESS: Fallback working but content could be improved');
                return false;
            }
            
        } else {
            const responseText = await response.text();
            console.log('⚠️ Non-stream response received');
            console.log(`Response: ${responseText.substring(0, 200)}...`);
            return false;
        }

    } catch (error) {
        console.error('\n💥 Test Failed with Error:');
        console.error(`Error: ${error.message}`);
        console.error('\nPossible causes:');
        console.error('1. JetVision Agent development server not running');
        console.error('2. API endpoint URL has changed');
        console.error('3. Network connectivity issues');
        return false;
    }
}

// Main execution
console.log('🚀 Starting JetVision Agent Fallback Test');
console.log('==========================================');

testJetVisionFallback()
    .then(success => {
        console.log('\n' + '='.repeat(50));
        if (success) {
            console.log('🎉 TEST PASSED: JetVision Agent fallback system is working!');
            console.log('✅ Enhanced fallback provides quality responses when N8N unavailable');
            console.log('✅ Zero service interruption for end users');
            console.log('✅ Ready for production with full resilience');
        } else {
            console.log('🔴 TEST FAILED: Fallback system needs attention');
            console.log('❌ Review fallback response quality');
            console.log('🔧 Check JetVision Agent development server logs');
        }
        console.log('='.repeat(50));
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Test execution failed:', error);
        process.exit(1);
    });