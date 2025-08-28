/**
 * Simple Cloudflare Worker adapter for Apollo.io MCP Server
 */

import { ApolloTools } from './apollo-tools';

export interface Env {
  APOLLO_API_KEY: string;
  SESSIONS: KVNamespace;
  NODE_ENV: string;
  LOG_LEVEL: string;
}

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-API-Key, mcp-session-id',
  'Access-Control-Max-Age': '86400',
};

// Initialize Apollo tools
let apolloTools: ApolloTools;

// Authentication middleware
function authenticateRequest(request: Request, env: Env): boolean {
  // Check for API key in various headers
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key');
  
  // Extract API key from Authorization header (Bearer token format)
  let clientApiKey: string | null = null;
  
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      clientApiKey = authHeader.substring(7);
    } else if (authHeader.startsWith('ApiKey ')) {
      clientApiKey = authHeader.substring(7);
    } else {
      clientApiKey = authHeader;
    }
  } else if (apiKeyHeader) {
    clientApiKey = apiKeyHeader;
  }
  
  // For n8n integration, we validate that the client has the Apollo API key
  // This ensures only authorized clients can use the MCP server
  return clientApiKey === env.APOLLO_API_KEY;
}

async function handleMcpInitialize(request: Request, env: Env): Promise<Response> {
  // Check authentication
  if (!authenticateRequest(request, env)) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Authentication required. Please provide valid API key.',
      },
      id: null,
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const body = await request.json() as any;
  return handleMcpInitializeWithBody(body, env);
}

async function handleMcpInitializeWithBody(body: any, env: Env): Promise<Response> {
  // Generate session ID
  const sessionId = crypto.randomUUID();
  
  // Store session in KV
  await env.SESSIONS.put(sessionId, JSON.stringify({
    created: new Date().toISOString(),
    protocolVersion: body.params?.protocolVersion || '0.1.0',
    clientInfo: body.params?.clientInfo || {},
  }), {
    expirationTtl: 3600 // 1 hour TTL
  });

  const response = {
    jsonrpc: '2.0',
    result: {
      protocolVersion: '0.1.0',
      serverInfo: {
        name: 'apollo-io-mcp-server',
        version: '1.0.0',
      },
      capabilities: {
        tools: {},
        logging: {},
      },
    },
    id: body.id,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'mcp-session-id': sessionId,
    },
  });
}

async function handleMcpToolsList(request: Request, env: Env): Promise<Response> {
  // Check authentication
  if (!authenticateRequest(request, env)) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Authentication required. Please provide valid API key.',
      },
      id: null,
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const body = await request.json() as any;
  return handleMcpToolsListWithBody(body, env);
}

async function handleMcpToolsListWithBody(body: any, env: Env): Promise<Response> {

  const tools = [
    {
      name: 'search-leads',
      description: 'Search for prospects based on job title, industry, company size, and location',
      inputSchema: {
        type: 'object',
        properties: {
          jobTitle: { type: 'string' },
          industry: { type: 'string' },
          companySize: { type: 'string' },
          location: { type: 'string' },
          limit: { type: 'number', default: 25 },
        },
      },
    },
    {
      name: 'enrich-contact',
      description: 'Enrich contact information with additional data from Apollo.io',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          linkedinUrl: { type: 'string' },
        },
        required: ['email'],
      },
    },
    {
      name: 'create-email-sequence',
      description: 'Create an automated email sequence for lead nurturing',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          contacts: { type: 'array', items: { type: 'string' } },
          templateIds: { type: 'array', items: { type: 'string' } },
          delayDays: { type: 'array', items: { type: 'number' } },
        },
        required: ['name', 'contacts'],
      },
    },
    {
      name: 'get-account-data',
      description: 'Retrieve account-based marketing data for a company',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          includeContacts: { type: 'boolean', default: true },
        },
        required: ['domain'],
      },
    },
    {
      name: 'track-engagement',
      description: 'Track email and call engagement metrics for campaigns',
      inputSchema: {
        type: 'object',
        properties: {
          sequenceId: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
        required: ['sequenceId'],
      },
    },
  ];

  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    result: { tools },
    id: body.id,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleMcpToolCall(request: Request, env: Env): Promise<Response> {
  // Check authentication
  if (!authenticateRequest(request, env)) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Authentication required. Please provide valid API key.',
      },
      id: null,
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json() as any;
  return handleMcpToolCallWithBody(body, env);
}

async function handleMcpToolCallWithBody(body: any, env: Env): Promise<Response> {
  
  // Initialize Apollo tools with API key from environment
  if (!apolloTools) {
    apolloTools = new ApolloTools(env.APOLLO_API_KEY);
  }

  try {
    const result = await apolloTools.handleToolCall({
      method: 'tools/call',
      params: body.params,
    });

    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      result,
      id: body.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
      id: body.id,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleMcp(request: Request, env: Env): Promise<Response> {
  // Check authentication first
  if (!authenticateRequest(request, env)) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Authentication required. Please provide valid API key.',
      },
      id: null,
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json() as any;
  const method = body.method;

  switch (method) {
    case 'initialize':
      // Pass the already parsed body instead of the request
      return handleMcpInitializeWithBody(body, env);
    case 'tools/list':
      return handleMcpToolsListWithBody(body, env);
    case 'tools/call':
      return handleMcpToolCallWithBody(body, env);
    default:
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

async function handleHealth(): Promise<Response> {
  return new Response(JSON.stringify({
    status: 'healthy',
    service: 'apollo-io-mcp-server',
    timestamp: new Date().toISOString(),
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

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Route requests
    if (path === '/health' && method === 'GET') {
      return handleHealth();
    } else if (path === '/mcp' && method === 'POST') {
      return handleMcp(request, env);
    } else if (path === '/mcp/initialize' && method === 'POST') {
      return handleMcpInitialize(request, env);
    } else if (path === '/mcp/tools/list' && method === 'POST') {
      return handleMcpToolsList(request, env);
    } else if (path === '/mcp/tools/call' && method === 'POST') {
      return handleMcpToolCall(request, env);
    } else {
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders,
      });
    }
  },
};