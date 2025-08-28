// MCP Proxy Route - Handles communication with MCP servers
import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { Readable } from 'stream';
import { ReadableStream } from 'stream/web';
import { getMCPServerUrl, MCPServerType } from '@/lib/mcp-config';

// Initialize Redis if credentials are available
let redis: Redis | null = null;
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

// Store sessions globally for access across requests
declare global {
  var _mcpSessions: Record<string, { serverType: MCPServerType; serverUrl: string }>;
}

global._mcpSessions = global._mcpSessions || {};

export async function GET(request: NextRequest) {
  const serverParam = request.nextUrl.searchParams.get('server');
  const serverType = request.nextUrl.searchParams.get('serverType') as MCPServerType;
  
  // Determine the server URL
  let serverUrl: string | null = null;
  let resolvedServerType: MCPServerType | null = null;
  
  if (serverType) {
    serverUrl = getMCPServerUrl(serverType);
    resolvedServerType = serverType;
  } else if (serverParam) {
    // Check if serverParam is a known server type
    if (serverParam in ['apollo-io', 'avainode', 'hackernews']) {
      serverUrl = getMCPServerUrl(serverParam as MCPServerType);
      resolvedServerType = serverParam as MCPServerType;
    } else {
      // Assume it's a direct URL
      serverUrl = serverParam;
      resolvedServerType = 'hackernews'; // Default fallback
    }
  }
  
  if (!serverUrl) {
    return NextResponse.json({ error: 'MCP server not found or disabled' }, { status: 404 });
  }

  // Generate a new session ID for this connection
  const newSessionId = randomUUID();
  
  // Store the session for later reference
  global._mcpSessions[newSessionId] = { 
    serverType: resolvedServerType!, 
    serverUrl 
  };
  console.log(`Created session ${newSessionId} for server ${resolvedServerType} at ${serverUrl}`);
  
  try {
    const response = await fetch(serverUrl, {
      method: 'GET',
      headers: {
        ...Object.fromEntries(request.headers),
        host: new URL(serverUrl).host,
      },
    });

    if (!response.body) {
      throw new Error('No response body from MCP server');
    }

    // Convert node-fetch's body to a web-compatible ReadableStream
    const nodeReadable = response.body as unknown as Readable;
    
    // Create web ReadableStream from Node.js Readable
    const stream = new ReadableStream({
      start(controller) {
        // Handle data from the node stream
        nodeReadable.on('data', async (chunk) => {
          const chunkString = chunk.toString('utf-8');
          const sessionId = chunkString.match(/sessionId=([^&]+)/)?.[1];

          if (sessionId && redis) {
            console.log(`Setting session ${sessionId} for server ${resolvedServerType}`);
            await redis.set(`mcp:session:${sessionId}`, serverUrl);
          }
          controller.enqueue(chunk);
        });
        
        nodeReadable.on('end', () => {
          controller.close();
          delete global._mcpSessions[newSessionId];
          console.log(`Session ${newSessionId} closed normally`);
        });
        
        nodeReadable.on('error', (err) => {
          console.error(`Stream error for session ${newSessionId}:`, err);
          controller.error(err);
          delete global._mcpSessions[newSessionId];
        });
      },
      cancel() {
        nodeReadable.destroy();
        delete global._mcpSessions[newSessionId];
        console.log(`Session ${newSessionId} canceled`);
      }
    });

    // Convert stream/web ReadableStream to standard web ReadableStream
    const transformedStream = new Response(stream as any).body;
    
    return new NextResponse(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-MCP-Server': resolvedServerType!,
      },
    });
  } catch (error) {
    console.error('Error proxying SSE request:', error);
    delete global._mcpSessions[newSessionId];
    return NextResponse.json({ error: 'Failed to connect to MCP server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log("MCP Proxy POST request received");
  
  const serverParam = request.nextUrl.searchParams.get('server');
  const serverType = request.nextUrl.searchParams.get('serverType') as MCPServerType;
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  
  // Determine the server URL
  let serverUrl: string | null = null;
  
  if (sessionId && global._mcpSessions[sessionId]) {
    // Use session-stored server info
    serverUrl = global._mcpSessions[sessionId].serverUrl;
    console.log(`Using session ${sessionId} server: ${serverUrl}`);
  } else if (serverType) {
    serverUrl = getMCPServerUrl(serverType);
    console.log(`Using serverType ${serverType}: ${serverUrl}`);
  } else if (serverParam) {
    // Check if serverParam is a known server type
    if (serverParam in ['apollo-io', 'avainode', 'hackernews']) {
      serverUrl = getMCPServerUrl(serverParam as MCPServerType);
    } else {
      // Assume it's a direct URL
      serverUrl = serverParam;
    }
    console.log(`Using server param: ${serverUrl}`);
  }
  
  if (!serverUrl) {
    console.error('POST request - No server URL found');
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32602, message: "Missing or invalid server parameter" },
        id: null
      }, 
      { status: 400 }
    );
  }
  
  console.log(`Forwarding JSONRPC POST to: ${serverUrl}`);
  
  try {
    let jsonRpcRequest;
    try {
      const body = await request.text();
      jsonRpcRequest = JSON.parse(body);
      console.log(`JSONRPC Request method: ${jsonRpcRequest.method}`);
      
      // Validate basic JSONRPC structure
      if (!jsonRpcRequest.jsonrpc || jsonRpcRequest.jsonrpc !== "2.0" || !jsonRpcRequest.method) {
        throw new Error("Invalid JSONRPC request");
      }
    } catch (err) {
      console.error("Error parsing JSONRPC request:", err);
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: { code: -32700, message: "Parse error" },
          id: null
        },
        { status: 400 }
      );
    }
    
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: new URL(serverUrl).host,
      },
      body: JSON.stringify(jsonRpcRequest),
    });

    const responseText = await response.text();
    console.log(`JSONRPC response status: ${response.status}`);
    
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText);
      
      // Log successful tool calls
      if (jsonResponse.result && jsonRpcRequest.method === 'tools/call') {
        console.log(`Tool ${jsonRpcRequest.params?.name} executed successfully`);
      }
    } catch (err) {
      console.error("Error parsing JSONRPC response:", err);
      jsonResponse = {
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal error: Invalid JSON response from server" },
        id: jsonRpcRequest.id || null
      };
    }
    
    return NextResponse.json(jsonResponse, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error(`Error in POST handler:`, error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: `Internal error: ${error}` },
        id: null
      }, 
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}