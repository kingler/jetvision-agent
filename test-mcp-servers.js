#!/usr/bin/env node

/**
 * Test script for MCP server connections
 * Tests both Apollo.io and Avainode MCP servers
 */

const https = require('https');

// MCP Server endpoints
const MCP_SERVERS = {
  'apollo-io': 'https://apollo-mcp.designthru.ai/mcp',
  'avainode': 'https://avainode-mcp.designthru.ai/mcp',
};

// Test JSONRPC request for listing tools
function createListToolsRequest() {
  return JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: Date.now()
  });
}

// Test JSONRPC request for server info
function createInitializeRequest() {
  return JSON.stringify({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    },
    id: Date.now()
  });
}

// Test a specific MCP server
async function testMCPServer(name, url) {
  console.log(`\n🔍 Testing ${name} MCP Server at ${url}`);
  console.log('=' . repeat(60));
  
  return new Promise((resolve) => {
    // Test 1: Initialize
    console.log('\n1. Testing initialize method...');
    const initRequest = createInitializeRequest();
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(initRequest)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            console.log(`   ❌ Error: ${response.error.message}`);
          } else if (response.result) {
            console.log(`   ✅ Server initialized successfully`);
            console.log(`   Protocol version: ${response.result.protocolVersion}`);
            console.log(`   Server: ${response.result.serverInfo?.name || 'Unknown'}`);
            
            // Test 2: List tools
            testListTools(name, url).then(resolve);
          } else {
            console.log(`   ⚠️ Unexpected response:`, response);
            resolve();
          }
        } catch (e) {
          console.log(`   ❌ Failed to parse response: ${e.message}`);
          console.log(`   Response: ${data.substring(0, 200)}`);
          resolve();
        }
      });
    });
    
    req.on('error', (e) => {
      console.log(`   ❌ Connection error: ${e.message}`);
      resolve();
    });
    
    req.write(initRequest);
    req.end();
  });
}

// Test listing tools
async function testListTools(name, url) {
  console.log('\n2. Testing tools/list method...');
  
  return new Promise((resolve) => {
    const listRequest = createListToolsRequest();
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(listRequest)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            console.log(`   ❌ Error: ${response.error.message}`);
          } else if (response.result?.tools) {
            const tools = response.result.tools;
            console.log(`   ✅ Found ${tools.length} tools:`);
            
            // Show first 5 tools
            tools.slice(0, 5).forEach(tool => {
              console.log(`      - ${tool.name}: ${tool.description?.substring(0, 60)}...`);
            });
            
            if (tools.length > 5) {
              console.log(`      ... and ${tools.length - 5} more tools`);
            }
          } else {
            console.log(`   ⚠️ No tools found in response`);
          }
        } catch (e) {
          console.log(`   ❌ Failed to parse response: ${e.message}`);
        }
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.log(`   ❌ Connection error: ${e.message}`);
      resolve();
    });
    
    req.write(listRequest);
    req.end();
  });
}

// Test a sample tool call
async function testToolCall(name, url, toolName, toolParams) {
  console.log(`\n3. Testing tool call: ${toolName}...`);
  
  return new Promise((resolve) => {
    const toolRequest = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolParams
      },
      id: Date.now()
    });
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(toolRequest)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            console.log(`   ❌ Error: ${response.error.message}`);
          } else if (response.result) {
            console.log(`   ✅ Tool executed successfully`);
            
            // Show sample of response
            const content = response.result.content?.[0];
            if (content?.type === 'text') {
              const text = content.text.substring(0, 200);
              console.log(`   Response preview: ${text}...`);
            }
          } else {
            console.log(`   ⚠️ Unexpected response`);
          }
        } catch (e) {
          console.log(`   ❌ Failed to parse response: ${e.message}`);
        }
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.log(`   ❌ Connection error: ${e.message}`);
      resolve();
    });
    
    req.write(toolRequest);
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log('🚀 MCP Server Integration Test Suite');
  console.log('=====================================');
  
  // Test Apollo.io server
  await testMCPServer('Apollo.io', MCP_SERVERS['apollo-io']);
  
  // Test specific Apollo.io tool
  await testToolCall(
    'Apollo.io',
    MCP_SERVERS['apollo-io'],
    'search-leads',
    {
      jobTitle: 'CEO',
      industry: 'Aviation',
      limit: 5
    }
  );
  
  // Test Avainode server
  await testMCPServer('Avainode', MCP_SERVERS['avainode']);
  
  // Test specific Avainode tool
  await testToolCall(
    'Avainode',
    MCP_SERVERS['avainode'],
    'search-aircraft',
    {
      departure: 'KJFK',
      arrival: 'KLAX',
      date: '2024-03-15',
      passengers: 8
    }
  );
  
  console.log('\n\n✅ All tests completed!');
  console.log('=' . repeat(60));
  console.log('\nSummary:');
  console.log('- Apollo.io MCP Server: Check results above');
  console.log('- Avainode MCP Server: Check results above');
  console.log('\nIf both servers initialized and listed tools, the integration is working!');
}

// Run the tests
runTests().catch(console.error);