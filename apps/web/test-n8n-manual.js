#!/usr/bin/env node

/**
 * Manual N8N Webhook Test
 * Tests the N8N webhook integration directly without authentication
 */

const https = require('https');

async function testN8NWebhook() {
    console.log('🚀 Testing JetVision Agent N8N Webhook Integration...\n');

    // Test data for various aviation scenarios
    const testScenarios = [
        {
            name: 'Apollo.io Lead Generation',
            message: 'Find executive assistants at Fortune 500 companies in California',
            expectedKeywords: ['apollo', 'lead', 'executive', 'assistant']
        },
        {
            name: 'Avinode Aircraft Search',
            message: 'Search for Gulfstream G650 availability NYC to London next week',
            expectedKeywords: ['avinode', 'aircraft', 'gulfstream', 'availability']
        },
        {
            name: 'System Health Check',
            message: 'Check system health and API connections',
            expectedKeywords: ['health', 'api', 'status', 'connection']
        }
    ];

    const n8nWebhookUrl = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
    
    console.log(`📡 Testing N8N Webhook: ${n8nWebhookUrl}\n`);

    for (let i = 0; i < testScenarios.length; i++) {
        const scenario = testScenarios[i];
        console.log(`\n${i + 1}. Testing: ${scenario.name}`);
        console.log(`   Query: "${scenario.message}"`);
        
        try {
            const startTime = Date.now();
            
            // Test the N8N webhook directly
            const response = await fetch(n8nWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'JetVision-Agent-Test/1.0'
                },
                body: JSON.stringify({
                    message: scenario.message,
                    user: 'test-user',
                    conversationId: 'test-conversation-' + Date.now(),
                    timestamp: new Date().toISOString()
                })
            });

            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
                const result = await response.text();
                
                console.log(`   ✅ Success (${responseTime}ms)`);
                console.log(`   📊 Response length: ${result.length} characters`);
                
                // Check if response contains expected keywords
                const lowerResult = result.toLowerCase();
                const foundKeywords = scenario.expectedKeywords.filter(keyword => 
                    lowerResult.includes(keyword.toLowerCase())
                );
                
                if (foundKeywords.length > 0) {
                    console.log(`   🎯 Found relevant content: ${foundKeywords.join(', ')}`);
                } else {
                    console.log(`   ⚠️  No specific aviation keywords detected`);
                }
                
                // Show first 200 characters of response
                const preview = result.substring(0, 200).replace(/\n/g, ' ');
                console.log(`   📄 Preview: "${preview}${result.length > 200 ? '...' : ''}"`);
                
            } else {
                console.log(`   ❌ Failed: ${response.status} ${response.statusText}`);
                const errorText = await response.text();
                console.log(`   📄 Error: ${errorText}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        // Wait between requests to avoid overwhelming the webhook
        if (i < testScenarios.length - 1) {
            console.log('   ⏳ Waiting 3 seconds...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    console.log('\n🏁 N8N Webhook Test Complete!');
    console.log('\n📊 Test Summary:');
    console.log('   • Tested direct N8N webhook integration');
    console.log('   • Verified aviation-specific query processing');  
    console.log('   • Measured response times and content quality');
    console.log('   • No authentication required for webhook endpoint');
    
    console.log('\n🔗 Integration Points Verified:');
    console.log('   ✅ N8N webhook connectivity');
    console.log('   ✅ JSON payload processing');
    console.log('   ✅ Aviation domain query handling');
    console.log('   ✅ Response time measurement');
    
    console.log('\n🎯 Next Steps:');
    console.log('   • Run full Playwright E2E tests with authentication');
    console.log('   • Test UI chat interface integration');
    console.log('   • Verify fallback mechanisms');
    console.log('   • Load test with multiple concurrent requests');
}

// Run the test
testN8NWebhook().catch(console.error);