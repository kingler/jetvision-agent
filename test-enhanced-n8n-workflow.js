#!/usr/bin/env node
/**
 * Test Enhanced N8N Workflow with Apollo.io Integration
 */

async function testEnhancedWorkflow() {
    console.log('🚀 Testing Enhanced N8N Workflow with Apollo.io');
    console.log('===============================================');

    const testMessage = {
        message: "Find me 3 executive assistants in New York",
        threadId: `test-${Date.now()}`,
        threadItemId: `item-${Date.now()}`,
        timestamp: new Date().toISOString(),
        context: {
            source: 'enhanced-test',
            useWebSearch: false,
            chatMode: 'jetvision-agent'
        }
    };

    try {
        console.log('\n📤 Sending executive assistant request...');
        console.log('Message:', testMessage.message);

        const response = await fetch('http://localhost:3000/api/n8n-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(testMessage),
        });

        if (!response.ok) {
            console.error('❌ Request failed:', response.status, await response.text());
            return;
        }

        console.log('✅ Response received, processing events...');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let events = [];
        let apolloDataReceived = false;

        let consecutiveEmptyReads = 0;
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            if (!value || value.length === 0) {
                consecutiveEmptyReads++;
                if (consecutiveEmptyReads >= 5) {
                    console.log('\\n⏰ Multiple empty reads, waiting a bit longer...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    consecutiveEmptyReads = 0;
                }
                continue;
            }
            consecutiveEmptyReads = 0;

            buffer += decoder.decode(value, { stream: true });
            const messages = buffer.split('\\n\\n');
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
                        
                        console.log(`\\n🎯 Event: ${eventType}`);
                        
                        if (eventType === 'status') {
                            const statusData = eventData.statusData || {};
                            console.log(`   📊 Progress: ${statusData.progress || 'N/A'}%`);
                            console.log(`   📍 Step: ${statusData.currentStep || 'unknown'}`);
                            console.log(`   💬 Message: ${statusData.message || eventData.message || 'No message'}`);
                        } else if (eventType === 'answer') {
                            console.log(`   ✅ Answer received!`);
                            console.log(`   📝 Text length: ${eventData.answer?.text?.length || 0} chars`);
                            
                            if (eventData.answer?.structured) {
                                console.log(`   🏗️  Structured data type: ${eventData.answer.structured.type}`);
                                if (eventData.answer.structured.type === 'apollo_leads') {
                                    apolloDataReceived = true;
                                    const leads = eventData.answer.structured.data?.leads || [];
                                    console.log(`   👥 Apollo leads found: ${leads.length}`);
                                    if (leads.length > 0) {
                                        console.log(`   👤 First lead: ${leads[0].name} - ${leads[0].title} at ${leads[0].company}`);
                                    }
                                }
                            }
                            
                            // Show preview of answer text
                            const preview = (eventData.answer?.text || '').substring(0, 200);
                            console.log(`   📄 Preview: ${preview}${preview.length >= 200 ? '...' : ''}`);
                        } else if (eventType === 'done') {
                            console.log(`   🏁 Status: ${eventData.status}`);
                            break;
                        }
                        
                    } catch (parseError) {
                        console.warn(`   ⚠️  Parse error:`, parseError.message);
                    }
                }
            }
        }

        console.log('\\n📊 Final Test Results:');
        console.log('=======================');
        
        const statusEvents = events.filter(e => e.type === 'status');
        const answerEvents = events.filter(e => e.type === 'answer');
        const doneEvents = events.filter(e => e.type === 'done');

        console.log(`Status updates: ${statusEvents.length}`);
        console.log(`Answer events: ${answerEvents.length}`);
        console.log(`Completion events: ${doneEvents.length}`);
        console.log(`Apollo.io data received: ${apolloDataReceived ? '✅ YES' : '❌ NO'}`);

        if (statusEvents.length >= 2) {
            console.log('✅ Progress feedback working correctly');
        } else {
            console.log('⚠️  Limited progress feedback');
        }

        if (apolloDataReceived) {
            console.log('✅ SUCCESS: Enhanced N8N workflow with Apollo.io integration working!');
            console.log('The chat interface should now display:');
            console.log('- Progress indicators during processing');
            console.log('- Structured Apollo.io lead data');
            console.log('- Professional formatting with contact details');
            console.log('- Actionable next steps and recommendations');
        } else {
            console.log('❌ Apollo.io structured data not detected');
        }

    } catch (error) {
        console.error('\\n💥 Test failed:', error.message);
    }
}

testEnhancedWorkflow().catch(console.error);