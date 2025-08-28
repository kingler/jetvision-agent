#!/bin/bash

# JetVision Agent - Quick Deploy Script
# For rapid deployment of minor changes without full rebuild
# Usage: ./QUICK_DEPLOY.sh [file1] [file2] ...

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}⚡ JetVision Quick Deploy${NC}"
echo "=========================="
echo ""

# Check login
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Cloudflare!${NC}"
    echo "Please run: wrangler login"
    exit 1
fi

WEB_DIR="/Volumes/SeagatePortableDrive/Projects/jetvision-agent/jetvision-agent/apps/web"
OUT_DIR="${WEB_DIR}/out"

# Check if build exists
if [ ! -d "$OUT_DIR" ]; then
    echo -e "${RED}❌ No build found!${NC}"
    echo "Run ./BUILD_FOR_CLOUDFLARE.sh first"
    exit 1
fi

cd "$WEB_DIR"

# If specific files provided, show what changed
if [ $# -gt 0 ]; then
    echo -e "${YELLOW}📝 Files to update:${NC}"
    for file in "$@"; do
        echo "  • $file"
    done
    echo ""
fi

# Quick validation
echo -e "${YELLOW}🔍 Validating build...${NC}"
if [ -f "${OUT_DIR}/index.html" ]; then
    echo -e "${GREEN}✅ Build valid${NC}"
else
    echo -e "${RED}❌ Build invalid, full rebuild required${NC}"
    exit 1
fi

# Deploy immediately
echo -e "${YELLOW}🚀 Deploying to Cloudflare...${NC}"
TIMESTAMP=$(date +%H:%M:%S)
wrangler pages deploy out \
    --project-name=jetvision-agent \
    --commit-message="Quick deploy @ ${TIMESTAMP}" \
    --commit-dirty=true

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Quick deploy successful!${NC}"
    echo -e "${BLUE}🌐 Live at: https://jetvision-agent.pages.dev${NC}"
    echo ""
    echo -e "${YELLOW}⏱️  Deploy time: ~30 seconds${NC}"
else
    echo -e "${RED}❌ Deploy failed!${NC}"
    exit 1
fi