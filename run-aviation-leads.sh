#!/bin/bash

# Private Aviation Lead Generation Runner
# Specialized for charter jet decision-makers and high-value prospects

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Aviation-specific defaults
TARGET_LEADS=${TARGET_LEADS:-100}
RATE_LIMIT_DELAY=${RATE_LIMIT_DELAY:-2500}  # Slower for premium prospects
OUTPUT_DIR=${OUTPUT_DIR:-"./aviation-leads-output"}
MIN_COMPANY_REVENUE=${MIN_COMPANY_REVENUE:-50000000}  # $50M minimum
APOLLO_MCP_URL=${APOLLO_MCP_URL:-"http://localhost:8123"}

print_aviation_header() {
    echo -e "${PURPLE}"
    echo "=========================================================="
    echo "   🛩️  Private Charter Jet Lead Generation"
    echo "   Targeting Aviation Decision Makers & Influencers"
    echo "=========================================================="
    echo -e "${NC}"
}

print_aviation_usage() {
    cat << EOF
Usage: $0 [MODE] [OPTIONS]

AVIATION LEAD GENERATION MODES:
    test-aviation     Quick test with 10 high-value aviation prospects
    c-suite          Target CEOs, CFOs, Presidents with budget authority
    executive-support Target Executive Assistants with booking authority  
    travel-managers  Target Travel/Operations Managers with logistics authority
    family-office    Target Family Office/Wealth Managers for HNW individuals
    full-campaign    Complete aviation campaign (all decision-maker types)
    help            Show this help message

OPTIONS:
    --target-leads N        Aviation leads to generate (default: 100)
    --min-revenue N         Minimum company revenue (default: $50M)
    --delay N              Rate limit delay in ms (default: 2500)
    --output-dir PATH      Output directory (default: ./aviation-leads-output)
    --mcp-url URL          Apollo MCP server URL
    --real-apollo          Use real Apollo.io API (requires API key)
    --score-threshold N    Minimum aviation score (default: varies by mode)

AVIATION-SPECIFIC EXAMPLES:
    $0 test-aviation                                    # Quick aviation test
    $0 c-suite --target-leads 50 --min-revenue 100000000  # Target Fortune 500 CEOs
    $0 executive-support --delay 2000                  # Faster EA targeting
    $0 family-office --score-threshold 70              # High-bar for HNW
    $0 full-campaign --target-leads 200                # Complete campaign

DECISION MAKER FOCUS AREAS:
    • C-Suite Executives: Budget authority for aviation expenses
    • Executive Assistants: Booking authority and travel coordination
    • Travel Managers: Operational authority and vendor relationships
    • Family Office Staff: Personal aviation for high-net-worth individuals

COMPANY TARGETING CRITERIA:
    • Minimum $50M annual revenue (configurable)
    • Industries with high aviation usage (finance, consulting, tech)
    • Geographic markets with strong private aviation demand
    • Company sizes indicating executive travel needs (200+ employees)

EOF
}

check_aviation_requirements() {
    echo -e "${YELLOW}Checking aviation campaign requirements...${NC}"
    
    # Check Node.js and dependencies
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is required for aviation lead generation${NC}"
        exit 1
    fi
    
    if [ ! -f "private-aviation-lead-automation.js" ]; then
        echo -e "${RED}Error: Aviation automation script not found${NC}"
        exit 1
    fi
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies for aviation campaign...${NC}"
        npm install
    fi
    
    # Create aviation output directory
    mkdir -p "$OUTPUT_DIR"
    
    echo -e "${GREEN}✓ Aviation campaign requirements satisfied${NC}"
}

run_aviation_test() {
    echo -e "${BLUE}🛩️  Running aviation lead generation test...${NC}"
    echo -e "${YELLOW}Testing with 10 high-value aviation decision makers${NC}"
    
    TARGET_LEADS=10 RATE_LIMIT_DELAY=1000 node private-aviation-lead-automation.js
}

run_c_suite_campaign() {
    echo -e "${BLUE}🏆 Targeting C-Suite Executives with Budget Authority${NC}"
    echo -e "${YELLOW}Focus: CEOs, CFOs, Presidents at $${MIN_COMPANY_REVENUE}+ companies${NC}"
    
    # Set environment for C-suite focus
    export CAMPAIGN_FOCUS="c-suite"
    export MIN_AVIATION_SCORE=80
    node private-aviation-lead-automation.js
}

run_executive_support_campaign() {
    echo -e "${BLUE}📋 Targeting Executive Assistants with Booking Authority${NC}"
    echo -e "${YELLOW}Focus: Executive Assistants, Chiefs of Staff, Executive Coordinators${NC}"
    
    export CAMPAIGN_FOCUS="executive-support"  
    export MIN_AVIATION_SCORE=60
    node private-aviation-lead-automation.js
}

