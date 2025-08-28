#!/bin/bash

# JetVision Agent - Cloudflare Pages Deployment with Clerk
# Requires valid Clerk API keys

set -e

echo "🚀 Deploying JetVision Agent to Cloudflare Pages (with Clerk Auth)"
echo "=================================================================="
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

echo "📝 Setting up Clerk Authentication..."
echo "======================================"
echo ""
echo "You'll need your Clerk keys from: https://dashboard.clerk.com"
echo ""

# Check if .env.production.local exists and has Clerk keys
if [ -f ".env.production.local" ]; then
    if grep -q "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_" .env.production.local; then
        echo "✅ Found existing Clerk configuration"
    else
        echo "⚠️  .env.production.local exists but missing valid Clerk keys"
        echo "Please add your Clerk keys to .env.production.local"
        exit 1
    fi
else
    echo "Creating .env.production.local..."
    echo "Please enter your Clerk keys:"
    echo ""
    
    read -p "Enter NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (starts with pk_): " CLERK_PK
    read -p "Enter CLERK_SECRET_KEY (starts with sk_): " CLERK_SK
    
    cat > .env.production.local << EOF
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PK
CLERK_SECRET_KEY=$CLERK_SK
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat

# Database (update in Cloudflare dashboard)
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Redis (optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
EOF
    
    echo "✅ Created .env.production.local with Clerk keys"
fi

echo ""
echo "🔨 Building Next.js application..."
echo "==================================="

export PATH="$HOME/.bun/bin:$PATH"

# Install dependencies if needed
if ! command -v bun &> /dev/null; then
    echo "Installing bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "Installing dependencies..."
bun install

echo "Building application..."
bun run build || {
    echo ""
    echo "❌ Build failed!"
    echo ""
    echo "Common issues:"
    echo "1. Invalid Clerk keys - verify at https://dashboard.clerk.com"
    echo "2. Missing dependencies - try: bun install"
    echo "3. TypeScript errors - check the error messages above"
    echo ""
    exit 1
}

echo ""
echo "📤 Deploying to Cloudflare Pages..."
echo "===================================="

# Deploy the Next.js build
if [ -d ".next" ]; then
    echo "Deploying .next directory to Cloudflare Pages..."
    
    wrangler pages deploy .next \
        --project-name=jetvision-agent \
        --compatibility-date=2024-01-15
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "======================="
    echo ""
    echo "📍 Your app will be available at:"
    echo "  https://jetvision-agent.pages.dev"
    echo ""
    echo "⚠️  IMPORTANT: Set environment variables in Cloudflare!"
    echo "======================================================="
    echo ""
    echo "1. Go to: https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/pages/view/jetvision-agent"
    echo "2. Navigate to: Settings > Environment variables"
    echo "3. Add these production variables:"
    echo "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (your pk_ key)"
    echo "   - CLERK_SECRET_KEY (your sk_ key)" 
    echo "   - DATABASE_URL (your production database)"
    echo "   - Any AI API keys (OPENAI_API_KEY, etc.)"
    echo ""
    echo "4. Trigger a new deployment after adding variables:"
    echo "   Go to Deployments > ... > Retry deployment"
    echo ""
else
    echo "❌ Build directory not found!"
    exit 1
fi