#!/usr/bin/env node

/**
 * Test JetVision Agent integration with N8N workflow
 * This script tests the complete flow from frontend to N8N and back
 */

const testPayload = {
  prompt: "Hello, I need help finding executive assistants in New York",
  context: {
    source: "apollo",
    mode: "regular",
    messages: []
  }
};

const n8nWebhookUrl = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';

// Format payload for N8N workflow
const n8nPayload = {
  id: `test-${Date.now()}`,
  prompt: testPayload.prompt,
  sessionId: `session-${Date.now()}`,
  category: "lead-generation",
  title: "Executive Assistant Search",
  description: "Finding executive assistants in New York",
  fullPrompt: "You are JetVision Agent, an expert in private aviation and business intelligence.",
  suggested_tools: "Apollo.io for lead generation",
  tool_sequence: "Use Apollo Search Tool to find executive assistants",
  parameters: {
    metrics: [],
    segments: [],
    calculations: []
  }
};

console.log('🚀 Testing JetVision Agent Integration with N8N');
console.log('📍 N8N Webhook URL:', n8nWebhookUrl);
console.log('📦 Test Payload:', JSON.stringify(n8nPayload, null, 2));
console.log('');

console.log('📤 Sending request to N8N webhook...');
fetch(n8nWebhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(n8nPayload),
  signal: AbortSignal.timeout(30000) // 30 second timeout
})
.then(async response => {
  console.log('📊 Response Status:', response.status, response.statusText);
  
  const responseText = await response.text();
  
  if (!responseText) {
    console.log('⚠️  Empty response body received');
    console.log('');
    console.log('🔍 Diagnostics:');
    console.log('1. The workflow might still be processing');
    console.log('2. Check N8N execution logs at: https://n8n.vividwalls.blog/workflow/73dVNv3Wwwiey9XJ/executions');
    console.log('3. Ensure the "Process Response" and "Final Response" nodes are configured correctly');
    return;
  }
  
  console.log('📝 Raw Response Length:', responseText.length, 'characters');
  console.log('');
  
  try {
    const responseData = JSON.parse(responseText);
    
    // Check for expected fields
    console.log('🔍 Response Field Validation:');
    const expectedFields = ['message', 'text', 'response', 'result'];
    const foundFields = [];
    const missingFields = [];
    
    expectedFields.forEach(field => {
      if (responseData[field]) {
        foundFields.push(field);
        const preview = responseData[field].substring(0, 100);
        console.log(`  ✅ ${field}: "${preview}${responseData[field].length > 100 ? '...' : ''}"`);
      } else {
        missingFields.push(field);
        console.log(`  ❌ ${field}: Missing`);
      }
    });
    
    console.log('');
    
    // Check for array wrapper
    if (Array.isArray(responseData)) {
      console.log('⚠️  Response is an array. Checking first element...');
      if (responseData[0]) {
        const firstItem = responseData[0];
        expectedFields.forEach(field => {
          if (firstItem[field]) {
            const preview = firstItem[field].substring(0, 100);
            console.log(`  ✅ ${field} in [0]: "${preview}${firstItem[field].length > 100 ? '...' : ''}"`);
          }
        });
      }
      console.log('');
    }
    
    // Check metadata
    if (responseData.status) {
      console.log('📊 Response Status:', responseData.status);
    }
    if (responseData.executionId) {
      console.log('🔗 Execution ID:', responseData.executionId);
    }
    if (responseData.metadata?.source) {
      console.log('📍 Source:', responseData.metadata.source);
    }
    
    console.log('');
    
    // Success evaluation
    if (foundFields.length === expectedFields.length) {
      console.log('🎉 SUCCESS: All expected fields are present!');
      console.log('✅ The N8N workflow is correctly returning data');
      console.log('✅ The frontend should be able to display the response');
    } else if (foundFields.length > 0) {
      console.log('⚠️  PARTIAL SUCCESS: Some fields are present');
      console.log('Missing fields:', missingFields.join(', '));
      console.log('The frontend might display the response with some limitations');
    } else {
      console.log('❌ FAILURE: No expected fields found');
      console.log('The frontend will not be able to display the response');
    }
    
    // Display full response for debugging
    console.log('');
    console.log('📋 Full Response Structure:');
    console.log(JSON.stringify(responseData, null, 2).substring(0, 1000));
    
  } catch (error) {
    console.error('❌ Failed to parse response as JSON:', error.message);
    console.log('Raw response:', responseText.substring(0, 500));
  }
})
.catch(error => {
  if (error.name === 'AbortError') {
    console.error('❌ Request timeout after 30 seconds');
    console.log('The workflow might be taking too long to process');
  } else {
    console.error('❌ Request failed:', error.message);
  }
  console.log('');
  console.log('🔧 Troubleshooting:');
  console.log('1. Check N8N is accessible: https://n8n.vividwalls.blog');
  console.log('2. Verify the workflow is active');
  console.log('3. Check N8N execution logs for errors');
});