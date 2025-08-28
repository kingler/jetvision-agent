# MCP Client Configuration Guide

## Configuration Files for Different MCP Clients

### 1. Claude Desktop App Configuration

Create or edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "apollo-io": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://apollo-mcp.designthru.ai/mcp",
        "-H", "Content-Type: application/json",
        "-H", "Accept: application/json"
      ],
      "env": {},
      "enabled": true
    },
    "avainode": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://avainode-mcp.designthru.ai/mcp",
        "-H", "Content-Type: application/json",
        "-H", "Accept: application/json"
      ],
      "env": {},
      "enabled": true
    }
  }
}
```

### 2. TypeScript/JavaScript Client Configuration

```typescript
// mcp-client-config.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';

// Apollo.io MCP Client Configuration
export const apolloClientConfig = {
  name: 'apollo-io-client',
  version: '1.0.0',
  serverUrl: 'https://apollo-mcp.designthru.ai/mcp',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// Avainode MCP Client Configuration
export const avainodeClientConfig = {
  name: 'avainode-client',
  version: '1.0.0',
  serverUrl: 'https://avainode-mcp.designthru.ai/mcp',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// Function to connect to Apollo.io MCP Server
export async function connectToApolloMCP() {
  const client = new Client({
    name: apolloClientConfig.name,
    version: apolloClientConfig.version,
  });

  // Since Cloudflare Workers use HTTP, we'll use fetch-based transport
  const response = await fetch(apolloClientConfig.serverUrl, {
    method: 'POST',
    headers: apolloClientConfig.headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: {
          name: apolloClientConfig.name,
          version: apolloClientConfig.version,
        },
      },
      id: 1,
    }),
  });

  const result = await response.json();
  const sessionId = response.headers.get('mcp-session-id');

  return { client, sessionId, result };
}

// Function to connect to Avainode MCP Server
export async function connectToAvainodeMCP() {
  const client = new Client({
    name: avainodeClientConfig.name,
    version: avainodeClientConfig.version,
  });

  const response = await fetch(avainodeClientConfig.serverUrl, {
    method: 'POST',
    headers: avainodeClientConfig.headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: {
          name: avainodeClientConfig.name,
          version: avainodeClientConfig.version,
        },
      },
      id: 1,
    }),
  });

  const result = await response.json();
  const sessionId = response.headers.get('mcp-session-id');

  return { client, sessionId, result };
}
```

### 3. Python Client Configuration

```python
# mcp_client_config.py
import requests
import json
from typing import Dict, Any, Optional

