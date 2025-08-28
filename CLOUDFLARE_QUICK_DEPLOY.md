# Quick Cloudflare Deployment Guide

## Step-by-Step Deployment to Your Account (designthru.ai)

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```
This will open your browser. Login with your Cloudflare account.

### 3. Deploy Apollo.io Server

```bash
cd apollo-io-mcp-server

# Install dependencies
npm install --save-dev @cloudflare/workers-types wrangler
npm install itty-router

# Deploy
wrangler deploy

# Set API key (you'll be prompted to enter it)
wrangler secret put APOLLO_API_KEY
```

### 4. Deploy Avainode Server

```bash
cd ../avainode-mcp-server

# Install dependencies
npm install --save-dev @cloudflare/workers-types wrangler
npm install itty-router

# Deploy
wrangler deploy

# Set API key (you'll be prompted to enter it)
wrangler secret put AVAINODE_API_KEY
```

### 5. Or Use the Automated Script

```bash
# From the root directory
./deploy-to-cloudflare.sh
```

## Access Your Deployed Servers

After deployment, your servers will be available at:

### Default URLs (automatically created):
- Apollo: `https://apollo-mcp.YOUR-SUBDOMAIN.workers.dev`
- Avainode: `https://avainode-mcp.YOUR-SUBDOMAIN.workers.dev`

### Custom Domain Setup (designthru.ai):

1. Go to your Cloudflare Dashboard:
   https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/designthru.ai

2. Navigate to **Workers & Pages** in the left sidebar

3. Click on `apollo-mcp` worker

4. Go to **Settings** → **Triggers** → **Custom Domains**

5. Click **Add Custom Domain**

6. Enter: `apollo-mcp.designthru.ai`

7. Click **Add Domain**

8. Repeat steps 3-7 for `avainode-mcp` with domain `avainode-mcp.designthru.ai`

## Test Your Deployment

### Test Apollo.io Server:
```bash
curl -X POST https://apollo-mcp.designthru.ai/health
```

### Test Avainode Server:
```bash
curl -X POST https://avainode-mcp.designthru.ai/health
```

### Test MCP Functionality:
```bash
# Initialize session
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "0.1.0",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    },
    "id": 1
  }'

# Save the session ID from the response header, then:

# List tools
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

## Monitor Your Workers

### View Real-time Logs:
```bash
# Apollo logs
cd apollo-io-mcp-server
wrangler tail

# Avainode logs
cd avainode-mcp-server
wrangler tail
```

### View in Dashboard:
1. Go to https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/designthru.ai
2. Click on **Workers & Pages**
3. Click on your worker (apollo-mcp or avainode-mcp)
4. View:
   - **Analytics**: Request counts, errors, latency
   - **Logs**: Real-time and historical logs
   - **Settings**: Environment variables, bindings

## Update Environment Variables

### Via Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Go to **Settings** → **Variables**
4. Click **Edit Variables**
5. Add/Update:
   - `APOLLO_API_KEY`
   - `AVAINODE_API_KEY`
6. Click **Save**

### Via CLI:
```bash
# Update Apollo API key
cd apollo-io-mcp-server
wrangler secret put APOLLO_API_KEY

# Update Avainode API key
cd avainode-mcp-server
wrangler secret put AVAINODE_API_KEY
```

## Troubleshooting

### If deployment fails with "account_id required":
Edit `wrangler.toml` and ensure this line is present:
```toml
account_id = "485f44eabd68fe8c5301c12472a02612"
```

### If you get "Script too large" error:
The worker bundle is too big. You may need to:
1. Optimize imports
2. Use dynamic imports
3. Minimize dependencies

### If you get authentication errors:
```bash
wrangler logout
wrangler login
```

## Cost Considerations

### Free Plan Limits:
- 100,000 requests per day
- 10 milliseconds CPU time per request
- 1 MB worker size

### If you exceed limits:
- Consider Workers Paid plan ($5/month)
- Includes:
  - 10 million requests
  - 30 seconds CPU time
  - 10 MB worker size
  - Durable Objects support

## Next Steps

1. ✅ Deploy both servers
2. ✅ Set API keys
3. ✅ Test endpoints
4. 📊 Monitor usage in dashboard
5. 🔧 Set up custom domains
6. 🚀 Integrate with your applications

## Support

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- MCP Documentation: https://modelcontextprotocol.io/
- Your Dashboard: https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/designthru.ai