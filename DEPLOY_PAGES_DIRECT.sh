#!/bin/bash

# JetVision Agent - Direct Cloudflare Pages Deployment
# Simple deployment using wrangler pages

set -e

echo "🚀 Direct Deployment to Cloudflare Pages"
echo "========================================="
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

echo "📦 Building Next.js Application..."
echo "==================================="
echo ""

# First, let's try to build with existing setup
echo "Running build command..."
npm run build || {
    echo "⚠️  Standard build failed. Trying alternative approach..."
    
    # Try building without workspace dependencies
    echo "Building with standalone Next.js..."
    npx next build
}

echo ""
echo "📤 Creating Cloudflare Pages Project..."
echo "========================================"

# Create the Pages project if it doesn't exist
wrangler pages project create jetvision-agent --production-branch main 2>/dev/null || {
    echo "Project already exists or creation failed. Continuing..."
}

echo ""
echo "🚀 Deploying to Cloudflare Pages..."
echo "===================================="

# Deploy the built Next.js app
if [ -d ".next" ]; then
    echo "Deploying .next directory..."
    wrangler pages deploy .next --project-name=jetvision-agent
elif [ -d "out" ]; then
    echo "Deploying static export..."
    wrangler pages deploy out --project-name=jetvision-agent
else
    echo "❌ No build output found!"
    echo "Please ensure the build completed successfully."
    exit 1
fi

echo ""
echo "🎉 Deployment Initiated!"
echo "========================"
echo ""
echo "📍 Your app will be available at:"
echo "  https://jetvision-agent.pages.dev"
echo ""
echo "📊 View deployment status:"
echo "  https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/pages/view/jetvision-agent"
echo ""
echo "⚠️  Note: This is a basic deployment."
echo "   For full Next.js features on Cloudflare, you may need:"
echo "   1. @cloudflare/next-on-pages adapter"
echo "   2. Edge runtime configuration"
echo "   3. Environment variables setup in dashboard"
echo ""