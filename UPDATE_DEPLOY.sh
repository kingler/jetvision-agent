#!/bin/bash

# JetVision Agent - Universal Update & Deploy Script
# Streamlines the deployment process for development updates
# Usage: ./UPDATE_DEPLOY.sh [options]
#   Options:
#     --quick    Skip full build, deploy existing build
#     --force    Force rebuild even if no changes detected
#     --mcp      Also update MCP servers
#     --version  Tag deployment with version

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
QUICK_MODE=false
FORCE_BUILD=false
UPDATE_MCP=false
VERSION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK_MODE=true
            shift
            ;;
        --force)
            FORCE_BUILD=true
            shift
            ;;
        --mcp)
            UPDATE_MCP=true
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🚀 JetVision Agent - Update & Deploy${NC}"
echo "========================================"
echo ""

# Store current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="${SCRIPT_DIR}/jetvision-agent/apps/web"

# Function to check for changes
check_changes() {
    cd "$WEB_DIR"
    if git diff --quiet && git diff --staged --quiet; then
        return 1  # No changes
    else
        return 0  # Has changes
    fi
}

# Function to get current version
get_version() {
    if [ -n "$VERSION" ]; then
        echo "$VERSION"
    else
        echo "$(date +%Y%m%d-%H%M%S)"
    fi
}

# Function to build application
build_app() {
    echo -e "${YELLOW}📦 Building application...${NC}"
    cd "$SCRIPT_DIR"
    
    if [ -f "BUILD_FOR_CLOUDFLARE.sh" ]; then
        ./BUILD_FOR_CLOUDFLARE.sh
    else
        echo -e "${RED}❌ Build script not found!${NC}"
        exit 1
    fi
}

# Function to deploy to Cloudflare
deploy_to_cloudflare() {
    echo -e "${YELLOW}☁️  Deploying to Cloudflare Pages...${NC}"
    cd "$WEB_DIR"
    
    DEPLOY_VERSION=$(get_version)
    echo -e "${BLUE}📌 Version: ${DEPLOY_VERSION}${NC}"
    
    # Deploy with version message
    wrangler pages deploy out \
        --project-name=jetvision-agent \
        --commit-message="Deploy v${DEPLOY_VERSION}" \
        --commit-dirty=true
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Deployment successful!${NC}"
        echo -e "${BLUE}🌐 Live at: https://jetvision-agent.pages.dev${NC}"
        
        # Save deployment info
        echo "$(date): v${DEPLOY_VERSION} deployed" >> "${SCRIPT_DIR}/deployment.log"
    else
        echo -e "${RED}❌ Deployment failed!${NC}"
        exit 1
    fi
}

# Function to update MCP servers
update_mcp_servers() {
    echo -e "${YELLOW}🔄 Updating MCP servers...${NC}"
    cd "$SCRIPT_DIR"
    
    if [ -f "DEPLOY_NOW.sh" ]; then
        ./DEPLOY_NOW.sh
    else
        echo -e "${YELLOW}⚠️  MCP deployment script not found, skipping...${NC}"
    fi
}

# Main deployment flow
main() {
    # Check for wrangler login
    if ! wrangler whoami &> /dev/null; then
        echo -e "${RED}❌ Not logged in to Cloudflare!${NC}"
        echo "Please run: wrangler login"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Logged in to Cloudflare${NC}"
    echo ""
    
    # Quick mode - skip build
    if [ "$QUICK_MODE" = true ]; then
        echo -e "${YELLOW}⚡ Quick mode - skipping build${NC}"
        
        # Check if build exists
        if [ ! -d "${WEB_DIR}/out" ]; then
            echo -e "${RED}❌ No build found! Run without --quick first${NC}"
            exit 1
        fi
        
        deploy_to_cloudflare
    else
        # Check for changes or force build
        if [ "$FORCE_BUILD" = true ]; then
            echo -e "${YELLOW}🔨 Force rebuild enabled${NC}"
            build_app
            deploy_to_cloudflare
        else
            # Check for uncommitted changes
            if check_changes; then
                echo -e "${YELLOW}📝 Uncommitted changes detected${NC}"
                echo -e "${BLUE}Tip: Commit your changes for better version tracking${NC}"
                echo ""
            fi
            
            # Build and deploy
            build_app
            deploy_to_cloudflare
        fi
    fi
    
    # Update MCP servers if requested
    if [ "$UPDATE_MCP" = true ]; then
        update_mcp_servers
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Update complete!${NC}"
    echo "========================"
    echo ""
    echo -e "${BLUE}📊 Deployment Info:${NC}"
    echo "  • Main App: https://jetvision-agent.pages.dev"
    if [ "$UPDATE_MCP" = true ]; then
        echo "  • Apollo MCP: https://apollo-mcp.designthru.ai"
        echo "  • Avainode MCP: https://avainode-mcp.designthru.ai"
    fi
    echo ""
    echo -e "${YELLOW}📝 Next Steps:${NC}"
    echo "  • Check deployment: wrangler pages deployment tail"
    echo "  • View logs: wrangler pages deployment list --project-name=jetvision-agent"
    echo "  • Rollback: wrangler pages rollback --project-name=jetvision-agent"
}

# Run main function
main