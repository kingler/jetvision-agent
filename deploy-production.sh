#!/bin/bash

# JetVision Agent - Production Deployment Script
# Deploys the Next.js app to Cloudflare Pages with proper checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 JetVision Agent - Production Deployment${NC}"
echo "================================================="
echo ""

# Function to check command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists wrangler; then
    echo -e "${RED}❌ Wrangler CLI not found!${NC}"
    echo "Installing wrangler globally..."
    npm install -g wrangler@latest
fi

if ! command_exists bun; then
    echo -e "${RED}❌ Bun not found!${NC}"
    echo "Please install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Cloudflare!${NC}"
    echo "Please run: wrangler login"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Navigate to the web app directory
cd jetvision-agent

# Check Git status
echo -e "${YELLOW}📊 Checking Git status...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
    git status -s
    echo ""
    read -p "Continue with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git pull jetvision main || echo -e "${YELLOW}⚠️  Could not pull from remote${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
bun install --frozen-lockfile
echo ""

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
if bun test; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed${NC}"
    read -p "Continue deployment despite test failures? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi
echo ""

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
cd apps/web

# Clean previous builds
rm -rf .next .vercel

# Build Next.js app
if ! bun run build; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Install Cloudflare adapter if needed
if ! bun pm ls | grep -q "@cloudflare/next-on-pages"; then
    echo -e "${YELLOW}📦 Installing Cloudflare adapter...${NC}"
    bun add -D @cloudflare/next-on-pages@1 vercel
fi

# Build for Cloudflare
echo -e "${YELLOW}🔄 Building for Cloudflare Pages...${NC}"
npx @cloudflare/next-on-pages

if [ ! -d ".vercel/output/static" ]; then
    echo -e "${RED}❌ Cloudflare build failed - output directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Cloudflare build successful${NC}"
echo ""

# Deploy to Cloudflare Pages
echo -e "${YELLOW}📤 Deploying to Cloudflare Pages...${NC}"

# Get current branch and commit
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT=$(git rev-parse --short HEAD)
MESSAGE=$(git log -1 --pretty=%B | head -n 1)

# Deploy with metadata
wrangler pages deploy .vercel/output/static \
  --project-name=jetvision-agent \
  --branch="$BRANCH" \
  --commit-hash="$COMMIT" \
  --commit-message="$MESSAGE" \
  --compatibility-date=2024-01-15 \
  --compatibility-flags=nodejs_compat

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment Successful!${NC}"
    echo "================================================="
    echo ""
    echo -e "${GREEN}📍 Your app is live at:${NC}"
    echo "  Production: https://jetvision-agent.pages.dev"
    echo "  Custom Domain: https://jetvision.designthru.ai (if configured)"
    echo ""
    echo -e "${YELLOW}📊 View deployment:${NC}"
    echo "  https://dash.cloudflare.com/?to=/:account/pages/view/jetvision-agent"
    echo ""
    
    # Update deployment version
    echo "$COMMIT" > ../../.deployment-version
    echo "Deployed: $(date)" >> ../../deployment.log
    
    # Optional: Open in browser
    if command_exists open; then
        read -p "Open production site in browser? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open "https://jetvision-agent.pages.dev"
        fi
    fi
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo "Check the error messages above for details."
    exit 1
fi

# Return to root directory
cd ../..