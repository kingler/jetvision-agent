# n8n MCP Client - Streamable HTTP Transport Configuration Guide

## Overview

This guide provides the complete configuration for connecting n8n MCP Client nodes to streamable HTTP MCP servers. The streamable HTTP transport uses HTTP POST for sending messages and HTTP GET with Server-Sent Events (SSE) for receiving messages.

## Transport Configuration Parameters

### Core Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionType` | string | Yes | Must be set to `"streamable-http"` |
| `serverUrl` | string | Yes | Base URL of the MCP server endpoint |
| `protocolVersion` | string | Yes | MCP protocol version (typically `"0.1.0"`) |
| `clientInfo.name` | string | Yes | Unique identifier for the client |
| `clientInfo.version` | string | Yes | Version of the client application |

### HTTP Headers

```json
{
  "headers": {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
}
```

### Reconnection Options

```json
{
  "reconnectionOptions": {
    "maxRetries": 3,
    "initialReconnectionDelay": 1000,
    "maxReconnectionDelay": 30000,
    "reconnectionDelayGrowFactor": 1.5
  }
}
```

### Session Management

```json
{
  "sessionManagement": {
    "enableSessionPersistence": true,
    "sessionTimeout": 3600
  }
}
```

## Server Endpoints

### Apollo.io MCP Server
- **URL**: `https://apollo-mcp.designthru.ai/mcp`
- **Purpose**: Lead generation, campaign management, executive assistant targeting
- **Session Management**: Automatic via `mcp-session-id` header

### Avainode MCP Server
- **URL**: `https://avainode-mcp.designthru.ai/mcp`
- **Purpose**: Private jet charter search, aircraft availability, booking management
- **Session Management**: Automatic via `mcp-session-id` header

## n8n Node Configuration

### Basic MCP Client Node Setup

1. **Add MCP Client Node**: Drag the `@n8n/n8n-nodes-langchain.mcpClientTool` node to your workflow
2. **Set Connection Type**: Select `"streamable-http"` from the dropdown
3. **Configure Server URL**: Enter the MCP server endpoint URL
4. **Set Client Information**: Provide unique name and version

### Complete Node Parameters

```json
{
  "parameters": {
    "connectionType": "streamable-http",
    "serverUrl": "https://apollo-mcp.designthru.ai/mcp",
    "clientInfo": {
      "name": "n8n-jetvision-apollo-client",
      "version": "1.0.0"
    },
    "protocolVersion": "0.1.0",
    "headers": {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    "reconnectionOptions": {
      "maxRetries": 3,
      "initialReconnectionDelay": 1000,
      "maxReconnectionDelay": 30000,
      "reconnectionDelayGrowFactor": 1.5
    },
    "sessionManagement": {
      "enableSessionPersistence": true,
      "sessionTimeout": 3600
    }
  }
}
```

## Authentication Configuration

### MCP Client Credentials

Create credentials in n8n for each MCP server:

1. **Apollo MCP Credentials**:
   - Name: `Apollo MCP Credentials`
   - Type: `mcpClientApi`
   - Server URL: `https://apollo-mcp.designthru.ai/mcp`

2. **Avainode MCP Credentials**:
   - Name: `Avainode MCP Credentials`
   - Type: `mcpClientApi`
   - Server URL: `https://avainode-mcp.designthru.ai/mcp`

## Error Handling

### Common Error Codes

- **401**: Missing or invalid session ID
- **404**: Tool or method not found
- **429**: Rate limit exceeded
- **500**: Internal server error

### Reconnection Strategy

The transport implements exponential backoff with the following behavior:
- Initial delay: 1 second
- Maximum delay: 30 seconds
- Growth factor: 1.5x per attempt
- Maximum retries: 3 attempts

## Testing Configuration

### cURL Test Commands

```bash
# Test Apollo MCP Server
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "0.1.0",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    },
    "id": 1
  }'

# Test Avainode MCP Server
curl -X POST https://avainode-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "0.1.0",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    },
    "id": 1
  }'
```

## Implementation Notes

1. **Session Persistence**: Sessions are maintained via the `mcp-session-id` header
2. **Automatic Reconnection**: The transport handles connection drops with exponential backoff
3. **CORS Support**: Servers are configured to allow browser-based clients
4. **Rate Limiting**: Monitor usage to avoid Cloudflare Worker limits

## Next Steps

1. Import the provided workflow configuration into n8n
2. Configure credentials for each MCP server
3. Test the connection using the built-in n8n test functionality
4. Monitor logs for any connection issues or errors
