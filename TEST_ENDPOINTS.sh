#!/bin/bash

# JetVision MCP Servers - Endpoint Testing
# Tests both workers.dev and custom domain endpoints

echo "🧪 Testing JetVision MCP Server Endpoints"
echo "=========================================="
echo ""

# Test with workers.dev domains (these should work immediately)
echo "📡 Testing Workers.dev Endpoints..."
echo "===================================="
echo ""

# Get the actual workers.dev URLs from wrangler
echo "Getting Apollo worker URL..."
cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent/apollo-io-mcp-server
APOLLO_URL=$(wrangler deploy --dry-run 2>&1 | grep -oE 'https://[^[:space:]]+\.workers\.dev' | head -1)

if [ -n "$APOLLO_URL" ]; then
    echo "Testing: $APOLLO_URL/health"
    curl -s "$APOLLO_URL/health" || echo "❌ Apollo health check failed"
else
    echo "❌ Could not determine Apollo workers.dev URL"
fi

echo ""
echo "Getting Avainode worker URL..."
cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent/avainode-mcp-server
AVAINODE_URL=$(wrangler deploy --dry-run 2>&1 | grep -oE 'https://[^[:space:]]+\.workers\.dev' | head -1)

if [ -n "$AVAINODE_URL" ]; then
    echo "Testing: $AVAINODE_URL/health"
    curl -s "$AVAINODE_URL/health" || echo "❌ Avainode health check failed"
else
    echo "❌ Could not determine Avainode workers.dev URL"
fi

echo ""
echo ""

# Test custom domains (may not work until DNS is configured)
echo "🌐 Testing Custom Domain Endpoints..."
echo "======================================"
echo ""

echo "Testing: https://apollo-mcp.designthru.ai/health"
if curl -s --connect-timeout 5 https://apollo-mcp.designthru.ai/health 2>/dev/null; then
    echo "✅ Apollo custom domain is working!"
else
    echo "⚠️  Apollo custom domain not configured yet"
    echo "   Configure it at: https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/workers-and-pages"
fi

echo ""
echo "Testing: https://avainode-mcp.designthru.ai/health"
if curl -s --connect-timeout 5 https://avainode-mcp.designthru.ai/health 2>/dev/null; then
    echo "✅ Avainode custom domain is working!"
else
    echo "⚠️  Avainode custom domain not configured yet"
    echo "   Configure it at: https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/workers-and-pages"
fi

echo ""
echo ""
echo "📝 Summary"
echo "=========="
echo ""
echo "Workers.dev URLs are available immediately after deployment."
echo "Custom domains need to be configured in the Cloudflare dashboard."
echo ""
echo "To set up custom domains:"
echo "1. Go to https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/workers-and-pages"
echo "2. Click on each worker (apollo-mcp and avainode-mcp)"
echo "3. Go to Settings > Triggers > Custom Domains"
echo "4. Add the custom domain for each worker"
echo ""