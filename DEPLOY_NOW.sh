#!/bin/bash

# JetVision MCP Servers - Quick Cloudflare Deployment
# Run this after: wrangler login

set -e

echo "🚀 Deploying JetVision MCP Servers to Cloudflare"
echo "================================================"
echo ""

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare!"
    echo "Please run: wrangler login"
    exit 1
fi

echo "✅ Logged in to Cloudflare"
echo ""

# Deploy Apollo.io MCP Server
echo "📦 Deploying Apollo.io MCP Server..."
echo "======================================"
cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent/apollo-io-mcp-server

echo "Building worker..."
npx tsc --module esnext --target esnext --outDir dist src/worker.ts

echo "Deploying to Cloudflare..."
wrangler deploy

echo ""
echo "✅ Apollo.io server deployed!"
echo "URL: https://apollo-mcp.designthru.ai"
echo ""

# Deploy Avainode MCP Server
echo "📦 Deploying Avainode MCP Server..."
echo "====================================="
cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent/avainode-mcp-server

echo "Building worker..."
npx tsc --module esnext --target esnext --outDir dist src/worker.ts

echo "Deploying to Cloudflare..."
wrangler deploy

echo ""
echo "✅ Avainode server deployed!"
echo "URL: https://avainode-mcp.designthru.ai"
echo ""

echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📍 Your MCP Servers are live at:"
echo "  • Apollo.io:  https://apollo-mcp.designthru.ai"
echo "  • Avainode:   https://avainode-mcp.designthru.ai"
echo ""
echo "🔑 Next Steps:"
echo "  1. Set API keys with:"
echo "     cd apollo-io-mcp-server && wrangler secret put APOLLO_API_KEY"
echo "     cd avainode-mcp-server && wrangler secret put AVAINODE_API_KEY"
echo ""
echo "  2. Test endpoints:"
echo "     curl https://apollo-mcp.designthru.ai/health"
echo "     curl https://avainode-mcp.designthru.ai/health"
echo ""
echo "  3. View logs:"
echo "     wrangler tail"
echo ""
echo "📊 Dashboard: https://dash.cloudflare.com"
echo ""