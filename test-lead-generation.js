#!/usr/bin/env node

/**
 * Test JetVision Agent N8N workflow with lead generation prompts
 * This tests Apollo.io MCP tool integration
 */

const leadGenerationPrompts = [
  "Find me 5 executive assistants in New York for private jet companies",
  "I need contacts for chief of staff positions at Fortune 500 companies",
  "Search for executive administrators in Los Angeles who work in aviation",
  "Get me leads for personal assistants to CEOs in tech companies"
];

const n8nWebhookUrl = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';

async function testPrompt(prompt, index) {
  const payload = {
    id: `test-lead-${Date.now()}-${index}`,
    prompt: prompt,
    sessionId: `session-${Date.now()}`,
    category: "lead-generation",
    title: "Lead Generation Request",
    description: "Testing Apollo.io integration",
    metadata: {
      source: "test-script",
      testIndex: index
    }
  };

  console.log(`\n🎯 Test ${index + 1}: "${prompt}"`);
  console.log('📤 Sending to N8N webhook...');
  
  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    
    const responseText = await response.text();
    
    if (!responseText) {
      console.log('❌ Empty response received');
      return false;
    }
    
    try {
      const data = JSON.parse(responseText);
      
      // Check for expected fields
      const hasMessage = !!data.message;
      const hasText = !!data.text;
      const hasResponse = !!data.response;
      const hasResult = !!data.result;
      
      if (hasMessage || hasText || hasResponse || hasResult) {
        console.log('✅ Valid response received');
        
        // Display the actual response content
        const responseContent = data.message || data.text || data.response || data.result;
        console.log('📝 Response preview:', responseContent.substring(0, 200) + '...');
        
        // Check if Apollo tool was mentioned
        if (responseContent.toLowerCase().includes('apollo') || 
            responseContent.toLowerCase().includes('lead') ||
            responseContent.toLowerCase().includes('executive')) {
          console.log('🎯 Apollo.io context detected in response');
        }
        
        return true;
      } else {
        console.log('❌ Response missing expected fields');
        console.log('Fields present:', Object.keys(data).join(', '));
        return false;
      }
    } catch (e) {
      console.log('❌ Failed to parse JSON response');
      console.log('Raw response:', responseText.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Testing JetVision Agent Lead Generation with N8N Workflow');
  console.log('📍 Webhook URL:', n8nWebhookUrl);
  console.log('🧪 Running', leadGenerationPrompts.length, 'test prompts');
  
  let successCount = 0;
  
  for (let i = 0; i < leadGenerationPrompts.length; i++) {
    const success = await testPrompt(leadGenerationPrompts[i], i);
    if (success) successCount++;
    
    // Wait 2 seconds between tests to avoid overwhelming the API
    if (i < leadGenerationPrompts.length - 1) {
      console.log('⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${successCount}/${leadGenerationPrompts.length} successful`);
  
  if (successCount === leadGenerationPrompts.length) {
    console.log('🎉 All tests passed! N8N workflow is working correctly.');
  } else if (successCount > 0) {
    console.log('⚠️  Some tests passed. Partial functionality confirmed.');
  } else {
    console.log('❌ All tests failed. Check N8N workflow configuration.');
  }
  
  console.log('\n💡 Next step: Open http://localhost:3001 and test in the UI');
  console.log('   Try prompt: "Find me executive assistants in New York"');
}

// Run the tests
runAllTests().catch(console.error);