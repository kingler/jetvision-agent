/**
 * Cloudflare Worker adapter for Apollo.io MCP Server
 */

import { Router } from 'itty-router';
import { ApolloTools } from './apollo-tools';

export interface Env {
  APOLLO_API_KEY: string;
  SESSIONS: KVNamespace;
  NODE_ENV: string;
  LOG_LEVEL: string;
}

const router = Router();

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

// Handle OPTIONS requests for CORS
router.options('*', () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
});

// MCP initialize endpoint
router.post('/mcp/initialize', async (request: Request, extra: any) => {
  const env = extra as Env;
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
});

// MCP tools list endpoint
router.post('/mcp/tools/list', async (request: Request, extra: any) => {
  const env = extra as Env;
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
  
  const sessionId = request.headers.get('mcp-session-id');
  
  // Session ID is optional for tools/list
  // Some clients may not maintain sessions

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

  const body = await request.json() as any;

  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    result: { tools },
    id: body.id,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

// MCP tool call endpoint
router.post('/mcp/tools/call', async (request: Request, extra: any) => {
  const env = extra as Env;
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
  
  const sessionId = request.headers.get('mcp-session-id');
  // Session ID is optional for tools/call

  const body = await request.json() as any;
  
  // Initialize Apollo tools with API key from environment
  if (!apolloTools) {
    // Pass the API key directly to ApolloTools constructor
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
});

// Simplified MCP endpoint that routes based on method
router.post('/mcp', async (request: Request, extra: any) => {
  const env = extra as Env;
  const body = await request.json() as any;
  const method = body.method;

  if (method === 'initialize') {
    return router.handle(new Request(new URL('/mcp/initialize', request.url), {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    }), extra);
  } else if (method === 'tools/list') {
    return router.handle(new Request(new URL('/mcp/tools/list', request.url), {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    }), extra);
  } else if (method === 'tools/call') {
    return router.handle(new Request(new URL('/mcp/tools/call', request.url), {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    }), extra);
  }

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
});

// Health check endpoint
router.get('/health', () => {
  return new Response(JSON.stringify({
    status: 'healthy',
    service: 'apollo-io-mcp-server',
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

// 404 handler
router.all('*', () => {
  return new Response('Not Found', {
    status: 404,
    headers: corsHeaders,
  });
});

// Export worker
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Pass env and ctx in the correct format for itty-router
    return router.handle(request, {
      env,
      ctx,
      ...env
    }) || new Response('Not Found', { status: 404 });
  },
};