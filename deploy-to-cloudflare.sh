#!/bin/bash

# JetVision MCP Servers - Cloudflare Deployment Script
# This script deploys both MCP servers to Cloudflare Workers

set -e

echo "🚀 JetVision MCP Servers - Cloudflare Deployment"
echo "================================================"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if logged in to Cloudflare
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "📝 Please log in to Cloudflare:"
    wrangler login
fi

# Function to deploy a server
deploy_server() {
    local server_dir=$1
    local server_name=$2
    local api_key_name=$3
    
    echo ""
    echo "📦 Deploying $server_name..."
    echo "--------------------------------"
    
    cd "$server_dir"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📥 Installing dependencies..."
        npm install
    fi
    
    # Install Cloudflare-specific dependencies
    echo "📥 Installing Cloudflare dependencies..."
    npm install --save-dev @cloudflare/workers-types wrangler
    npm install itty-router
    
    # Build the worker
    echo "🔨 Building worker..."
    npm run build:worker
    
    # Deploy to Cloudflare
    echo "☁️  Deploying to Cloudflare Workers..."
    wrangler deploy
    
    # Set up API key secret
    echo "🔑 Setting up API key..."
    echo "Please enter your $api_key_name:"
    wrangler secret put "$api_key_name"
    
    echo "✅ $server_name deployed successfully!"
    
    cd ..
}

# Deploy Apollo.io MCP Server
deploy_server "apollo-io-mcp-server" "Apollo.io MCP Server" "APOLLO_API_KEY"

# Deploy Avainode MCP Server
deploy_server "avainode-mcp-server" "Avainode MCP Server" "AVAINODE_API_KEY"

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "Your MCP servers are now deployed to Cloudflare Workers!"
echo ""
echo "📍 Endpoints:"
echo "  Apollo.io:  https://apollo-mcp.designthru.ai/mcp"
echo "  Avainode:   https://avainode-mcp.designthru.ai/mcp"
echo ""
echo "🔧 Next Steps:"
echo "  1. Test the endpoints using the curl commands in CLOUDFLARE_DEPLOYMENT.md"
echo "  2. Set up custom domains in Cloudflare Dashboard if needed"
echo "  3. Monitor logs with: wrangler tail"
echo ""
echo "📊 View in Cloudflare Dashboard:"
echo "  https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/designthru.ai/workers-and-pages"
echo ""