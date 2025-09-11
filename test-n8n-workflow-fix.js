#!/usr/bin/env node
/**
 * Test the corrected N8N workflow
 * This test will verify that the fixed workflow properly returns JSON responses
 */

async function testCorrectedN8nWorkflow() {
    console.log('🧪 Testing Corrected N8N Workflow');
    console.log('=================================');

    // Note: This test assumes the corrected workflow has been imported to N8N
    // and is active at the same webhook URL
    const webhookUrl = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
    
    const testPayload = {
        id: `test_fixed_${Date.now()}`,
        prompt: "Find me 3 executive assistants in New York for private aviation clients",
        sessionId: `test-session-${Date.now()}`,
        category: "lead-generation",
        title: "Test Executive Assistant Search",
        description: "Testing the fixed N8N workflow response",
        fullPrompt: "You are a helpful AI assistant for private aviation business operations.",
        suggested_tools: "Apollo Search Tool will be used for lead generation.",
        tool_sequence: "Apollo search followed by response formatting.",
        parameters: {
            metrics: [],
            segments: [],
            calculations: []
        },
        // Original fields for backward compatibility
        message: "Find me 3 executive assistants in New York for private aviation clients",
        threadId: `test-thread-${Date.now()}`,
        threadItemId: `test-item-${Date.now()}`,
        userId: "test-user",
        timestamp: new Date().toISOString()
    };

    console.log('📤 Testing with comprehensive payload:');
    console.log(`Request ID: ${testPayload.id}`);
    console.log(`Session ID: ${testPayload.sessionId}`);
    console.log(`Prompt: ${testPayload.prompt}`);

    try {
        const startTime = Date.now();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPayload)
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        console.log('\\n📥 N8N Response Analysis:');
        console.log('=========================');
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Response Time: ${responseTime}ms`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);
        console.log(`Content-Length: ${response.headers.get('content-length') || 'Not specified'}`);

        const contentType = response.headers.get('content-type');
        let responseData;

        if (contentType && contentType.includes('application/json')) {
            try {
                const responseText = await response.text();
                console.log(`Raw response length: ${responseText.length} characters`);
                
                if (responseText.trim()) {
                    responseData = JSON.parse(responseText);
                    console.log('✅ Successfully parsed JSON response');
                } else {
                    console.log('❌ Empty response body - workflow still not working correctly');
                    return false;
                }
            } catch (parseError) {
                console.error('❌ JSON parsing failed:', parseError.message);
                return false;
            }
        } else {
            responseData = await response.text();
            console.log('⚠️ Non-JSON response received');
            console.log(`Response type: ${typeof responseData}`);
            console.log(`Response preview: ${responseData.substring(0, 200)}...`);
        }

        // Analyze the response structure
        if (typeof responseData === 'object' && responseData !== null) {
            console.log('\\n🔍 Response Structure Analysis:');
            console.log('================================');
            
            const keys = Object.keys(responseData);
            console.log(`📊 Response keys (${keys.length}): ${keys.join(', ')}`);
            
            // Check for expected fields
            const expectedFields = {
                'response': 'Main response text',
                'status': 'Execution status',
                'executionId': 'N8N execution ID',
                'workflowId': 'N8N workflow ID', 
                'requestId': 'Original request ID',
                'sessionId': 'Session identifier',
                'timestamp': 'Processing timestamp',
                'apolloResults': 'Apollo.io tool results',
                'structuredData': 'Structured data for UI'
            };

            let foundFields = 0;
            let criticalFields = 0;
            
            for (const [field, description] of Object.entries(expectedFields)) {
                if (responseData[field]) {
                    console.log(`✅ ${field}: ${description} - Found`);
                    foundFields++;
                    
                    if (['response', 'status', 'executionId'].includes(field)) {
                        criticalFields++;
                    }
                    
                    // Log sample data for key fields
                    if (field === 'response' && typeof responseData[field] === 'string') {
                        console.log(`   Preview: "${responseData[field].substring(0, 100)}..."`);
                    } else if (field === 'apolloResults' && responseData[field]) {
                        console.log(`   Type: ${responseData[field].type || 'unknown'}`);
                        console.log(`   Leads: ${responseData[field].leads?.length || 0}`);
                    }
                } else {
                    console.log(`❌ ${field}: ${description} - Missing`);
                }
            }

            console.log(`\\n📈 Field Coverage: ${foundFields}/${Object.keys(expectedFields).length} (${Math.round(foundFields/Object.keys(expectedFields).length*100)}%)`);
            console.log(`🎯 Critical Fields: ${criticalFields}/3 (${criticalFields >= 2 ? 'PASS' : 'FAIL'})`);

            // Test response quality
            if (responseData.response && typeof responseData.response === 'string') {
                const responseLength = responseData.response.length;
                console.log(`\\n📝 Response Quality Assessment:`);
                console.log(`Response length: ${responseLength} characters`);
                
                if (responseLength > 100) {
                    console.log('✅ Substantial response content');
                } else if (responseLength > 20) {
                    console.log('⚠️ Brief response content');
                } else {
                    console.log('❌ Very short response content');
                }

                // Check for key indicators
                const response = responseData.response.toLowerCase();
                const indicators = [
                    { pattern: 'executive assistant', description: 'Executive assistant mention' },
                    { pattern: 'new york', description: 'Location reference' },
                    { pattern: 'aviation', description: 'Aviation industry context' },
                    { pattern: 'jetvision', description: 'Brand reference' },
                    { pattern: '@', description: 'Email addresses' },
                    { pattern: 'linkedin', description: 'LinkedIn references' }
                ];

                console.log('\\n🎯 Content Analysis:');
                indicators.forEach(({ pattern, description }) => {
                    if (response.includes(pattern)) {
                        console.log(`✅ ${description} - Found`);
                    } else {
                        console.log(`❌ ${description} - Not found`);
                    }
                });
            }

            // Check execution metadata
            if (responseData.executionId) {
                console.log(`\\n⚙️ Execution Metadata:`);
                console.log(`Execution ID: ${responseData.executionId}`);
                console.log(`Workflow ID: ${responseData.workflowId || 'Not provided'}`);
                console.log(`Request ID: ${responseData.requestId || 'Not provided'}`);
                console.log(`Session ID: ${responseData.sessionId || 'Not provided'}`);
                console.log(`Status: ${responseData.status || 'Not provided'}`);
            }

            // Overall assessment
            console.log('\\n🏆 Overall Assessment:');
            console.log('=======================');
            
            if (response.ok && responseData.response && responseData.executionId) {
                console.log('✅ SUCCESS: N8N workflow is functioning correctly');
                console.log('✅ Returns proper JSON structure');
                console.log('✅ Contains meaningful response content');
                console.log('✅ Includes execution metadata');
                
                if (responseData.apolloResults) {
                    console.log('✅ BONUS: Apollo.io tool results detected');
                }
                
                return true;
            } else {
                console.log('❌ PARTIAL SUCCESS: Workflow responds but with issues');
                if (!response.ok) console.log('  - HTTP status indicates error');
                if (!responseData.response) console.log('  - Missing main response content');
                if (!responseData.executionId) console.log('  - Missing execution metadata');
                
                return false;
            }

        } else {
            console.log('❌ Response is not a valid JSON object');
            console.log(`Received: ${typeof responseData}`);
            console.log(`Content: ${responseData?.toString().substring(0, 300)}...`);
            return false;
        }

    } catch (error) {
        console.error('\\n💥 Test Failed with Error:');
        console.error(`Error: ${error.message}`);
        console.error('\\nPossible causes:');
        console.error('1. N8N server is not accessible');
        console.error('2. Corrected workflow not imported/activated');
        console.error('3. Network connectivity issues');
        console.error('4. Webhook URL has changed');
        return false;
    }
}

// Main execution
console.log('🚀 Starting N8N Workflow Fix Test');
console.log('==================================');

testCorrectedN8nWorkflow()
    .then(success => {
        console.log('\\n' + '='.repeat(50));
        if (success) {
            console.log('🎉 TEST PASSED: N8N workflow fix is working correctly!');
            console.log('✅ JetVision Agent → N8N pipeline is now functional');
            console.log('✅ Users will receive proper responses from N8N workflow');
        } else {
            console.log('🔴 TEST FAILED: N8N workflow still has issues');
            console.log('❌ Additional debugging required');
            console.log('🔧 Next steps:');
            console.log('  1. Import the fixed workflow to N8N');
            console.log('  2. Activate the corrected workflow');
            console.log('  3. Deactivate the old problematic workflow');
            console.log('  4. Test again');
        }
        console.log('='.repeat(50));
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Test execution failed:', error);
        process.exit(1);
    });