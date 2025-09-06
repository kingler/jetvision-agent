#!/bin/bash

# Apollo.io Lead Generation Automation Runner
# This script provides easy access to all lead generation modes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TARGET_LEADS=${TARGET_LEADS:-100}
RATE_LIMIT_DELAY=${RATE_LIMIT_DELAY:-2000}
OUTPUT_DIR=${OUTPUT_DIR:-"./lead-generation-output"}
APOLLO_MCP_URL=${APOLLO_MCP_URL:-"http://localhost:8123"}

print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "   Apollo.io Lead Generation Automation"
    echo "=================================================="
    echo -e "${NC}"
}

print_usage() {
    cat << EOF
Usage: $0 [MODE] [OPTIONS]

MODES:
    test        Run quick test with 10 leads (recommended first run)
    standard    Basic lead generation with mock data
    mcp         Generate leads via Apollo MCP server
    advanced    Full campaign with MCP + sequences + enrichment
    help        Show this help message

OPTIONS:
    --target-leads N        Number of leads to generate (default: 100)
    --delay N              Rate limit delay in ms (default: 2000)  
    --output-dir PATH      Output directory (default: ./lead-generation-output)
    --mcp-url URL          Apollo MCP server URL (default: http://localhost:8123)
    --real-apollo          Use real Apollo.io API (requires API key)
    --domains DOMAINS      Comma-separated domains for account-based targeting
    --sequences            Create email sequences (advanced mode only)

EXAMPLES:
    $0 test                                    # Quick test run
    $0 standard --target-leads 50             # Generate 50 leads with mock data
    $0 mcp --target-leads 200 --delay 1000    # MCP integration, faster execution
    $0 advanced --domains "company.com,org.com" --sequences  # Full campaign

ENVIRONMENT SETUP:
    You can also use environment variables:
    TARGET_LEADS=100 RATE_LIMIT_DELAY=2000 $0 mcp

EOF
}

check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        echo -e "${RED}Error: package.json not found. Run 'npm install' first${NC}"
        exit 1
    fi
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi
    
    echo -e "${GREEN}✓ Dependencies OK${NC}"
}

check_apollo_mcp() {
    echo -e "${YELLOW}Checking Apollo MCP server at ${APOLLO_MCP_URL}...${NC}"
    
    if curl -f -s "${APOLLO_MCP_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Apollo MCP server is running${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Apollo MCP server not responding at ${APOLLO_MCP_URL}${NC}"
        echo -e "${YELLOW}  The script will use mock mode instead${NC}"
        return 1
    fi
}

run_test() {
    echo -e "${BLUE}Running quick test (10 leads)...${NC}"
    TARGET_LEADS=10 RATE_LIMIT_DELAY=500 node lead-generation-automation.js
}

run_standard() {
    echo -e "${BLUE}Running standard lead generation...${NC}"
    echo -e "${YELLOW}Target: ${TARGET_LEADS} leads, Delay: ${RATE_LIMIT_DELAY}ms${NC}"
    node lead-generation-automation.js
}

run_mcp() {
    echo -e "${BLUE}Running MCP-integrated lead generation...${NC}"
    echo -e "${YELLOW}Target: ${TARGET_LEADS} leads, MCP URL: ${APOLLO_MCP_URL}${NC}"
    check_apollo_mcp || true
    node apollo-mcp-integration.js
}

run_advanced() {
    echo -e "${BLUE}Running advanced lead generation campaign...${NC}"
    echo -e "${YELLOW}Target: ${TARGET_LEADS} leads, MCP URL: ${APOLLO_MCP_URL}${NC}"
    
    if [ -n "$DOMAINS" ]; then
        echo -e "${YELLOW}Target Domains: ${DOMAINS}${NC}"
        export TARGET_DOMAINS="$DOMAINS"
    fi
    
    if [ "$USE_SEQUENCES" = "true" ]; then
        echo -e "${YELLOW}Email sequences enabled${NC}"
    fi
    
    check_apollo_mcp || true
    export CAMPAIGN_TYPE=advanced
    node apollo-mcp-integration.js
}

show_results() {
    if [ -d "$OUTPUT_DIR" ]; then
        echo -e "\n${GREEN}✓ Lead generation completed!${NC}"
        echo -e "${BLUE}Output files:${NC}"
        find "$OUTPUT_DIR" -name "*.csv" -o -name "*.json" | head -5 | while read -r file; do
            echo "  - $(basename "$file")"
        done
        echo -e "\n${YELLOW}To view results:${NC}"
        echo "  CSV: open $OUTPUT_DIR/*.csv"
        echo "  JSON: cat $OUTPUT_DIR/*.json | jq ."
        echo "  Report: cat $OUTPUT_DIR/report-*.json | jq .summary"
    fi
}

# Parse arguments
MODE="$1"
shift || true

while [[ $# -gt 0 ]]; do
    case $1 in
        --target-leads)
            TARGET_LEADS="$2"
            shift 2
            ;;
        --delay)
            RATE_LIMIT_DELAY="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --mcp-url)
            APOLLO_MCP_URL="$2"
            shift 2
            ;;
        --real-apollo)
            USE_REAL_APOLLO="true"
            shift
            ;;
        --domains)
            DOMAINS="$2"
            shift 2
            ;;
        --sequences)
            USE_SEQUENCES="true"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

# Export environment variables
export TARGET_LEADS RATE_LIMIT_DELAY OUTPUT_DIR APOLLO_MCP_URL USE_REAL_APOLLO USE_SEQUENCES

print_header

case $MODE in
    test)
        check_dependencies
        run_test
        show_results
        ;;
    standard)
        check_dependencies
        run_standard
        show_results
        ;;
    mcp)
        check_dependencies
        run_mcp
        show_results
        ;;
    advanced)
        check_dependencies
        run_advanced
        show_results
        ;;
    help|--help|-h|"")
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        print_usage
        exit 1
        ;;
esac