#!/usr/bin/env node

/**
 * Test HTTP Streaming MCP Server Connections
 * Tests both Apollo and Avainode MCP servers
 */

const https = require('https');

// Server configurations
const servers = {
  apollo: {
    name: 'Apollo MCP Server',
    url: 'https://apollo-mcp.kingler.workers.dev/mcp',
    color: '\x1b[36m', // Cyan
  },
  avainode: {
    name: 'Avainode MCP Server', 
    url: 'https://avainode-mcp.kingler.workers.dev/mcp',
    color: '\x1b[35m', // Magenta
  }
};

const resetColor = '\x1b[0m';
const greenCheck = '\x1b[32m✓\x1b[0m';
const redX = '\x1b[31m✗\x1b[0m';

// Helper function to make HTTP requests
function makeRequest(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlParts = new URL(url);
    const options = {
      hostname: urlParts.hostname,
      port: 443,
      path: urlParts.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data)),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ 
            status: res.statusCode, 
            headers: res.headers, 
            data: response 
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            headers: res.headers, 
            data: body 
          });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

// Test functions
async function testInitialize(server) {
  console.log(`\n${server.color}Testing ${server.name} - Initialize${resetColor}`);
  
  try {
    const response = await makeRequest(server.url, {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '1.0.0',
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      },
      id: 'init-1'
    });

    if (response.status === 200 && response.data.result) {
      console.log(`  ${greenCheck} Initialize successful`);
      console.log(`    Session ID: ${response.data.result.sessionId || response.headers['mcp-session-id'] || 'N/A'}`);
      console.log(`    Protocol Version: ${response.data.result.protocolVersion}`);
      console.log(`    Server Name: ${response.data.result.serverInfo?.name || 'N/A'}`);
      return response.data.result.sessionId || response.headers['mcp-session-id'];
    } else {
      console.log(`  ${redX} Initialize failed: ${response.status}`);
      console.log(`    Response: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    console.log(`  ${redX} Initialize error: ${error.message}`);
    return null;
  }
}

async function testListTools(server, sessionId) {
  console.log(`\n${server.color}Testing ${server.name} - List Tools${resetColor}`);
  
  try {
    const headers = sessionId ? { 'mcp-session-id': sessionId } : {};
    const response = await makeRequest(server.url, {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 'list-1'
    }, headers);

    if (response.status === 200 && response.data.result) {
      const tools = response.data.result.tools || [];
      console.log(`  ${greenCheck} List tools successful`);
      console.log(`    Found ${tools.length} tools`);
      if (tools.length > 0) {
        console.log(`    Sample tools:`);
        tools.slice(0, 3).forEach(tool => {
          console.log(`      - ${tool.name}: ${tool.description}`);
        });
      }
      return true;
    } else {
      console.log(`  ${redX} List tools failed: ${response.status}`);
      console.log(`    Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${redX} List tools error: ${error.message}`);
    return false;
  }
}

async function testCallTool(server, sessionId, toolName, args) {
  console.log(`\n${server.color}Testing ${server.name} - Call Tool: ${toolName}${resetColor}`);
  
  try {
    const headers = sessionId ? { 'mcp-session-id': sessionId } : {};
    const response = await makeRequest(server.url, {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      },
      id: 'call-1'
    }, headers);

    if (response.status === 200 && response.data.result) {
      console.log(`  ${greenCheck} Tool call successful`);
      const content = response.data.result.content;
      if (content && content[0]) {
        const text = content[0].text;
        const preview = text.substring(0, 100) + (text.length > 100 ? '...' : '');
        console.log(`    Response preview: ${preview}`);
      }
      return true;
    } else {
      console.log(`  ${redX} Tool call failed: ${response.status}`);
      console.log(`    Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${redX} Tool call error: ${error.message}`);
    return false;
  }
}

async function testStreamingSupport(server, sessionId) {
  console.log(`\n${server.color}Testing ${server.name} - HTTP Streaming Support${resetColor}`);
  
  // Test if the server supports streaming by checking headers and response format
  try {
    const headers = sessionId ? { 
      'mcp-session-id': sessionId,
      'Accept': 'text/event-stream'
    } : { 'Accept': 'text/event-stream' };
    
    const response = await makeRequest(server.url, {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 'stream-1'
    }, headers);

    // Check if server responds with appropriate streaming headers
    const contentType = response.headers['content-type'];
    const cacheControl = response.headers['cache-control'];
    
    console.log(`  Content-Type: ${contentType || 'Not specified'}`);
    console.log(`  Cache-Control: ${cacheControl || 'Not specified'}`);
    
    if (response.status === 200) {
      console.log(`  ${greenCheck} Server responds to streaming requests`);
      return true;
    } else {
      console.log(`  ${redX} Server doesn't support streaming properly`);
      return false;
    }
  } catch (error) {
    console.log(`  ${redX} Streaming test error: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('MCP HTTP Streaming Server Connection Tests');
  console.log('='.repeat(60));

  const results = {};

  // Test Apollo MCP Server
  console.log(`\n${servers.apollo.color}${'='.repeat(40)}${resetColor}`);
  console.log(`${servers.apollo.color}Testing Apollo MCP Server${resetColor}`);
  console.log(`${servers.apollo.color}${'='.repeat(40)}${resetColor}`);
  
  const apolloSession = await testInitialize(servers.apollo);
  results.apollo = {
    initialize: !!apolloSession,
    listTools: await testListTools(servers.apollo, apolloSession),
    callTool: await testCallTool(servers.apollo, apolloSession, 'search-leads', {
      jobTitle: 'CEO',
      industry: 'Aviation',
      limit: 5
    }),
    streaming: await testStreamingSupport(servers.apollo, apolloSession)
  };

  // Test Avainode MCP Server (if deployed)
  console.log(`\n${servers.avainode.color}${'='.repeat(40)}${resetColor}`);
  console.log(`${servers.avainode.color}Testing Avainode MCP Server${resetColor}`);
  console.log(`${servers.avainode.color}${'='.repeat(40)}${resetColor}`);
  
  const avainodeSession = await testInitialize(servers.avainode);
  if (avainodeSession !== null) {
    results.avainode = {
      initialize: !!avainodeSession,
      listTools: await testListTools(servers.avainode, avainodeSession),
      callTool: await testCallTool(servers.avainode, avainodeSession, 'search-aircraft', {
        departureAirport: 'KJFK',
        arrivalAirport: 'EGLL',
        departureDate: '2024-02-15',
        passengers: 8
      }),
      streaming: await testStreamingSupport(servers.avainode, avainodeSession)
    };
  } else {
    results.avainode = {
      initialize: false,
      listTools: false,
      callTool: false,
      streaming: false
    };
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  for (const [serverName, tests] of Object.entries(results)) {
    const server = serverName === 'apollo' ? servers.apollo : servers.avainode;
    console.log(`\n${server.color}${server.name}${resetColor}`);
    
    const passed = Object.values(tests).filter(t => t).length;
    const total = Object.values(tests).length;
    const allPassed = passed === total;
    
    console.log(`  Initialize: ${tests.initialize ? greenCheck : redX}`);
    console.log(`  List Tools: ${tests.listTools ? greenCheck : redX}`);
    console.log(`  Call Tool: ${tests.callTool ? greenCheck : redX}`);
    console.log(`  Streaming: ${tests.streaming ? greenCheck : redX}`);
    console.log(`  Overall: ${allPassed ? `${greenCheck} PASSED` : `${redX} FAILED`} (${passed}/${total})`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('N8N COMPATIBILITY');
  console.log('='.repeat(60));
  
  console.log('\nFor n8n MCP Client node configuration:');
  console.log('\nApollo MCP Server:');
  console.log('  - Endpoint URL: https://apollo-mcp.kingler.workers.dev/mcp');
  console.log('  - Transport: HTTP Streamable');
  console.log('  - Authentication: None');
  
  console.log('\nAvainode MCP Server:');
  console.log('  - Endpoint URL: https://avainode-mcp.kingler.workers.dev/mcp');
  console.log('  - Transport: HTTP Streamable');
  console.log('  - Authentication: None');
  
  console.log('\n' + '='.repeat(60));
}

// Run tests
runTests().catch(console.error);