#!/usr/bin/env node
/**
 * Debug N8N Webhook Response Structure
 * This script investigates the exact response format from N8N webhook
 */

async function debugN8nWebhookResponse() {
    console.log('🔍 Debugging N8N Webhook Response Structure');
    console.log('=============================================');

    const testMessage = {
        message: "Find me 3 executive assistants in New York",
        threadId: `debug-${Date.now()}`,
        threadItemId: `debug-item-${Date.now()}`,
        timestamp: new Date().toISOString(),
    };

    try {
        console.log('\n📤 Sending debug message to N8N webhook URL directly...');
        
        // First test: Direct N8N webhook call
        const directResponse = await fetch('https://n8n.vividwalls.blog/webhook/jetvision-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testMessage),
        });

        console.log('\n🔗 Direct N8N Response:');
        console.log('Status:', directResponse.status, directResponse.statusText);
        console.log('Content-Type:', directResponse.headers.get('content-type'));
        
        let directData;
        const contentType = directResponse.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
            directData = await directResponse.json();
            console.log('Response Data (JSON):', JSON.stringify(directData, null, 2));
        } else {
            directData = await directResponse.text();
            console.log('Response Data (Text):', directData);
        }

        console.log('\n📊 Response Analysis:');
        console.log('===================');
        
        if (typeof directData === 'object' && directData !== null) {
            console.log('Response is an object');
            console.log('Available keys:', Object.keys(directData));
            
            // Check for expected fields
            const expectedFields = ['response', 'message', 'output', 'text', 'result', 'answer', 'content'];
            expectedFields.forEach(field => {
                if (directData[field]) {
                    console.log(`✅ Found field '${field}':`, typeof directData[field], directData[field]?.toString().substring(0, 100) + '...');
                } else {
                    console.log(`❌ Missing field '${field}'`);
                }
            });

            // Check for execution-related fields
            if (directData.executionId) {
                console.log('🔄 Has executionId:', directData.executionId);
                console.log('This indicates long-running execution - should use polling');
            }

            if (directData.workflowId) {
                console.log('🔧 WorkflowId:', directData.workflowId);
            }

        } else {
            console.log('Response is not an object:', typeof directData);
        }

        console.log('\n🏗️  Testing N8N Response Transformer...');
        
        // Test the transformer
        if (typeof require !== 'undefined') {
            try {
                const path = require('path');
                const transformerPath = path.join(__dirname, 'jetvision-agent/apps/web/lib/n8n-response-transformer.ts');
                console.log('Loading transformer from:', transformerPath);
                // Note: This would need to be compiled first in a real scenario
            } catch (err) {
                console.log('Cannot load transformer in Node.js environment');
            }
        }

    } catch (error) {
        console.error('\n💥 Debug test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugN8nWebhookResponse().catch(console.error);