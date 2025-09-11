#!/usr/bin/env node

/**
 * Test script for N8N webhook with fixed response format
 * This tests the webhook endpoint to ensure it returns data in the expected format
 */

const testPayload = {
  id: `test-${Date.now()}`,
  prompt: "Hello, this is a test message",
  sessionId: `session-${Date.now()}`,
  category: "test",
  title: "Test Request",
  description: "Testing the N8N webhook response format",
  fullPrompt: "You are a helpful AI assistant.",
  suggested_tools: "Testing tools",
  tool_sequence: "Test sequence",
  parameters: {
    metrics: [],
    segments: [],
    calculations: []
  }
};

const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/jetvision-agent';

console.log('🚀 Testing N8N webhook with fixed response format');
console.log('📍 Webhook URL:', webhookUrl);
console.log('📦 Test payload:', JSON.stringify(testPayload, null, 2));
console.log('');

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testPayload),
})
.then(async response => {
  console.log('📊 Response Status:', response.status, response.statusText);
  console.log('📋 Response Headers:');
  response.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log('');
  
  const responseText = await response.text();
  console.log('📝 Raw Response:', responseText);
  console.log('');
  
  try {
    const responseData = JSON.parse(responseText);
    console.log('✅ Parsed Response:', JSON.stringify(responseData, null, 2));
    console.log('');
    
    // Validate expected fields
    console.log('🔍 Field Validation:');
    const expectedFields = ['message', 'text', 'response', 'result'];
    const missingFields = [];
    const presentFields = [];
    
    expectedFields.forEach(field => {
      if (responseData[field]) {
        presentFields.push(field);
        console.log(`  ✅ ${field}: Present (${responseData[field].substring(0, 50)}...)`);
      } else {
        missingFields.push(field);
        console.log(`  ❌ ${field}: Missing`);
      }
    });
    
    console.log('');
    if (missingFields.length === 0) {
      console.log('🎉 SUCCESS: All expected fields are present!');
      console.log('The N8N workflow is now returning data in the correct format.');
    } else {
      console.log('⚠️  WARNING: Some expected fields are missing:', missingFields.join(', '));
      console.log('The frontend might not display content correctly.');
    }
    
    // Check for array wrapper issue
    if (Array.isArray(responseData)) {
      console.log('');
      console.log('⚠️  Response is wrapped in an array. Checking first element...');
      const firstItem = responseData[0];
      if (firstItem) {
        console.log('First item fields:', Object.keys(firstItem).join(', '));
        expectedFields.forEach(field => {
          if (firstItem[field]) {
            console.log(`  ✅ ${field} in first item: Present`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to parse response as JSON:', error.message);
    console.log('This indicates the workflow is not returning valid JSON data.');
  }
})
.catch(error => {
  console.error('❌ Request failed:', error.message);
  console.log('');
  console.log('🔧 Troubleshooting tips:');
  console.log('1. Ensure N8N is running (default: http://localhost:5678)');
  console.log('2. Check that the workflow is imported and active');
  console.log('3. Verify the webhook path is correct: /webhook/jetvision-agent');
  console.log('4. Check N8N logs for any workflow execution errors');
});