class MCPClientConfig:
    """MCP Client Configuration for JetVision Servers"""
    
    APOLLO_SERVER = "https://apollo-mcp.designthru.ai/mcp"
    AVAINODE_SERVER = "https://avainode-mcp.designthru.ai/mcp"
    
    def __init__(self):
        self.session_id: Optional[str] = None
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    def connect_to_apollo(self) -> Dict[str, Any]:
        """Connect to Apollo.io MCP Server"""
        
        payload = {
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": {
                "protocolVersion": "0.1.0",
                "capabilities": {},
                "clientInfo": {
                    "name": "python-mcp-client",
                    "version": "1.0.0"
                }
            },
            "id": 1
        }
        
        response = requests.post(
            self.APOLLO_SERVER,
            headers=self.headers,
            json=payload
        )
        
        self.session_id = response.headers.get("mcp-session-id")
        return response.json()
    
    def connect_to_avainode(self) -> Dict[str, Any]:
        """Connect to Avainode MCP Server"""
        
        payload = {
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": {
                "protocolVersion": "0.1.0",
                "capabilities": {},
                "clientInfo": {
                    "name": "python-mcp-client",
                    "version": "1.0.0"
                }
            },
            "id": 1
        }
        
        response = requests.post(
            self.AVAINODE_SERVER,
            headers=self.headers,
            json=payload
        )
        
        self.session_id = response.headers.get("mcp-session-id")
        return response.json()
    
    def call_tool(self, server_url: str, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool on the specified server"""
        
        if not self.session_id:
            raise Exception("Not connected. Call connect_to_apollo() or connect_to_avainode() first.")
        
        headers = {**self.headers, "mcp-session-id": self.session_id}
        
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            },
            "id": 2
        }
        
        response = requests.post(server_url, headers=headers, json=payload)
        return response.json()

# Usage example
if __name__ == "__main__":
    client = MCPClientConfig()
    
    # Connect to Apollo
    apollo_result = client.connect_to_apollo()
    print("Connected to Apollo:", apollo_result)
    
    # Search for leads
    leads = client.call_tool(
        MCPClientConfig.APOLLO_SERVER,
        "search-leads",
        {
            "jobTitle": "CEO",
            "industry": "Aviation",
            "companySize": "50-200",
            "location": "United States"
        }
    )
    print("Leads found:", leads)
```

### 4. Environment Variables Configuration (.env)

```bash
# .env file for your application
MCP_APOLLO_SERVER_URL=https://apollo-mcp.designthru.ai/mcp
MCP_AVAINODE_SERVER_URL=https://avainode-mcp.designthru.ai/mcp
MCP_CLIENT_NAME=jetvision-client
MCP_CLIENT_VERSION=1.0.0
MCP_PROTOCOL_VERSION=0.1.0
```

### 5. Node.js Client Example

```javascript
// mcp-client.js
const axios = require('axios');

class MCPClient {
  constructor() {
    this.apolloUrl = 'https://apollo-mcp.designthru.ai/mcp';
    this.avainodeUrl = 'https://avainode-mcp.designthru.ai/mcp';
    this.sessionId = null;
  }

  async connectToApollo() {
    try {
      const response = await axios.post(this.apolloUrl, {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: {
            name: 'nodejs-mcp-client',
            version: '1.0.0'
          }
        },
        id: 1
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      this.sessionId = response.headers['mcp-session-id'];
      return response.data;
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  async connectToAvainode() {
    try {
      const response = await axios.post(this.avainodeUrl, {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: {
            name: 'nodejs-mcp-client',
            version: '1.0.0'
          }
        },
        id: 1
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      this.sessionId = response.headers['mcp-session-id'];
      return response.data;
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  async listTools(serverUrl) {
    if (!this.sessionId) {
      throw new Error('Not connected. Call connectToApollo() or connectToAvainode() first.');
    }

    const response = await axios.post(serverUrl, {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 2
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'mcp-session-id': this.sessionId
      }
    });

    return response.data;
  }

  async callTool(serverUrl, toolName, args) {
    if (!this.sessionId) {
      throw new Error('Not connected. Call connectToApollo() or connectToAvainode() first.');
    }

    const response = await axios.post(serverUrl, {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      },
      id: 3
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'mcp-session-id': this.sessionId
      }
    });

    return response.data;
  }
}

// Usage
async function example() {
  const client = new MCPClient();
  
  // Connect to Apollo
  await client.connectToApollo();
  console.log('Connected to Apollo MCP Server');
  
  // List available tools
  const tools = await client.listTools(client.apolloUrl);
  console.log('Available tools:', tools);
  
  // Search for leads
  const leads = await client.callTool(
    client.apolloUrl,
    'search-leads',
    {
      jobTitle: 'CEO',
      industry: 'Aviation',
      companySize: '50-200',
      location: 'United States'
    }
  );
  console.log('Leads found:', leads);
  
  // Connect to Avainode
  await client.connectToAvainode();
  console.log('Connected to Avainode MCP Server');
  
  // Search for aircraft
  const aircraft = await client.callTool(
    client.avainodeUrl,
    'search-aircraft',
    {
      departureAirport: 'KJFK',
      arrivalAirport: 'KLAX',
      departureDate: '2024-03-15',
      passengers: 8
    }
  );
  console.log('Aircraft found:', aircraft);
}

module.exports = MCPClient;
```

### 6. cURL Examples for Testing

```bash
# Initialize Apollo session
SESSION_ID=$(curl -s -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "0.1.0",
      "capabilities": {},
      "clientInfo": {"name": "curl-client", "version": "1.0.0"}
    },
    "id": 1
  }' -i | grep -i "mcp-session-id:" | cut -d' ' -f2 | tr -d '\r')

echo "Session ID: $SESSION_ID"

# List tools
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'

# Call search-leads tool
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search-leads",
      "arguments": {
        "jobTitle": "CEO",
        "industry": "Aviation",
        "companySize": "50-200",
        "location": "United States"
      }
    },
    "id": 3
  }'
```

## Important Notes

1. **Session Management**: Sessions expire after 1 hour. Store the session ID from the initialize response.

2. **CORS**: The servers are configured with CORS headers to allow browser-based clients.

3. **Rate Limiting**: Cloudflare Workers have request limits. Monitor your usage.

4. **Authentication**: API keys are configured server-side via Cloudflare secrets.

## Error Handling

All clients should handle these common errors:

- **401**: Missing or invalid session ID
- **404**: Tool or method not found
- **429**: Rate limit exceeded
- **500**: Internal server error

## Monitoring

Monitor your API usage at:
https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/designthru.ai/workers-and-pages