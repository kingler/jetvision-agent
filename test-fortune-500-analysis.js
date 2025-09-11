#!/usr/bin/env node
/**
 * Test Enhanced N8N Workflow with Fortune 500 Strategic Analysis
 */

async function testFortune500Analysis() {
    console.log('🎯 Testing Enhanced N8N Workflow with Fortune 500 Analysis');
    console.log('=========================================================');

    const testMessage = {
        message: "As a JetVision enterprise account strategist, map the complete decision-making unit for private aviation at Fortune 500 companies",
        threadId: `test-${Date.now()}`,
        threadItemId: `item-${Date.now()}`,
        timestamp: new Date().toISOString(),
        context: {
            source: 'fortune-500-analysis-test',
            useWebSearch: false,
            chatMode: 'jetvision-agent'
        }
    };

    try {
        console.log('\n📤 Sending Fortune 500 decision-making analysis request...');
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
        let businessAnalysisReceived = false;

        let consecutiveEmptyReads = 0;
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            if (!value || value.length === 0) {
                consecutiveEmptyReads++;
                if (consecutiveEmptyReads >= 5) {
                    console.log('\n⏰ Multiple empty reads, waiting a bit longer...');
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
                        
                        console.log(`\n🎯 Event: ${eventType}`);
                        
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
                                if (eventData.answer.structured.type === 'business_analysis') {
                                    businessAnalysisReceived = true;
                                    const analysisData = eventData.answer.structured.data || {};
                                    console.log(`   📊 Analysis Type: ${analysisData.analysisType}`);
                                    console.log(`   🏢 Industry: ${analysisData.industry}`);
                                    console.log(`   🎯 Scope: ${analysisData.scope}`);
                                    if (analysisData.keyFindings && analysisData.keyFindings.length > 0) {
                                        console.log(`   🔍 Key Findings: ${analysisData.keyFindings.length} insights`);
                                        console.log(`   📌 First finding: ${analysisData.keyFindings[0]}`);
                                    }
                                }
                            }
                            
                            // Show preview of answer text
                            const preview = (eventData.answer?.text || '').substring(0, 300);
                            console.log(`   📄 Preview: ${preview}${preview.length >= 300 ? '...' : ''}`);
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

        console.log('\n📊 Final Test Results:');
        console.log('=======================');
        
        const statusEvents = events.filter(e => e.type === 'status');
        const answerEvents = events.filter(e => e.type === 'answer');
        const doneEvents = events.filter(e => e.type === 'done');

        console.log(`Status updates: ${statusEvents.length}`);
        console.log(`Answer events: ${answerEvents.length}`);
        console.log(`Completion events: ${doneEvents.length}`);
        console.log(`Business analysis data received: ${businessAnalysisReceived ? '✅ YES' : '❌ NO'}`);

        if (statusEvents.length >= 2) {
            console.log('✅ Progress feedback working correctly');
        } else {
            console.log('⚠️  Limited progress feedback');
        }

        if (businessAnalysisReceived) {
            console.log('✅ SUCCESS: Enhanced N8N workflow with Fortune 500 analysis working!');
            console.log('The chat interface should now display:');
            console.log('- Progress indicators during analysis');
            console.log('- Structured business intelligence data');
            console.log('- Comprehensive decision-making unit mapping');
            console.log('- Strategic engagement recommendations');
        } else {
            console.log('❌ Business analysis structured data not detected');
            console.log('❓ This may indicate the detection logic needs further refinement');
        }

        // Check if we got "Empty response received"
        const hasEmptyResponse = events.some(e => 
            e.data?.answer?.text?.includes('Empty response received') ||
            e.data?.message?.includes('Empty response received')
        );
        
        if (hasEmptyResponse) {
            console.log('❌ CRITICAL: Still getting "Empty response received"');
        } else {
            console.log('✅ No "Empty response received" detected');
        }

    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testFortune500Analysis().catch(console.error);