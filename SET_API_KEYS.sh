#!/bin/bash

# JetVision MCP Servers - API Key Configuration
# This script helps you set the API keys for both MCP servers

set -e

echo "🔐 Setting API Keys for JetVision MCP Servers"
echo "============================================="
echo ""

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare!"
    echo "Please run: wrangler login"
    exit 1
fi

echo "✅ Logged in to Cloudflare"
echo ""

# Set Apollo.io API Key
echo "📝 Setting Apollo.io API Key..."
echo "================================"
echo ""
echo "Please enter your Apollo.io API key when prompted."
echo "You can find this in your Apollo.io account settings:"
echo "https://app.apollo.io/#/settings/integrations/api"
echo ""

cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent/apollo-io-mcp-server
wrangler secret put APOLLO_API_KEY

echo ""
echo "✅ Apollo.io API key set successfully!"
echo ""

# Set Avainode API Key
echo "📝 Setting Avainode API Key..."
echo "=============================="
echo ""
echo "Please enter your Avainode API key when prompted."
echo "You can find this in your Avainode account settings."
echo ""

cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent/avainode-mcp-server
wrangler secret put AVAINODE_API_KEY

echo ""
echo "✅ Avainode API key set successfully!"
echo ""

echo "🎉 API Keys Configuration Complete!"
echo "===================================="
echo ""
echo "Your MCP servers are now fully configured with API keys."
echo ""
echo "Test your servers with:"
echo "  curl https://apollo-mcp.designthru.ai/health"
echo "  curl https://avainode-mcp.designthru.ai/health"
echo ""