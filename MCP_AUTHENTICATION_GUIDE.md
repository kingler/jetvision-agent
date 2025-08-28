# MCP Authentication Guide for n8n Integration

## Current Setup Analysis

Based on your n8n configuration, you're trying to use Bearer authentication with the MCP servers. However, the MCP protocol specification and our current implementation have specific authentication considerations.

## The Authentication Challenge

### Your Current n8n Configuration
- **Apollo MCP**: Attempting Bearer authentication
- **Avainode MCP**: No authentication configured

### The Issue
The MCP protocol doesn't traditionally require authentication at the protocol level. Instead:
1. The MCP server stores API keys (like Apollo.io API key) as environment variables
2. Authentication happens between the MCP server and the external service
3. The MCP client (n8n) doesn't need to authenticate to use the MCP server

## Optimal Authentication Approaches

### Approach 1: No MCP Authentication (Current Implementation) ✅ RECOMMENDED
**How it works:**
- MCP servers store service API keys as Cloudflare secrets
- n8n connects without authentication
- Security is managed at the infrastructure level

**Configuration in n8n:**
```json
{
  "endpointUrl": "https://apollo-mcp.kingler.workers.dev/mcp",
  "serverTransport": "httpStreamable",
  "authentication": "none"  // No authentication required
}
```

**Pros:**
- Simple setup
- Works immediately
- API keys are secure on the server

**Cons:**
- MCP endpoints are publicly accessible
- Relies on obscurity and rate limiting

### Approach 2: Optional Bearer Token (Enhanced Security)
**Implementation:**
Add an optional MCP_ACCESS_TOKEN to validate incoming requests.

**Server-side configuration:**
```javascript
// In Cloudflare Worker environment variables
MCP_ACCESS_TOKEN = "your-secure-mcp-access-token"

// In worker-n8n.ts
if (authHeader || apiKeyHeader) {
  const providedKey = authHeader ? authHeader.replace('Bearer ', '') : apiKeyHeader;
  if (env.MCP_ACCESS_TOKEN && providedKey !== env.MCP_ACCESS_TOKEN) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid authentication token' }
    }), { status: 401 });
  }
}
```

**n8n Configuration:**
```json
{
  "endpointUrl": "https://apollo-mcp.kingler.workers.dev/mcp",
  "serverTransport": "httpStreamable",
  "authentication": "bearerAuth",
  "credentials": {
    "httpBearerAuth": {
      "token": "your-secure-mcp-access-token"
    }
  }
}
```

### Approach 3: Custom Header Authentication
**Implementation:**
Use a custom header like X-API-Key for authentication.

**n8n Configuration:**
```json
{
  "endpointUrl": "https://apollo-mcp.kingler.workers.dev/mcp",
  "serverTransport": "httpStreamable",
  "authentication": "genericHeaderAuth",
  "credentials": {
    "httpHeaderAuth": {
      "name": "X-API-Key",
      "value": "your-secure-api-key"
    }
  }
}
```

## Recommended Solution for Your Setup

### For Immediate Use (No Changes Required):
1. Set authentication to "none" in both n8n MCP client nodes
2. The servers already have the real API keys (Apollo.io, Avainode) stored securely

### For Production (Enhanced Security):
1. Add MCP_ACCESS_TOKEN to Cloudflare secrets
2. Update worker-n8n.ts to validate the token (optional)
3. Configure n8n with Bearer authentication using the MCP_ACCESS_TOKEN

## Step-by-Step Configuration

### 1. Update n8n Apollo MCP Client Node:
```json
{
  "parameters": {
    "endpointUrl": "https://apollo-mcp.kingler.workers.dev/mcp",
    "serverTransport": "httpStreamable",
    "authentication": "none"  // Change from "bearerAuth" to "none"
  },
  "type": "@n8n/n8n-nodes-langchain.mcpClientTool",
  "name": "Apollo io MCP Client"
}
```

### 2. Update n8n Avainode MCP Client Node:
```json
{
  "parameters": {
    "endpointUrl": "https://avainode-mcp.kingler.workers.dev/mcp",  // Use workers.dev URL
    "serverTransport": "httpStreamable",
    "authentication": "none"
  },
  "type": "@n8n/n8n-nodes-langchain.mcpClientTool",
  "name": "Avainode MCP Client"
}
```

## Security Best Practices

### 1. Rate Limiting
Both MCP servers should implement rate limiting:
- Apollo: 60 requests/minute (standard), 30 requests/minute (bulk)
- Avainode: Configure based on API limits

### 2. CORS Configuration
Already configured to allow necessary origins while maintaining security.

### 3. Session Management
- Sessions expire after 1 hour
- UUID-based session IDs stored in KV namespace

### 4. Environment Variables
Never expose actual API keys to clients:
- `APOLLO_API_KEY`: Stored in Cloudflare secrets
- `AVAINODE_API_KEY`: Stored in Cloudflare secrets
- `MCP_ACCESS_TOKEN`: (Optional) For MCP-level authentication

## Testing the Configuration

### Test without authentication:
```bash
curl -X POST https://apollo-mcp.kingler.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "1.0.0",
      "clientInfo": {"name": "test", "version": "1.0.0"}
    },
    "id": "test-1"
  }'
```

### Test with Bearer token (if configured):
```bash
curl -X POST https://apollo-mcp.kingler.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-mcp-access-token" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": "test-2"
  }'
```

## Troubleshooting

### Error: "Could not connect to your MCP server"
**Solution:** Set authentication to "none" in n8n MCP client node

### Error: "Invalid authentication token"
**Solution:** Either:
1. Remove authentication requirement (set to "none")
2. Ensure the Bearer token matches MCP_ACCESS_TOKEN in Cloudflare

### Error: "Method not found"
**Solution:** Ensure the endpoint URL ends with `/mcp`

## Summary

The optimal approach for your use case is to:
1. **Immediate:** Use no authentication at the MCP level (set authentication to "none" in n8n)
2. **Production:** Add optional MCP_ACCESS_TOKEN for an additional security layer
3. **Keep API keys server-side:** Never expose Apollo.io or Avainode API keys to clients

This approach balances security, simplicity, and compatibility with n8n's MCP client implementation.