#!/bin/bash

# JetVision Agent - Cloudflare Pages Deployment
# This script prepares and deploys the Next.js app to Cloudflare Pages

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

echo "📦 Setting up build environment..."
echo "==================================="

# Create a minimal .env.production.local with placeholder values to allow build
cat > .env.production.local << EOF
# Placeholder values for build - update in Cloudflare dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
CLERK_SECRET_KEY=sk_test_placeholder
DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat
EOF

echo "✅ Created placeholder environment file"
echo ""

echo "🔨 Building Next.js application..."
echo "==================================="

# Install dependencies and build
export PATH="$HOME/.bun/bin:$PATH"

# Check if bun is available
if command -v bun &> /dev/null; then
    echo "Using bun..."
    bun install
    bun run build || {
        echo "⚠️  Build with environment failed, trying with skip validation..."
        SKIP_ENV_VALIDATION=1 bun run build
    }
else
    echo "Installing bun first..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    bun install
    SKIP_ENV_VALIDATION=1 bun run build
fi

echo ""
echo "📤 Deploying to Cloudflare Pages..."
echo "===================================="

# Check if .next directory exists
if [ -d ".next" ]; then
    echo "Found .next build directory"
    
    # Deploy to Cloudflare Pages
    wrangler pages deploy .next \
        --project-name=jetvision-agent \
        --compatibility-date=2024-01-15 || {
        
        echo "⚠️  Direct deployment failed. Trying alternative..."
        
        # Alternative: Create a static export
        echo "Creating static export..."
        cat > next.config.mjs.backup << 'EOF'
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
    output: 'export',
    transpilePackages: ['next-mdx-remote'],
    images: {
        unoptimized: true,
        remotePatterns: [
            { hostname: 'www.google.com' },
            { hostname: 'img.clerk.com' },
            { hostname: 'zyqdiwxgffuy8ymd.public.blob.vercel-storage.com' },
        ],
    },
    experimental: {
        externalDir: true,
    },
    webpack: (config, options) => {
        if (!options.isServer) {
            config.resolve.fallback = { fs: false, module: false, path: false };
        }
        config.experiments = {
            ...config.experiments,
            topLevelAwait: true,
            layers: true,
        };
        return config;
    },
};

export default nextConfig;
EOF
        
        # Backup original config
        mv next.config.mjs next.config.mjs.original
        mv next.config.mjs.backup next.config.mjs
        
        # Build static export
        SKIP_ENV_VALIDATION=1 bun run build
        
        # Deploy the out directory
        if [ -d "out" ]; then
            wrangler pages deploy out --project-name=jetvision-agent
        else
            echo "❌ Failed to create static export"
            # Restore original config
            mv next.config.mjs.original next.config.mjs
            exit 1
        fi
        
        # Restore original config
        mv next.config.mjs.original next.config.mjs
    }
else
    echo "❌ No build output found!"
    exit 1
fi

# Clean up temporary env file
rm -f .env.production.local

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📍 Your app will be available at:"
echo "  https://jetvision-agent.pages.dev"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "========================="
echo ""
echo "1. Set Environment Variables in Cloudflare Dashboard:"
echo "   https://dash.cloudflare.com/485f44eabd68fe8c5301c12472a02612/pages/view/jetvision-agent"
echo ""
echo "   Go to: Settings > Environment variables"
echo "   Add these required variables:"
echo "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
echo "   - CLERK_SECRET_KEY"
echo "   - DATABASE_URL"
echo "   - Any AI provider API keys (OPENAI_API_KEY, etc.)"
echo ""
echo "2. Configure Custom Domain (optional):"
echo "   Go to: Custom domains > Add domain"
echo ""
echo "3. Redeploy after setting environment variables:"
echo "   wrangler pages deploy .next --project-name=jetvision-agent"
echo ""