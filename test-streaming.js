#!/usr/bin/env node

/**
 * Test script for JetVision n8n streaming functionality
 * Run with: node test-streaming.js
 */

const fetch = require('node-fetch');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function testStreamingChat() {
  console.log(`${colors.bright}${colors.cyan}🚀 JetVision n8n Streaming Test${colors.reset}\n`);
  
  const testMessage = 'Hello, I need help finding executive contacts in the aviation industry using Apollo.io. Can you search for CEOs and CTOs?';
  
  console.log(`${colors.yellow}📝 Test Message:${colors.reset} ${testMessage}\n`);
  console.log(`${colors.blue}⏳ Sending request to API...${colors.reset}\n`);
  
  try {
    const response = await fetch('http://localhost:3000/api/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '127.0.0.1',
      },
      body: JSON.stringify({
        prompt: testMessage,
        mode: 'gpt-4o-mini', // Mode that doesn't require auth
        threadId: 'test-stream-' + Date.now(),
        threadItemId: 'item-stream-' + Date.now(),
        parentThreadItemId: '',
        messages: [
          {
            role: 'user',
            content: testMessage
          }
        ],
        webSearch: false,
        showSuggestions: false,
        mcpConfig: {}
      })
    });

    console.log(`${colors.green}✅ Response Status:${colors.reset} ${response.status}`);
    console.log(`${colors.cyan}📊 Headers:${colors.reset}`);
    console.log(`  • X-Credits-Available: ${response.headers.get('X-Credits-Available')}`);
    console.log(`  • X-Credits-Cost: ${response.headers.get('X-Credits-Cost')}`);
    console.log(`  • Content-Type: ${response.headers.get('Content-Type')}\n`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`${colors.red}❌ Error response:${colors.reset}`, error);
      return;
    }

    console.log(`${colors.green}🎯 Streaming Response:${colors.reset}\n`);
    console.log(`${colors.bright}${'─'.repeat(60)}${colors.reset}`);
    
    // Handle streaming response
    const reader = response.body;
    let buffer = '';
    let messageCount = 0;
    let contentBuffer = '';
    let startTime = Date.now();
    
    reader.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('event:')) {
          const event = line.substring(6).trim();
          if (event && event !== 'heartbeat') {
            messageCount++;
            
            // Show event types in real-time
            if (event === 'status') {
              process.stdout.write(`${colors.yellow}[${event}]${colors.reset} `);
            } else if (event === 'answer') {
              process.stdout.write(`${colors.green}[${event}]${colors.reset} `);
            } else if (event === 'done') {
              process.stdout.write(`\n${colors.blue}[${event}]${colors.reset} `);
            } else {
              process.stdout.write(`${colors.cyan}[${event}]${colors.reset} `);
            }
          }
        }
        
        if (line.startsWith('data:')) {
          try {
            const data = JSON.parse(line.substring(5));
            
            if (data.type === 'content' && data.content) {
              // Stream the actual content
              process.stdout.write(data.content);
              contentBuffer += data.content;
            } else if (data.type === 'done') {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
              console.log(`\n${colors.bright}${'─'.repeat(60)}${colors.reset}\n`);
              console.log(`${colors.green}✅ Stream Complete${colors.reset}`);
              console.log(`${colors.cyan}📈 Statistics:${colors.reset}`);
              console.log(`  • Status: ${data.status}`);
              console.log(`  • Events Received: ${messageCount}`);
              console.log(`  • Content Length: ${contentBuffer.length} characters`);
              console.log(`  • Time Elapsed: ${elapsed} seconds`);
              
              if (contentBuffer.length === 0) {
                console.log(`\n${colors.yellow}⚠️  No content received from n8n webhook${colors.reset}`);
                console.log(`${colors.yellow}    The webhook is responding but not returning content.${colors.reset}`);
                console.log(`${colors.yellow}    Please check your n8n workflow configuration.${colors.reset}`);
              }
              
              reader.destroy();
            } else if (data.error) {
              console.log(`\n${colors.red}❌ Stream Error:${colors.reset} ${data.error}`);
            }
          } catch (e) {
            // Not JSON, could be heartbeat
          }
        }
      }
    });

    reader.on('end', () => {
      console.log(`\n${colors.green}🏁 Test Complete!${colors.reset}\n`);
      process.exit(0);
    });

    reader.on('error', (err) => {
      if (err.message !== 'Premature close') {
        console.log(`\n${colors.red}❌ Stream error:${colors.reset} ${err.message}`);
      }
      process.exit(1);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      console.log(`\n${colors.yellow}⏱️  Test timeout after 30 seconds${colors.reset}`);
      reader.destroy();
      process.exit(0);
    }, 30000);

  } catch (error) {
    console.error(`${colors.red}❌ Test failed:${colors.reset} ${error.message}`);
    process.exit(1);
  }
}

// Display test information
console.log(`${colors.bright}${colors.blue}╔${'═'.repeat(58)}╗${colors.reset}`);
console.log(`${colors.bright}${colors.blue}║${colors.reset}  ${colors.bright}JetVision n8n Agent - Streaming Test${colors.reset}${' '.repeat(16)}${colors.bright}${colors.blue}║${colors.reset}`);
console.log(`${colors.bright}${colors.blue}╚${'═'.repeat(58)}╝${colors.reset}\n`);

console.log(`${colors.cyan}📍 Endpoint:${colors.reset} http://localhost:3000/api/completion`);
console.log(`${colors.cyan}🔧 Mode:${colors.reset} gpt-4o-mini (no auth required)`);
console.log(`${colors.cyan}🌐 n8n Webhook:${colors.reset} ${process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'Using default URL'}\n`);

// Run the test
testStreamingChat();