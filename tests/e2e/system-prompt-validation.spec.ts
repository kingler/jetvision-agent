import { test, expect } from '@playwright/test';

test.describe('System Prompt Validation', () => {
  const baseURL = 'http://localhost:3002';

  test('should validate enhanced system prompt responses', async ({ page }) => {
    test.setTimeout(90000);
    
    console.log('Testing enhanced system prompt responses...');
    
    const testMessage = 'Can you help me understand our fleet utilization and operational efficiency for our charter business?';
    
    console.log('Sending operations question via API...');
    
    const response = await fetch(`${baseURL}/api/n8n-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        threadId: 'test-operations-' + Date.now()
      })
    });
    
    console.log('API Response Status:', response.status);
    expect(response.status).toBe(200);
    
    if (response.body) {
      const reader = response.body.getReader();
      let fullResponse = '';
      let foundOperationsContent = false;
      let foundAviationContext = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        fullResponse += chunk;
        
        const lowerChunk = chunk.toLowerCase();
        
        if (lowerChunk.includes('fleet') || lowerChunk.includes('operational') || lowerChunk.includes('efficiency')) {
          foundOperationsContent = true;
        }
        
        if (lowerChunk.includes('aviation') || lowerChunk.includes('charter') || lowerChunk.includes('aircraft')) {
          foundAviationContext = true;
        }
      }
      
      console.log('Operations content found:', foundOperationsContent);
      console.log('Aviation context found:', foundAviationContext);
      console.log('Total response length:', fullResponse.length);
      
      expect(fullResponse.length).toBeGreaterThan(100);
      expect(foundAviationContext).toBe(true);
      
      console.log('Enhanced system prompt test completed successfully');
    }
  });

  test('should handle general business questions appropriately', async ({ page }) => {
    test.setTimeout(60000);
    
    const businessQuestion = 'What are the key performance indicators for our aviation business?';
    
    console.log('Testing business KPI question...');
    
    const response = await fetch(`${baseURL}/api/n8n-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: businessQuestion,
        threadId: 'test-business-' + Date.now()
      })
    });
    
    expect(response.status).toBe(200);
    
    if (response.body) {
      const reader = response.body.getReader();
      let responseReceived = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        if (chunk.includes('answer') && chunk.length > 50) {
          responseReceived = true;
          console.log('Business question response received successfully');
          break;
        }
      }
      
      expect(responseReceived).toBe(true);
    }
  });

  test('should maintain aviation context in responses', async ({ page }) => {
    test.setTimeout(60000);
    
    const contextQuestions = [
      'How do I improve customer satisfaction?',
      'What should I focus on for growth?',
      'Tell me about market opportunities'
    ];
    
    for (const question of contextQuestions) {
      console.log(`Testing context preservation for: "${question.substring(0, 30)}..."`);
      
      const response = await fetch(`${baseURL}/api/n8n-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          threadId: `test-context-${Date.now()}`
        })
      });
      
      expect(response.status).toBe(200);
      
      if (response.body) {
        const reader = response.body.getReader();
        let aviationContextMaintained = false;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value).toLowerCase();
          if (chunk.includes('aviation') || chunk.includes('charter') || chunk.includes('aircraft') || chunk.includes('jetvision')) {
            aviationContextMaintained = true;
            break;
          }
        }
        
        console.log(`Aviation context maintained: ${aviationContextMaintained}`);
        expect(aviationContextMaintained).toBe(true);
      }
      
      await page.waitForTimeout(500);
    }
    
    console.log('Context preservation test completed');
  });
});