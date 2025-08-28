/**
 * N8N-Compatible Cloudflare Worker for Apollo.io MCP Server
 * This version allows n8n to connect without authentication for MCP protocol
 */

import { ApolloTools } from './apollo-tools-worker';

export interface Env {
  APOLLO_API_KEY: string;
  SESSIONS: KVNamespace;
  NODE_ENV: string;
  LOG_LEVEL: string;
  MCP_VERSION: string;
}

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-API-Key, mcp-session-id',
  'Access-Control-Max-Age': '86400',
};

// Get all available tools
function getTools() {
  return [
    {
      name: "search-leads",
      description: "Search for prospects based on job title, industry, company size, and location",
      inputSchema: {
        type: "object",
        properties: {
          jobTitle: { type: "string" },
          industry: { type: "string" },
          companySize: { type: "string" },
          location: { type: "string" },
          limit: { type: "number", default: 25 }
        }
      }
    },
    {
      name: "enrich-contact",
      description: "Enrich contact information with additional data from Apollo.io",
      inputSchema: {
        type: "object",
        properties: {
          email: { type: "string" },
          linkedinUrl: { type: "string" }
        },
        required: ["email"]
      }
    },
    {
      name: "create-email-sequence",
      description: "Create an automated email sequence for lead nurturing",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          contacts: { type: "array", items: { type: "string" } },
          templateIds: { type: "array", items: { type: "string" } },
          delayDays: { type: "array", items: { type: "number" } }
        },
        required: ["name", "contacts"]
      }
    },
    {
      name: "create-contact",
      description: "Create a new contact in Apollo.io CRM",
      inputSchema: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string" },
          title: { type: "string" },
          company: { type: "string" }
        },
        required: ["firstName", "lastName", "email"]
      }
    },
    {
      name: "create-deal",
      description: "Create a new sales deal in Apollo.io",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: { type: "number" },
          stage: { type: "string" },
          contactId: { type: "string" },
          closeDate: { type: "string" }
        },
        required: ["name", "value", "stage"]
      }
    },
    {
      name: "search-tasks",
      description: "Search for tasks with filters",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string" },
          priority: { type: "string" },
          assignedTo: { type: "string" }
        }
      }
    },
    {
      name: "search-sequences",
      description: "Search for existing email sequences",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          status: { type: "string" }
        }
      }
    },
    {
      name: "get-api-usage",
      description: "Get current API usage statistics",
      inputSchema: {
        type: "object",
        properties: {
          startDate: { type: "string" },
          endDate: { type: "string" }
        }
      }
    }
  ];
}

async function handleMcpRequest(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as any;
    const method = body.method;
    const sessionId = request.headers.get('mcp-session-id');

    // Initialize Apollo tools with the API key from environment
    const apolloTools = new ApolloTools(env.APOLLO_API_KEY || '');

    switch (method) {
      case 'initialize': {
        // Generate or use existing session ID
        const newSessionId = sessionId || crypto.randomUUID();
        
        // Store session in KV if not exists
        if (!sessionId) {
          await env.SESSIONS.put(newSessionId, JSON.stringify({
            created: new Date().toISOString(),
            protocolVersion: body.params?.protocolVersion || '1.0.0',
            clientInfo: body.params?.clientInfo || {},
          }), {
            expirationTtl: 3600, // 1 hour
          });
        }

        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '1.0.0',
            serverInfo: {
              name: 'apollo-io-mcp-server',
              version: env.MCP_VERSION || '1.0.0',
            },
            capabilities: {
              tools: true,
              logging: true,
            },
            sessionId: newSessionId,
          },
          id: body.id,
        }), {
          status: 200,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'mcp-session-id': newSessionId,
          },
        });
      }

      case 'tools/list': {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          result: {
            tools: getTools(),
          },
          id: body.id,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'tools/call': {
        const { name, arguments: args } = body.params || {};
        
        if (!name) {
          throw new Error('Tool name is required');
        }

        const result = await apolloTools.handleToolCall({
          params: {
            name,
            arguments: args || {},
          },
        } as any);

        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          result,
          id: body.id,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default: {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
          id: body.id,
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  } catch (error) {
    console.error('MCP Request Error:', error);
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
      id: null,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleHealth(): Promise<Response> {
  return new Response(JSON.stringify({
    status: 'healthy',
    service: 'apollo-io-mcp-server-n8n',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: getTools().length,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Export worker
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log(`[${method}] ${path}`);

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Route requests
    switch (path) {
      case '/health':
        return handleHealth();
      
      case '/mcp':
      case '/':
        if (method === 'POST') {
          return handleMcpRequest(request, env);
        }
        break;
        
      case '/mcp/initialize':
        if (method === 'POST') {
          // Redirect to main MCP endpoint with initialize method
          const body = await request.json();
          const newRequest = new Request(request.url.replace('/mcp/initialize', '/mcp'), {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify({ ...body, method: 'initialize' }),
          });
          return handleMcpRequest(newRequest, env);
        }
        break;
        
      case '/mcp/tools/list':
        if (method === 'POST') {
          const body = await request.json();
          const newRequest = new Request(request.url.replace('/mcp/tools/list', '/mcp'), {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify({ ...body, method: 'tools/list' }),
          });
          return handleMcpRequest(newRequest, env);
        }
        break;
        
      case '/mcp/tools/call':
        if (method === 'POST') {
          const body = await request.json();
          const newRequest = new Request(request.url.replace('/mcp/tools/call', '/mcp'), {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify({ ...body, method: 'tools/call' }),
          });
          return handleMcpRequest(newRequest, env);
        }
        break;
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};