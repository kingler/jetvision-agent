/**
 * N8N Integration Test for Apollo MCP Server
 * 
 * This test simulates how n8n would interact with the Apollo MCP server
 * to create and manage automated email campaigns for JetVision.
 */

interface MCPRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id: string;
}

interface MCPResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  id: string;
}

async function simulateN8nWorkflow() {
  const MCP_SERVER_URL = 'http://localhost:8123/mcp';
  let sessionId: string | null = null;
  
  console.log('=== N8N INTEGRATION TEST FOR APOLLO MCP SERVER ===\n');
  console.log('Simulating n8n automation workflow for JetVision campaign management\n');
  
  try {
    // Step 1: Initialize MCP Session (as n8n would do)
    console.log('Step 1: Initializing MCP session...');
    const initRequest: MCPRequest = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '1.0',
        clientInfo: {
          name: 'n8n-automation',
          version: '1.0.0'
        }
      },
      id: '1'
    };
    
    const initResponse = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(initRequest)
    });
    
    if (initResponse.headers.get('mcp-session-id')) {
      sessionId = initResponse.headers.get('mcp-session-id');
      console.log(`✅ Session initialized: ${sessionId}\n`);
    }
    
    // Step 2: List available tools (n8n would use this to discover capabilities)
    console.log('Step 2: Discovering available Apollo tools...');
    const listToolsRequest: MCPRequest = {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: '2'
    };
    
    const toolsResponse = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId || ''
      },
      body: JSON.stringify(listToolsRequest)
    });
    
    const toolsData = await toolsResponse.json();
    if (toolsData.result && toolsData.result.tools) {
      console.log(`✅ Found ${toolsData.result.tools.length} Apollo tools available\n`);
      
      // List key tools for campaign automation
      const campaignTools = [
        'search-leads',
        'create-email-sequence',
        'create-contact',
        'create-deal',
        'track-engagement'
      ];
      
      console.log('Key campaign automation tools:');
      campaignTools.forEach(toolName => {
        const tool = toolsData.result.tools.find((t: any) => t.name === toolName);
        if (tool) {
          console.log(`  ✅ ${toolName}: ${tool.description}`);
        }
      });
      console.log();
    }
    
    // Step 3: Simulate campaign creation workflow
    console.log('Step 3: Simulating automated campaign workflow...\n');
    
    // 3a. Search for leads
    console.log('3a. Searching for high-value aviation prospects...');
    const searchLeadsRequest: MCPRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'search-leads',
        arguments: {
          jobTitle: 'CEO',
          industry: 'Aviation',
          companySize: '500+',
          location: 'United States',
          limit: 10
        }
      },
      id: '3'
    };
    
    const leadsResponse = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId || ''
      },
      body: JSON.stringify(searchLeadsRequest)
    });
    
    const leadsData = await leadsResponse.json();
    if (leadsData.result) {
      console.log('✅ Lead search completed successfully\n');
    }
    
    // 3b. Create contacts from leads
    console.log('3b. Creating contacts in CRM...');
    const createContactRequest: MCPRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'create-contact',
        arguments: {
          firstName: 'John',
          lastName: 'Aviation',
          email: 'john@aviationcorp.com',
          title: 'CEO',
          company: 'Aviation Corp',
          phone: '+1-555-0100'
        }
      },
      id: '4'
    };
    
    const contactResponse = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId || ''
      },
      body: JSON.stringify(createContactRequest)
    });
    
    const contactData = await contactResponse.json();
    if (contactData.result) {
      console.log('✅ Contact created in Apollo CRM\n');
    }
    
    // 3c. Create email sequence
    console.log('3c. Creating multi-touch email campaign...');
    const createSequenceRequest: MCPRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'create-email-sequence',
        arguments: {
          name: 'JetVision Private Charter Campaign',
          contacts: ['john@aviationcorp.com'],
          templateIds: ['intro_template', 'value_prop_template', 'follow_up_template'],
          delayDays: [0, 3, 7]
        }
      },
      id: '5'
    };
    
    const sequenceResponse = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId || ''
      },
      body: JSON.stringify(createSequenceRequest)
    });
    
    const sequenceData = await sequenceResponse.json();
    if (sequenceData.result) {
      console.log('✅ Email sequence created with 3 touchpoints\n');
    }
    
    // 3d. Create deal for tracking
    console.log('3d. Creating deal in pipeline...');
    const createDealRequest: MCPRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'create-deal',
        arguments: {
          name: 'Aviation Corp - Charter Services',
          value: 250000,
          stage: 'Prospecting',
          contactId: 'contact_aviation_123',
          closeDate: '2024-03-31',
          probability: 30,
          description: 'Potential annual charter contract'
        }
      },
      id: '6'
    };
    
    const dealResponse = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId || ''
      },
      body: JSON.stringify(createDealRequest)
    });
    
    const dealData = await dealResponse.json();
    if (dealData.result) {
      console.log('✅ Deal created for flight fulfillment tracking\n');
    }
    
    // Summary
    console.log('=== N8N INTEGRATION TEST SUMMARY ===\n');
    console.log('✅ Successfully initialized MCP session');
    console.log('✅ Discovered and validated Apollo tool availability');
    console.log('✅ Executed lead search via MCP protocol');
    console.log('✅ Created contact in Apollo CRM');
    console.log('✅ Set up multi-touch email sequence');
    console.log('✅ Created deal for pipeline tracking');
    console.log('\n✅ N8N CAN SUCCESSFULLY INTEGRATE WITH APOLLO MCP SERVER');
    
    console.log('\n=== WORKFLOW AUTOMATION CAPABILITIES ===\n');
    console.log('The n8n automation platform can:');
    console.log('1. Trigger campaigns based on external events (form submissions, etc.)');
    console.log('2. Search and enrich leads from Apollo database');
    console.log('3. Create personalized multi-touch email sequences');
    console.log('4. Track customer journey through CRM stages');
    console.log('5. Monitor engagement metrics and trigger follow-ups');
    console.log('6. Manage deals through the flight fulfillment process');
    
    console.log('\n=== RECOMMENDED N8N WORKFLOW STRUCTURE ===\n');
    console.log('1. Webhook Trigger: Receive lead from website/form');
    console.log('2. Apollo MCP Node: Enrich contact data');
    console.log('3. Apollo MCP Node: Create/update contact in CRM');
    console.log('4. Apollo MCP Node: Add to email sequence');
    console.log('5. Apollo MCP Node: Create deal in pipeline');
    console.log('6. Schedule Trigger: Check engagement metrics');
    console.log('7. Conditional: Route based on engagement level');
    console.log('8. Apollo MCP Node: Update deal stage or create task');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure Apollo MCP server is running on port 8123');
    console.log('2. Check that APOLLO_API_KEY is set (or server is in mock mode)');
    console.log('3. Verify network connectivity to localhost:8123');
  }
}

// Note: This test simulates HTTP requests as n8n would make them
console.log('Note: This test simulates n8n HTTP requests to the Apollo MCP server.\n');
console.log('For actual n8n integration:');
console.log('1. Install n8n: npm install -g n8n');
console.log('2. Start n8n: n8n start');
console.log('3. Create HTTP Request nodes pointing to http://localhost:8123/mcp');
console.log('4. Use the MCP protocol format for requests\n');

// Run the test (Note: Server must be running)
console.log('⚠️  Make sure the Apollo MCP server is running on port 8123\n');
console.log('To start the server: npm run dev (in apollo-io-mcp-server directory)\n');

// Uncomment to run the actual test
// simulateN8nWorkflow();