#!/bin/bash

# Script to help set up GitHub secrets for Cloudflare deployment
# Requires GitHub CLI (gh) to be installed and authenticated

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🔐 GitHub Secrets Setup for Cloudflare Deployment${NC}"
echo "=================================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) not found!${NC}"
    echo "Please install it first:"
    echo "  macOS: brew install gh"
    echo "  Linux: See https://github.com/cli/cli#installation"
    echo ""
    echo "After installation, authenticate with: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub!${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"
echo ""

# Function to set secret
set_secret() {
    local name=$1
    local prompt=$2
    local value=$3
    
    if [ -z "$value" ]; then
        echo -e "${YELLOW}$prompt${NC}"
        read -s value
        echo ""
    fi
    
    if [ ! -z "$value" ]; then
        echo "$value" | gh secret set "$name" --repo=kingler/jetvision-agent
        echo -e "${GREEN}✅ Set $name${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipped $name${NC}"
    fi
}

# Function to get Cloudflare info
get_cloudflare_info() {
    echo -e "${BLUE}📋 Getting Cloudflare Information${NC}"
    echo ""
    echo "To get these values:"
    echo "1. Log in to https://dash.cloudflare.com"
    echo "2. Select your domain (designthru.ai)"
    echo ""
}

# Main setup
echo -e "${BLUE}Starting secret configuration...${NC}"
echo ""

# Get repository
REPO="kingler/jetvision-agent"
echo "Repository: $REPO"
echo ""

# Cloudflare secrets
get_cloudflare_info

echo -e "${YELLOW}Enter your Cloudflare Account ID:${NC}"
echo "  (Find it on the right sidebar of your domain dashboard)"
read CLOUDFLARE_ACCOUNT_ID
set_secret "CLOUDFLARE_ACCOUNT_ID" "" "$CLOUDFLARE_ACCOUNT_ID"

echo ""
echo -e "${YELLOW}Enter your Cloudflare Zone ID:${NC}"
echo "  (Find it on the right sidebar of your domain dashboard)"
read CLOUDFLARE_ZONE_ID
set_secret "CLOUDFLARE_ZONE_ID" "" "$CLOUDFLARE_ZONE_ID"

echo ""
echo -e "${YELLOW}Enter your Cloudflare API Token:${NC}"
echo "  (Create at: https://dash.cloudflare.com/profile/api-tokens)"
echo "  Permissions needed: Cloudflare Pages:Edit, Zone:Read, Cache Purge:Purge"
read -s CLOUDFLARE_API_TOKEN
echo ""
set_secret "CLOUDFLARE_API_TOKEN" "" "$CLOUDFLARE_API_TOKEN"

echo ""
echo -e "${BLUE}📋 Clerk Authentication (Optional)${NC}"
echo "Get these from: https://dashboard.clerk.com"
echo ""

echo -e "${YELLOW}Enter your Clerk Publishable Key (or press Enter to skip):${NC}"
read NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
if [ ! -z "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ]; then
    set_secret "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "" "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
fi

echo ""
echo -e "${BLUE}📋 Slack Notifications (Optional)${NC}"
echo ""

echo -e "${YELLOW}Enter your Slack Webhook URL (or press Enter to skip):${NC}"
echo "  (Create at: https://api.slack.com/messaging/webhooks)"
read -s SLACK_WEBHOOK_URL
echo ""
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    set_secret "SLACK_WEBHOOK_URL" "" "$SLACK_WEBHOOK_URL"
fi

# Set GitHub variables (not secrets)
echo ""
echo -e "${BLUE}📋 Setting GitHub Variables${NC}"
echo ""

echo -e "${YELLOW}Setting NEXT_PUBLIC_APP_URL variable...${NC}"
gh variable set NEXT_PUBLIC_APP_URL --body "https://jetvision.designthru.ai" --repo=$REPO
echo -e "${GREEN}✅ Set NEXT_PUBLIC_APP_URL${NC}"

echo ""
echo -e "${GREEN}✅ GitHub Secrets Configuration Complete!${NC}"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Go to Cloudflare Pages dashboard"
echo "2. Set environment variables for your Pages project"
echo "3. Push to main branch or manually trigger the workflow"
echo ""
echo "View your secrets at:"
echo "https://github.com/$REPO/settings/secrets/actions"
echo ""
echo "Trigger deployment at:"
echo "https://github.com/$REPO/actions/workflows/deploy-to-cloudflare.yml"