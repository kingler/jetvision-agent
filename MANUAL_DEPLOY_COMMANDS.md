# Manual Deployment Commands

## 1. First, Login to Cloudflare

```bash
wrangler login
```

## 2. Deploy Apollo.io MCP Server

```bash
# Navigate to Apollo server directory
cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent/apollo-io-mcp-server

# Build the worker
npx tsc --module esnext --target esnext --outDir dist src/worker.ts

# Deploy to Cloudflare
wrangler deploy

# Set API key (you'll be prompted to enter it)
wrangler secret put APOLLO_API_KEY
```

## 3. Deploy Avainode MCP Server

```bash
# Navigate to Avainode server directory
cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent/avainode-mcp-server

# Build the worker
npx tsc --module esnext --target esnext --outDir dist src/worker.ts

# Deploy to Cloudflare
wrangler deploy

# Set API key (you'll be prompted to enter it)
wrangler secret put AVAINODE_API_KEY
```

## 4. Test Your Deployments

### Test Apollo.io Server:
```bash
# Health check
curl https://apollo-mcp.designthru.ai/health

# Initialize MCP session
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
```

### Test Avainode Server:
```bash
# Health check
curl https://avainode-mcp.designthru.ai/health

# Initialize MCP session
curl -X POST https://avainode-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
```

## 5. View Real-time Logs

```bash
# Apollo logs
cd apollo-io-mcp-server
wrangler tail

# Avainode logs (in new terminal)
cd avainode-mcp-server
wrangler tail
```

## 6. Update/Redeploy

To update your workers after making changes:

```bash
# For Apollo server
cd apollo-io-mcp-server
wrangler deploy

# For Avainode server
cd avainode-mcp-server
wrangler deploy
```

## Troubleshooting

### If you get "not authenticated" error:
```bash
wrangler login
```

### If deployment fails with route error:
The custom domain routes may need to be set up in the Cloudflare dashboard first.
You can deploy without custom domains initially:

```bash
# Deploy without custom route (will use *.workers.dev domain)
wrangler deploy --compatibility-date 2024-01-15
```

### View your workers in Cloudflare Dashboard:
https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/workers-and-pages

## Expected Output

After successful deployment, you should see:
```
Total Upload: XX KiB
Your worker has access to the following bindings:
- KV Namespaces: SESSIONS
- Vars: NODE_ENV, LOG_LEVEL, MCP_VERSION

Published apollo-mcp (X.XX sec)
  https://apollo-mcp.YOUR-SUBDOMAIN.workers.dev
Current Deployment ID: xxxxx-xxxxx-xxxxx
```