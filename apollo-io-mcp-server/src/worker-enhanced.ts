/**
 * Enhanced Cloudflare Worker for Apollo.io MCP Server
 * Implements comprehensive Apollo.io API endpoints
 */

import { ApolloTools } from './apollo-tools-worker';

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

// Apollo API client
class ApolloAPIClient {
  private baseUrl = 'https://api.apollo.io/v1';
  
  constructor(private apiKey: string) {}

  async request(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Apollo API error: ${response.status} - ${error}`);
      }

      return response.json();
    } catch (error) {
      throw new Error(`Failed to call Apollo API: ${error}`);
    }
  }
}

// Authentication middleware
function authenticateRequest(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key');
  
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
  
  return clientApiKey === env.APOLLO_API_KEY;
}

async function handleMcpInitialize(request: Request, env: Env): Promise<Response> {
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
  const sessionId = crypto.randomUUID();
  
  await env.SESSIONS.put(sessionId, JSON.stringify({
    created: new Date().toISOString(),
    protocolVersion: body.params?.protocolVersion || '0.1.0',
    clientInfo: body.params?.clientInfo || {},
  }), {
    expirationTtl: 3600
  });

  const response = {
    jsonrpc: '2.0',
    result: {
      protocolVersion: '0.1.0',
      serverInfo: {
        name: 'apollo-io-mcp-server',
        version: '2.0.0',
        description: 'Enhanced Apollo.io MCP Server with comprehensive API coverage',
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
    // People/Contact Tools
    {
      name: 'people-search',
      description: 'Search for people/contacts in Apollo database with advanced filters',
      inputSchema: {
        type: 'object',
        properties: {
          q_person_name: { type: 'string', description: 'Person name to search' },
          q_person_title: { type: 'string', description: 'Job title keywords' },
          q_organization_name: { type: 'string', description: 'Company name' },
          person_locations: { type: 'array', items: { type: 'string' }, description: 'Locations (cities, states, countries)' },
          person_seniorities: { type: 'array', items: { type: 'string' }, description: 'Seniority levels' },
          contact_email_status: { type: 'array', items: { type: 'string' }, description: 'Email status (verified, guessed, etc)' },
          q_keywords: { type: 'string', description: 'Keywords to search' },
          organization_num_employees_ranges: { type: 'array', items: { type: 'string' }, description: 'Company size ranges' },
          revenue_range: { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } } },
          page: { type: 'number', default: 1 },
          per_page: { type: 'number', default: 25, maximum: 100 },
        },
      },
    },
    {
      name: 'people-enrich',
      description: 'Enrich a person/contact with additional data',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          organization_name: { type: 'string' },
          domain: { type: 'string' },
          linkedin_url: { type: 'string' },
        },
      },
    },
    {
      name: 'bulk-people-enrich',
      description: 'Enrich multiple people in bulk (up to 100)',
      inputSchema: {
        type: 'object',
        properties: {
          people: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                organization_name: { type: 'string' },
                domain: { type: 'string' },
              },
            },
            maxItems: 100,
          },
        },
        required: ['people'],
      },
    },

    // Organization/Company Tools
    {
      name: 'organization-search',
      description: 'Search for organizations/companies with filters',
      inputSchema: {
        type: 'object',
        properties: {
          q_organization_name: { type: 'string', description: 'Company name' },
          q_organization_domain: { type: 'string', description: 'Company domain' },
          organization_locations: { type: 'array', items: { type: 'string' } },
          organization_num_employees_ranges: { type: 'array', items: { type: 'string' } },
          organization_revenue_ranges: { type: 'array', items: { type: 'string' } },
          organization_industry_tag_ids: { type: 'array', items: { type: 'string' } },
          technologies: { type: 'array', items: { type: 'string' }, description: 'Technologies used' },
          organization_latest_funding_stage_cd: { type: 'array', items: { type: 'string' } },
          page: { type: 'number', default: 1 },
          per_page: { type: 'number', default: 25, maximum: 100 },
        },
      },
    },
    {
      name: 'organization-enrich',
      description: 'Enrich an organization with additional data',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          organization_name: { type: 'string' },
        },
      },
    },
    {
      name: 'bulk-organization-enrich',
      description: 'Enrich multiple organizations in bulk',
      inputSchema: {
        type: 'object',
        properties: {
          organizations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                domain: { type: 'string' },
                organization_name: { type: 'string' },
              },
            },
            maxItems: 100,
          },
        },
        required: ['organizations'],
      },
    },

    // Sequence/Engagement Tools
    {
      name: 'create-sequence',
      description: 'Create a new email sequence',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          permissions: { type: 'string', enum: ['team_can_view', 'team_can_use', 'private'] },
          active: { type: 'boolean', default: true },
          num_steps: { type: 'number' },
        },
        required: ['name'],
      },
    },
    {
      name: 'add-contacts-to-sequence',
      description: 'Add contacts to an existing sequence',
      inputSchema: {
        type: 'object',
        properties: {
          sequence_id: { type: 'string' },
          contact_ids: { type: 'array', items: { type: 'string' } },
          email_account_id: { type: 'string' },
          options: {
            type: 'object',
            properties: {
              start_date: { type: 'string', format: 'date' },
              skip_weekends: { type: 'boolean', default: true },
            },
          },
        },
        required: ['sequence_id', 'contact_ids'],
      },
    },
    {
      name: 'remove-contact-from-sequence',
      description: 'Remove a contact from a sequence',
      inputSchema: {
        type: 'object',
        properties: {
          sequence_id: { type: 'string' },
          contact_id: { type: 'string' },
        },
        required: ['sequence_id', 'contact_id'],
      },
    },

    // Account/List Management
    {
      name: 'create-account',
      description: 'Create a new account',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          domain: { type: 'string' },
          phone_number: { type: 'string' },
          company_type: { type: 'string' },
          industry: { type: 'string' },
          website_url: { type: 'string' },
        },
        required: ['name'],
      },
    },
    {
      name: 'update-account',
      description: 'Update an existing account',
      inputSchema: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          name: { type: 'string' },
          domain: { type: 'string' },
          phone_number: { type: 'string' },
          industry: { type: 'string' },
        },
        required: ['account_id'],
      },
    },
    {
      name: 'add-contacts-to-list',
      description: 'Add contacts to a list',
      inputSchema: {
        type: 'object',
        properties: {
          list_id: { type: 'string' },
          contact_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['list_id', 'contact_ids'],
      },
    },

    // Email Tools
    {
      name: 'verify-email',
      description: 'Verify if an email address is valid',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
        },
        required: ['email'],
      },
    },
    {
      name: 'find-email',
      description: 'Find email address for a person',
      inputSchema: {
        type: 'object',
        properties: {
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          organization_name: { type: 'string' },
          domain: { type: 'string' },
        },
        required: ['first_name', 'last_name'],
      },
    },

    // Analytics/Reporting
    {
      name: 'get-email-analytics',
      description: 'Get email campaign analytics',
      inputSchema: {
        type: 'object',
        properties: {
          sequence_id: { type: 'string' },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
        },
      },
    },
    {
      name: 'get-sequence-stats',
      description: 'Get sequence performance statistics',
      inputSchema: {
        type: 'object',
        properties: {
          sequence_id: { type: 'string' },
        },
        required: ['sequence_id'],
      },
    },

    // Data Export
    {
      name: 'export-contacts',
      description: 'Export contacts from a list or search',
      inputSchema: {
        type: 'object',
        properties: {
          list_id: { type: 'string' },
          format: { type: 'string', enum: ['csv', 'json'], default: 'json' },
          fields: { type: 'array', items: { type: 'string' } },
        },
      },
    },

    // User/Team Management
    {
      name: 'get-user-info',
      description: 'Get current user information and credits',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get-credit-usage',
      description: 'Get credit usage information',
      inputSchema: {
        type: 'object',
        properties: {
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
        },
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
  const { name, arguments: args } = body.params;
  const client = new ApolloAPIClient(env.APOLLO_API_KEY);

  try {
    let result: any;

    switch (name) {
      // People/Contact endpoints
      case 'people-search':
        result = await client.request('/mixed_people/search', 'POST', args);
        break;
      
      case 'people-enrich':
        result = await client.request('/people/match', 'POST', args);
        break;
      
      case 'bulk-people-enrich':
        result = await client.request('/people/bulk_match', 'POST', args);
        break;

      // Organization endpoints
      case 'organization-search':
        result = await client.request('/mixed_companies/search', 'POST', args);
        break;
      
      case 'organization-enrich':
        result = await client.request('/organizations/enrich', 'POST', args);
        break;
      
      case 'bulk-organization-enrich':
        result = await client.request('/organizations/bulk_enrich', 'POST', args);
        break;

      // Sequence endpoints
      case 'create-sequence':
        result = await client.request('/emailer_campaigns/create', 'POST', args);
        break;
      
      case 'add-contacts-to-sequence':
        result = await client.request(`/emailer_campaigns/${args.sequence_id}/add_contact_ids`, 'POST', {
          contact_ids: args.contact_ids,
          email_account_id: args.email_account_id,
          options: args.options,
        });
        break;
      
      case 'remove-contact-from-sequence':
        result = await client.request(`/emailer_campaigns/${args.sequence_id}/remove_contact_ids`, 'POST', {
          contact_ids: [args.contact_id],
        });
        break;

      // Account endpoints
      case 'create-account':
        result = await client.request('/accounts/create', 'POST', args);
        break;
      
      case 'update-account':
        const { account_id, ...updateData } = args;
        result = await client.request(`/accounts/${account_id}/update`, 'POST', updateData);
        break;

      // List management
      case 'add-contacts-to-list':
        result = await client.request(`/lists/${args.list_id}/add_contact_ids`, 'POST', {
          contact_ids: args.contact_ids,
        });
        break;

      // Email tools
      case 'verify-email':
        result = await client.request('/emails/verify', 'POST', args);
        break;
      
      case 'find-email':
        result = await client.request('/people/match', 'POST', args);
        break;

      // Analytics
      case 'get-email-analytics':
        result = await client.request(`/emailer_campaigns/${args.sequence_id}/analytics`, 'GET');
        break;
      
      case 'get-sequence-stats':
        result = await client.request(`/emailer_campaigns/${args.sequence_id}`, 'GET');
        break;

      // Export
      case 'export-contacts':
        result = await client.request('/contacts/export', 'POST', args);
        break;

      // User management
      case 'get-user-info':
        result = await client.request('/users/me', 'GET');
        break;
      
      case 'get-credit-usage':
        result = await client.request('/credit_usage', 'GET');
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      },
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
    service: 'apollo-io-mcp-server-enhanced',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    endpoints: 19,
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