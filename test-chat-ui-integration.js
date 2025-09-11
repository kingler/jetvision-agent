#!/usr/bin/env node
/**
 * Test Chat UI Integration
 * This script tests if the chat UI can properly process N8N responses
 */

async function testChatUIIntegration() {
    console.log('🎯 Testing Chat UI Integration with N8N Responses');
    console.log('==================================================');

    const testMessage = {
        message: "Test message for chat integration",
        threadId: `ui-test-${Date.now()}`,
        threadItemId: `ui-item-${Date.now()}`,
        timestamp: new Date().toISOString(),
    };

    try {
        console.log('\n📤 Testing full chat flow through N8N webhook API...');
        
        const response = await fetch('http://localhost:3000/api/n8n-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(testMessage),
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            console.error('❌ Request failed:', await response.text());
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let events = [];

        console.log('\n📥 Processing events from N8N workflow...');

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const messages = buffer.split('\n\n');
            buffer = messages.pop() || '';

            for (const message of messages) {
                if (!message.trim()) continue;

                const eventMatch = message.match(/^event: (.+)$/m);
                const dataMatch = message.match(/^data: (.+)$/m);

                if (eventMatch && dataMatch) {
                    const eventType = eventMatch[1];
                    
                    try {
                        const eventData = JSON.parse(dataMatch[1]);
                        events.push({ type: eventType, data: eventData });
                        
                        console.log(`✅ Event: ${eventType}`);
                        
                        if (eventType === 'answer') {
                            console.log(`   💬 Answer text: "${eventData.answer?.text}"`);
                            console.log(`   📊 Has structured data: ${!!eventData.answer?.structured}`);
                        } else if (eventType === 'done') {
                            console.log(`   🏁 Complete with status: ${eventData.status}`);
                            break;
                        }
                        
                    } catch (parseError) {
                        console.warn(`   ⚠️  Parse error:`, parseError.message);
                    }
                }
            }
        }

        console.log('\n📋 Final Assessment:');
        console.log('====================');
        
        const statusEvents = events.filter(e => e.type === 'status');
        const answerEvents = events.filter(e => e.type === 'answer');
        const doneEvents = events.filter(e => e.type === 'done');

        console.log(`Status updates: ${statusEvents.length}`);
        console.log(`Answer events: ${answerEvents.length}`);
        console.log(`Completion events: ${doneEvents.length}`);

        if (answerEvents.length > 0) {
            console.log('\n✅ SUCCESS: N8N workflow integration is working correctly!');
            console.log('The chat interface should be displaying responses from the N8N workflow.');
            console.log('\nAnswer received:', answerEvents[0].data.answer?.text);
        } else {
            console.log('\n❌ ISSUE: No answer events received from N8N workflow');
        }

        if (doneEvents.length > 0 && doneEvents[0].data.status === 'success') {
            console.log('✅ Workflow completed successfully');
        }

    } catch (error) {
        console.error('\n💥 Integration test failed:', error.message);
    }
}

testChatUIIntegration().catch(console.error);