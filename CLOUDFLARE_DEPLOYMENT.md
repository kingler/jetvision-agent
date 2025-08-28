# Cloudflare Deployment Guide for JetVision MCP Servers

## Prerequisites

1. **Cloudflare Account**: You already have one at designthru.ai
2. **Wrangler CLI**: Install Cloudflare's CLI tool
```bash
npm install -g wrangler
```
3. **Authenticate Wrangler**:
```bash
wrangler login
```

## Important Note on MCP & Cloudflare Workers

MCP servers use HTTP streaming and persistent connections, which have limitations on Cloudflare Workers:
- Workers have a 30-second CPU time limit
- WebSocket support requires Durable Objects (paid feature)
- Streaming responses are supported but with restrictions

We'll adapt the servers to work within these constraints.

## Step 1: Install Cloudflare Dependencies

For both servers, install Cloudflare Workers dependencies:

```bash
# Apollo.io server
cd apollo-io-mcp-server
npm install --save-dev @cloudflare/workers-types wrangler
npm install itty-router

# Avainode server
cd ../avainode-mcp-server
npm install --save-dev @cloudflare/workers-types wrangler
npm install itty-router
```

## Step 2: Configure Wrangler

Create wrangler.toml files for each server (see files created in project).

## Step 3: Create Worker Adapters

We need to create Cloudflare Worker-compatible versions of our servers.

## Step 4: Deploy to Cloudflare

### Deploy Apollo.io MCP Server

```bash
cd apollo-io-mcp-server
wrangler publish
# or for first time
wrangler deploy
```

Your server will be available at:
- `https://apollo-mcp.designthru.ai` (custom domain)
- `https://apollo-mcp.YOUR-SUBDOMAIN.workers.dev` (default)

### Deploy Avainode MCP Server

```bash
cd avainode-mcp-server
wrangler publish
# or for first time
wrangler deploy
```

Your server will be available at:
- `https://avainode-mcp.designthru.ai` (custom domain)
- `https://avainode-mcp.YOUR-SUBDOMAIN.workers.dev` (default)

## Step 5: Set Environment Variables

### Via Cloudflare Dashboard:

1. Go to https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/designthru.ai
2. Navigate to Workers & Pages
3. Select your deployed worker (apollo-mcp or avainode-mcp)
4. Go to Settings → Variables
5. Add environment variables:
   - `APOLLO_API_KEY`: Your Apollo.io API key
   - `AVAINODE_API_KEY`: Your Avainode API key

### Via Wrangler CLI:

```bash
# Apollo.io server
wrangler secret put APOLLO_API_KEY
# Enter your API key when prompted

# Avainode server
wrangler secret put AVAINODE_API_KEY
# Enter your API key when prompted
```

## Step 6: Custom Domain Setup (Optional)

To use custom domains like `apollo-mcp.designthru.ai`:

1. In Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Go to Triggers → Custom Domains
4. Add custom domain: `apollo-mcp.designthru.ai`
5. Repeat for `avainode-mcp.designthru.ai`

## Step 7: Test Your Deployment

Test the Apollo.io server:
```bash
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'
```

Test the Avainode server:
```bash
curl -X POST https://avainode-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'
```

## Monitoring & Logs

### View Logs:
```bash
wrangler tail
```

### Via Dashboard:
1. Go to Workers & Pages in Cloudflare Dashboard
2. Select your worker
3. View Logs & Analytics

## Limitations & Considerations

1. **Request Limits**: 
   - Free plan: 100,000 requests/day
   - CPU time: 10ms per request (free), 30s (paid)

2. **Streaming Limitations**:
   - SSE might need adaptation for Workers
   - Consider using Durable Objects for persistent connections (requires paid plan)

3. **Storage**:
   - Use Cloudflare KV for session storage
   - R2 for file storage if needed

## Alternative: Cloudflare Pages Functions

For better compatibility with MCP's streaming requirements, consider using Cloudflare Pages with Functions:

1. Create a Pages project
2. Deploy the built files to Pages
3. Use Functions for API endpoints
4. Supports longer execution times

## Troubleshooting

### Common Issues:

1. **"Script too large"**: 
   - Minimize dependencies
   - Use webpack or esbuild to bundle

2. **"CPU time exceeded"**:
   - Optimize code
   - Consider upgrading to paid plan

3. **CORS errors**:
   - Add proper CORS headers in worker response

## Next Steps

After deployment:
1. Test all MCP tools
2. Set up monitoring alerts
3. Configure rate limiting
4. Add custom domain SSL certificates
5. Set up CI/CD with GitHub Actions

## Support

For Cloudflare-specific issues:
- Cloudflare Workers Discord: https://discord.gg/cloudflaredev
- Documentation: https://developers.cloudflare.com/workers/