run_travel_managers_campaign() {
    echo -e "${BLUE}🗺️  Targeting Travel Managers with Operational Authority${NC}"
    echo -e "${YELLOW}Focus: Travel Directors, Corporate Travel Managers, Business Operations${NC}"
    
    export CAMPAIGN_FOCUS="travel-managers"
    export MIN_AVIATION_SCORE=50
    node private-aviation-lead-automation.js
}

run_family_office_campaign() {
    echo -e "${BLUE}💎 Targeting Family Office & High-Net-Worth Support Staff${NC}"
    echo -e "${YELLOW}Focus: Family Office Managers, Private Wealth, Lifestyle Managers${NC}"
    
    export CAMPAIGN_FOCUS="family-office"
    export MIN_AVIATION_SCORE=70
    node private-aviation-lead-automation.js
}

run_full_aviation_campaign() {
    echo -e "${BLUE}🚁 Running Complete Aviation Decision-Maker Campaign${NC}"
    echo -e "${YELLOW}Comprehensive targeting across all decision-maker types${NC}"
    
    export CAMPAIGN_FOCUS="full-campaign"
    export MIN_AVIATION_SCORE=50
    node private-aviation-lead-automation.js
}

check_apollo_mcp_aviation() {
    echo -e "${YELLOW}Checking Apollo MCP server for aviation data...${NC}"
    
    if curl -f -s "${APOLLO_MCP_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Apollo MCP server operational for aviation searches${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Apollo MCP server not responding - using aviation simulation mode${NC}"
        return 1
    fi
}

show_aviation_results() {
    if [ -d "$OUTPUT_DIR" ]; then
        echo -e "\n${GREEN}✈️  Aviation Lead Generation Completed!${NC}"
        echo -e "${BLUE}Aviation-specific output files:${NC}"
        
        find "$OUTPUT_DIR" -name "*aviation*" -type f | head -5 | while read -r file; do
            echo "  - $(basename "$file")"
        done
        
        echo -e "\n${YELLOW}Aviation Lead Analysis:${NC}"
        echo "  CSV: open $OUTPUT_DIR/aviation-leads-*.csv"
        echo "  JSON: cat $OUTPUT_DIR/aviation-leads-*.json | jq ."
        echo "  Report: cat $OUTPUT_DIR/aviation-campaign-report-*.json | jq .aviationCampaignSummary"
        
        # Quick stats if jq is available
        if command -v jq &> /dev/null; then
            local latest_report=$(find "$OUTPUT_DIR" -name "aviation-campaign-report-*.json" -type f | sort | tail -1)
            if [ -f "$latest_report" ]; then
                echo -e "\n${PURPLE}📊 Quick Aviation Stats:${NC}"
                echo "  Qualified Leads: $(cat "$latest_report" | jq -r '.aviationCampaignSummary.totalQualifiedLeads // "N/A"')"
                echo "  Avg Aviation Score: $(cat "$latest_report" | jq -r '.aviationCampaignSummary.averageAviationScore // "N/A"')"
                echo "  Immediate Prospects: $(cat "$latest_report" | jq -r '.aviationCampaignSummary.immediateCandidates // "N/A"')"
            fi
        fi
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
        --min-revenue)
            MIN_COMPANY_REVENUE="$2"
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
        --score-threshold)
            MIN_AVIATION_SCORE="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown aviation option: $1${NC}"
            print_aviation_usage
            exit 1
            ;;
    esac
done

# Export aviation-specific environment variables
export TARGET_LEADS RATE_LIMIT_DELAY OUTPUT_DIR MIN_COMPANY_REVENUE
export APOLLO_MCP_URL USE_REAL_APOLLO MIN_AVIATION_SCORE

print_aviation_header

case $MODE in
    test-aviation)
        check_aviation_requirements
        check_apollo_mcp_aviation || true
        run_aviation_test
        show_aviation_results
        ;;
    c-suite)
        check_aviation_requirements
        check_apollo_mcp_aviation || true
        run_c_suite_campaign
        show_aviation_results
        ;;
    executive-support)
        check_aviation_requirements
        check_apollo_mcp_aviation || true
        run_executive_support_campaign
        show_aviation_results
        ;;
    travel-managers)
        check_aviation_requirements
        check_apollo_mcp_aviation || true
        run_travel_managers_campaign
        show_aviation_results
        ;;
    family-office)
        check_aviation_requirements
        check_apollo_mcp_aviation || true
        run_family_office_campaign
        show_aviation_results
        ;;
    full-campaign)
        check_aviation_requirements
        check_apollo_mcp_aviation || true
        run_full_aviation_campaign
        show_aviation_results
        ;;
    help|--help|-h|"")
        print_aviation_usage
        ;;
    *)
        echo -e "${RED}Unknown aviation mode: $MODE${NC}"
        echo -e "${YELLOW}Try: $0 help for aviation-specific options${NC}"
        exit 1
        ;;
esac