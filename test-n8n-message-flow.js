#!/usr/bin/env node
/**
 * Test N8N Message Flow
 * This script tests the end-to-end message flow from frontend to N8N workflow
 */

async function testN8nMessageFlow() {
    console.log('🚀 Testing N8N Message Flow End-to-End');
    console.log('======================================');

    const testMessage = {
        message: "Find me 3 executive assistants in New York",
        threadId: `test-${Date.now()}`,
        threadItemId: `item-${Date.now()}`,
        timestamp: new Date().toISOString(),
        context: {
            source: 'test-script',
            useWebSearch: false,
            chatMode: 'jetvision-agent'
        }
    };

    try {
        console.log('\n📤 Sending test message to N8N webhook...');
        console.log('Message:', testMessage);

        const response = await fetch('http://localhost:3000/api/n8n-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(testMessage),
        });

        console.log('\n📡 Response Status:', response.status, response.statusText);
        console.log('📡 Response Headers:');
        for (const [key, value] of response.headers.entries()) {
            console.log(`  ${key}: ${value}`);
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Request failed:', errorText);
            return;
        }

        console.log('\n📥 Processing Server-Sent Events...');
        
        // Check if it's SSE
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('text/event-stream')) {
            console.warn('⚠️  Response is not Server-Sent Events');
            const text = await response.text();
            console.log('Raw response:', text);
            return;
        }

        // Process SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let eventCount = 0;
        let hasAnswer = false;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const messages = buffer.split('\n\n');
            buffer = messages.pop() || '';

            for (const message of messages) {
                if (!message.trim()) continue;
                eventCount++;

                const eventMatch = message.match(/^event: (.+)$/m);
                const dataMatch = message.match(/^data: (.+)$/m);

                if (eventMatch && dataMatch) {
                    const eventType = eventMatch[1];
                    
                    try {
                        const eventData = JSON.parse(dataMatch[1]);
                        
                        console.log(`\n🎯 Event ${eventCount}: ${eventType}`);
                        
                        if (eventType === 'status') {
                            console.log('   Status:', eventData.status || eventData.message);
                            if (eventData.statusData) {
                                console.log('   Progress:', eventData.statusData.progress + '%');
                                console.log('   Step:', eventData.statusData.currentStep);
                            }
                        } else if (eventType === 'answer') {
                            hasAnswer = true;
                            console.log('   ✅ Answer received!');
                            console.log('   Text length:', eventData.answer?.text?.length || 0);
                            console.log('   Text preview:', (eventData.answer?.text || '').substring(0, 100) + '...');
                            if (eventData.answer?.structured) {
                                console.log('   Structured data:', eventData.answer.structured.type);
                            }
                        } else if (eventType === 'done') {
                            console.log('   🏁 Stream completed');
                            console.log('   Status:', eventData.status);
                            break;
                        } else if (eventType === 'error') {
                            console.log('   ❌ Error:', eventData.error);
                        } else {
                            console.log('   Data keys:', Object.keys(eventData));
                        }
                        
                    } catch (parseError) {
                        console.warn('   ⚠️  Failed to parse event data:', parseError.message);
                        console.log('   Raw data:', dataMatch[1]);
                    }
                } else {
                    console.log(`\n📄 Raw message ${eventCount}:`, message.substring(0, 200));
                }
            }
        }

        console.log('\n📊 Test Results:');
        console.log('================');
        console.log('Total events processed:', eventCount);
        console.log('Answer event received:', hasAnswer ? '✅ YES' : '❌ NO');
        
        if (!hasAnswer) {
            console.log('\n🔍 ISSUE IDENTIFIED:');
            console.log('No answer event was received from the N8N workflow.');
            console.log('This explains why responses are not displaying in the chat interface.');
        }

    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testN8nMessageFlow().catch(console.error);