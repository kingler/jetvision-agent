#!/bin/bash

# JetVision Agent App - Cloudflare Pages Deployment
# Deploys Next.js app to Cloudflare Pages

set -e

echo "🚀 Deploying JetVision Agent to Cloudflare Pages"
echo "================================================="
echo ""

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare!"
    echo "Please run: wrangler login"
    exit 1
fi

echo "✅ Logged in to Cloudflare"
echo ""

# Navigate to the web app directory
cd /Volumes/SeagatePortableDrive/Projects/jetvision-agent/jetvision-agent/apps/web

echo "📦 Installing Cloudflare adapter..."
echo "===================================="

# Check if bun is available
if command -v bun &> /dev/null; then
    echo "Using bun to install dependencies..."
    bun install @cloudflare/next-on-pages vercel
else
    echo "Using npm to install dependencies..."
    npm install --save-dev @cloudflare/next-on-pages@1 vercel
fi

echo ""
echo "🔨 Building for Cloudflare Pages..."
echo "===================================="

# Build the Next.js app
npm run build

echo ""
echo "🔄 Preparing for Cloudflare deployment..."
echo "=========================================="

# Run the Cloudflare adapter
npx @cloudflare/next-on-pages

echo ""
echo "📤 Deploying to Cloudflare Pages..."
echo "===================================="

# Deploy using wrangler pages
wrangler pages deploy .vercel/output/static \
  --project-name=jetvision-agent \
  --compatibility-date=2024-01-15 \
  --compatibility-flags=nodejs_compat

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📍 Your app will be available at:"
echo "  https://jetvision-agent.pages.dev"
echo ""
echo "⚙️ To set up custom domain:"
echo "  1. Go to Cloudflare Dashboard"
echo "  2. Navigate to Pages > jetvision-agent"
echo "  3. Go to Custom domains"
echo "  4. Add your custom domain"
echo ""
echo "🔑 Environment Variables:"
echo "  Set them in Cloudflare Dashboard:"
echo "  Pages > jetvision-agent > Settings > Environment variables"
echo ""
echo "  Required variables:"
echo "  - CLERK_SECRET_KEY"
echo "  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
echo "  - DATABASE_URL"
echo "  - Any API keys for AI services"
echo ""