// Debug script to see exact payload being sent to N8N webhook

const message = "Test Apollo integration - find executive assistants at tech companies in NYC";
const threadId = "test-field-mapping-debug";
const threadItemId = `n8n-${Date.now()}`;
const clerkUserId = null;
const options = {};

// Mimic the webhook route payload construction
const webhookPayload = {
    // N8N workflow expects these specific fields
    id: threadItemId || `req_${Date.now()}`, // Generate ID if not provided
    prompt: message.trim(), // N8N expects 'prompt' not 'message'
    sessionId: threadId, // N8N expects 'sessionId' not 'threadId'
    
    // Additional optional fields that N8N workflow can use
    category: options?.category || 'lead-generation',
    title: options?.title || 'User Request',
    description: options?.description || '',
    fullPrompt: options?.fullPrompt || 'You are a helpful AI assistant for private aviation business operations.',
    suggested_tools: options?.suggested_tools || 'Apollo Search Tool, Avinode Aviation Tool will be used as needed.',
    tool_sequence: options?.tool_sequence || 'Tools will be used based on the request content.',
    parameters: {
        metrics: options?.parameters?.metrics || [],
        segments: options?.parameters?.segments || [],
        calculations: options?.parameters?.calculations || []
    },
    
    // Maintain backward compatibility - keep original fields as well
    message: message.trim(),
    threadId,
    threadItemId,
    userId: clerkUserId,
    timestamp: new Date().toISOString(),
    ...options,
};

console.log('Webhook Payload being sent to N8N:');
console.log('='.repeat(50));
console.log(JSON.stringify(webhookPayload, null, 2));

console.log('\nRequired fields check:');
console.log('='.repeat(30));
console.log('id:', webhookPayload.id);
console.log('prompt:', webhookPayload.prompt); 
console.log('sessionId:', webhookPayload.sessionId);
console.log('All required fields present:', !!(webhookPayload.id && webhookPayload.prompt && webhookPayload.sessionId));