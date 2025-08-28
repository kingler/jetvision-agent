# Apollo API Key Configuration for n8n MCP Client

## Current Architecture Analysis

Based on the Apollo MCP server code analysis, the API key authentication works as follows:

### Server-Side Authentication (Current Implementation)
- The Apollo API key (`bj015A7ynPgcjjhrQ_fN_Q`) is configured as an environment variable on the Cloudflare Worker
- The server retrieves the API key from `env.APOLLO_API_KEY` 
- The MCP client only needs to provide a session ID via the `mcp-session-id` header
- **No API key is passed from client to server via HTTP headers**

## Recommended Approach: Server-Side Configuration

### Your Current n8n Configuration is Correct
```json
{
  "parameters": {
    "endpointUrl": "https://apollo-mcp.designthru.ai/mcp",
    "serverTransport": "httpStreamable"
  }
}
```

### Steps to Configure the API Key:
1. **Set the API key on your Cloudflare Worker**:
   - Go to your Cloudflare Dashboard
   - Navigate to Workers & Pages
   - Select your Apollo MCP Worker
   - Go to Settings → Environment Variables
   - Add: `APOLLO_API_KEY = bj015A7ynPgcjjhrQ_fN_Q`

2. **Deploy the Worker** with the new environment variable

3. **Use your existing n8n configuration** - no changes needed

## Alternative Approach: Client-Side Headers (Requires Server Modification)

If you want to pass the API key from n8n to the server, you would need to:

### 1. Modify the Apollo MCP Server
Update the server to accept API keys via headers:

```typescript
// In apollo-io-mcp-server/src/worker.ts
router.post('/mcp/tools/call', async (request: Request, env: Env) => {
  const sessionId = request.headers.get('mcp-session-id');
  const clientApiKey = request.headers.get('X-Apollo-API-Key');
  
  // Use client-provided API key if available, otherwise fall back to env
  const apiKey = clientApiKey || env.APOLLO_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'API key required' },
      id: null,
    }), { status: 401, headers: corsHeaders });
  }
  
  // Initialize Apollo tools with the API key
  globalThis.APOLLO_API_KEY = apiKey;
  apolloTools = new ApolloTools();
  
  // ... rest of the handler
});
```

### 2. Update n8n Configuration
```json
{
  "parameters": {
    "endpointUrl": "https://apollo-mcp.designthru.ai/mcp",
    "serverTransport": "httpStreamable",
    "additionalHeaders": {
      "X-Apollo-API-Key": "bj015A7ynPgcjjhrQ_fN_Q"
    }
  }
}
```

### 3. Update CORS Headers
Add the custom header to allowed headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, mcp-session-id, X-Apollo-API-Key',
  'Access-Control-Max-Age': '86400',
};
```

## Security Considerations

### Server-Side (Recommended)
✅ **Pros:**
- API key is not exposed in client configuration
- Centralized key management
- No risk of key exposure in n8n workflows

❌ **Cons:**
- Requires server deployment to change keys
- All clients use the same API key

### Client-Side Headers
✅ **Pros:**
- Different clients can use different API keys
- Easy to change keys without server deployment

❌ **Cons:**
- API key is visible in n8n workflow configuration
- Risk of accidental exposure in logs or exports
- Requires server code modification

## Recommendation

**Use the server-side approach** for the following reasons:

1. **Security**: API keys are not exposed in client configurations
2. **Simplicity**: Your current n8n configuration works without modification
3. **Maintenance**: Easier to manage API keys centrally
4. **Best Practice**: Follows the principle of keeping secrets server-side

## Implementation Steps

1. **Configure the Cloudflare Worker environment variable**:
   ```
   APOLLO_API_KEY=bj015A7ynPgcjjhrQ_fN_Q
   ```

2. **Use your existing n8n configuration**:
   ```json
   {
     "parameters": {
       "endpointUrl": "https://apollo-mcp.designthru.ai/mcp",
       "serverTransport": "httpStreamable"
     }
   }
   ```

3. **Test the connection** using n8n's built-in test functionality

The MCP transport will automatically handle session management and authentication with the server.
