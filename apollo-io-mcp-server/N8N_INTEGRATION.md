# n8n MCP Client Integration Guide for Apollo.io MCP Server

## Server Deployment

The Apollo.io MCP server is deployed on Cloudflare Workers at:
- **Production URL**: `https://apollo-mcp.kingler.workers.dev/mcp`
- **Custom Domain** (when configured): `https://apollo-mcp.designthru.ai/mcp`

## n8n MCP Client Node Configuration

### Required Settings

1. **Endpoint URL**: `https://apollo-mcp.kingler.workers.dev/mcp`
2. **Server Transport**: `httpStreamable` or `http`
3. **Authentication**: 
   - Method: `API Key` or `Bearer Token`
   - Header Name: `Authorization`
   - Header Value: `Bearer bj015A7ynPgcjjhrQ_fN_Q` (format: Bearer YOUR_APOLLO_API_KEY)
   - Alternative: Use `X-API-Key` header with just the API key value

### Complete n8n Node Configuration

```json
{
  "nodes": [
    {
      "parameters": {
        "endpointUrl": "https://apollo-mcp.kingler.workers.dev/mcp",
        "serverTransport": "httpStreamable",
        "authentication": {
          "type": "apiKey",
          "apiKey": "bj015A7ynPgcjjhrQ_fN_Q"
        }
      },
      "type": "@n8n/n8n-nodes-langchain.mcpClientTool",
      "typeVersion": 1.1,
      "position": [1568, 400],
      "id": "336cfb3a-7130-4151-99ac-c428d16c6fbb",
      "name": "Apollo io MCP Client"
    }
  ]
}
```

## Available Tools

The Apollo.io MCP server provides the following tools:

1. **search-leads**: Search for prospects based on job title, industry, company size, and location
2. **enrich-contact**: Enrich contact information with additional data from Apollo.io
3. **create-email-sequence**: Create an automated email sequence for lead nurturing
4. **get-account-data**: Retrieve account-based marketing data for a company
5. **track-engagement**: Track email and call engagement metrics for campaigns

## Authentication

The server requires authentication via API key. The API key must be:
1. Your valid Apollo.io API key
2. Sent in the request headers as either:
   - `Authorization: Bearer YOUR_API_KEY`
   - `Authorization: ApiKey YOUR_API_KEY`
   - `X-API-Key: YOUR_API_KEY`

## Testing the Connection

### 1. Test Health Endpoint
```bash
curl -X GET https://apollo-mcp.kingler.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "apollo-io-mcp-server",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Test MCP Initialize
```bash
curl -X POST https://apollo-mcp.kingler.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer bj015A7ynPgcjjhrQ_fN_Q" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "0.1.0",
      "clientInfo": {
        "name": "n8n",
        "version": "1.0.0"
      }
    },
    "id": 1
  }'
```

### 3. Test Tools List
```bash
curl -X POST https://apollo-mcp.kingler.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer bj015A7ynPgcjjhrQ_fN_Q" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

## Troubleshooting

### Common Issues

1. **Authentication Error (401)**
   - Ensure the API key is correctly configured in n8n
   - Verify the API key is sent in the correct header format
   - Check that the Apollo.io API key is valid

2. **Connection Refused**
   - Verify the endpoint URL is correct
   - Check that CORS is properly configured (should be handled by the server)
   - Ensure the server is deployed and running

3. **Method Not Found**
   - Ensure you're using the correct MCP protocol methods
   - Check that the request format matches the MCP specification

### Debug Mode

To enable debug logging, you can test with the staging environment:
- Staging URL: `https://apollo-mcp-staging.kingler.workers.dev/mcp`

## Support

For issues or questions:
1. Check the server logs: `npx wrangler tail apollo-mcp --env production`
2. Review the health endpoint: `https://apollo-mcp.kingler.workers.dev/health`
3. Verify API key permissions in Apollo.io dashboard