#!/bin/bash

# Performance Regression Check Script
# This script runs quick performance checks to detect significant regressions

set -e

echo "🚀 Running Performance Regression Check..."

PROJECT_ROOT=$(pwd)
TEMP_DIR=$(mktemp -d)
RESULTS_DIR="${PROJECT_ROOT}/.performance-cache"
THRESHOLD_PERCENT=20  # Alert if performance degrades by more than 20%

# Create results directory if it doesn't exist
mkdir -p "$RESULTS_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with colors
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if a server is running
wait_for_server() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Function to run performance test and return average response time
run_perf_test() {
    local server_url=$1
    local test_name=$2
    local iterations=${3:-10}
    
    log_info "Running performance test: $test_name"
    
    # Create simple performance test
    node -e "
        const { performance } = require('perf_hooks');
        const http = require('http');
        const https = require('https');
        
        async function testPerformance() {
            const times = [];
            const client = '${server_url}'.startsWith('https:') ? https : http;
            
            for (let i = 0; i < ${iterations}; i++) {
                const start = performance.now();
                
                try {
                    await new Promise((resolve, reject) => {
                        const postData = JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'tools/list',
                            params: {},
                            id: i
                        });
                        
                        const options = {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': Buffer.byteLength(postData)
                            },
                            timeout: 5000
                        };
                        
                        const req = client.request('${server_url}', options, (res) => {
                            let data = '';
                            res.on('data', chunk => data += chunk);
                            res.on('end', () => resolve(data));
                        });
                        
                        req.on('error', reject);
                        req.on('timeout', () => reject(new Error('Timeout')));
                        req.write(postData);
                        req.end();
                    });
                    
                    const end = performance.now();
                    times.push(end - start);
                } catch (error) {
                    // Skip failed requests for performance baseline
                    continue;
                }
            }
            
            if (times.length === 0) {
                console.log('ERROR: No successful requests');
                process.exit(1);
            }
            
            const average = times.reduce((a, b) => a + b, 0) / times.length;
            console.log(average.toFixed(2));
        }
        
        testPerformance().catch(error => {
            console.error('Test failed:', error.message);
            process.exit(1);
        });
    "
}

# Function to compare performance with baseline
compare_performance() {
    local test_name=$1
    local current_time=$2
    local baseline_file="${RESULTS_DIR}/${test_name}-baseline.txt"
    
    if [ ! -f "$baseline_file" ]; then
        echo "$current_time" > "$baseline_file"
        log_info "Created new baseline for $test_name: ${current_time}ms"
        return 0
    fi
    
    local baseline_time
    baseline_time=$(cat "$baseline_file")
    
    # Calculate percentage change
    local percent_change
    percent_change=$(node -e "
        const baseline = parseFloat('$baseline_time');
        const current = parseFloat('$current_time');
        const change = ((current - baseline) / baseline) * 100;
        console.log(change.toFixed(1));
    ")
    
    echo "  Baseline: ${baseline_time}ms"
    echo "  Current:  ${current_time}ms"
    echo "  Change:   ${percent_change}%"
    
    # Check if performance degraded significantly
    local is_regression
    is_regression=$(node -e "console.log(parseFloat('$percent_change') > $THRESHOLD_PERCENT)")
    
    if [ "$is_regression" = "true" ]; then
        log_error "Performance regression detected for $test_name!"
        log_error "Performance degraded by ${percent_change}% (threshold: ${THRESHOLD_PERCENT}%)"
        return 1
    elif [ "$(node -e "console.log(parseFloat('$percent_change') < -5)")" = "true" ]; then
        log_success "Performance improvement for $test_name: ${percent_change}%"
        # Update baseline if there's significant improvement
        echo "$current_time" > "$baseline_file"
    else {
        log_success "Performance within acceptable range for $test_name"
    }
    
    return 0
}

# Main performance check
main() {
    local has_regression=false
    
    echo "📊 Performance Regression Check Report"
    echo "======================================"
    echo "Threshold: ${THRESHOLD_PERCENT}% degradation"
    echo "Date: $(date)"
    echo ""
    
    # Check if MCP servers are modified
    local apollo_modified=false
    local avainode_modified=false
    
    if git diff --cached --name-only | grep -q "apollo-io-mcp-server/"; then
        apollo_modified=true
    fi
    
    if git diff --cached --name-only | grep -q "avainode-mcp-server/"; then
        avainode_modified=true
    fi
    
    # Test Apollo MCP Server if modified
    if [ "$apollo_modified" = true ]; then
        log_info "Apollo MCP Server files modified, checking performance..."
        
        # Start Apollo server in background
        cd "$PROJECT_ROOT/apollo-io-mcp-server"
        if [ -f "package.json" ] && [ -d "src" ]; then
            npm run build > /dev/null 2>&1 || true
            npm start > "$TEMP_DIR/apollo.log" 2>&1 &
            local apollo_pid=$!
            
            # Wait for server to start
            if wait_for_server "http://localhost:8123"; then
                local apollo_time
                apollo_time=$(run_perf_test "http://localhost:8123" "apollo-tools-list" 5)
                
                if [ $? -eq 0 ] && [ -n "$apollo_time" ]; then
                    echo ""
                    log_info "Apollo MCP Server Performance:"
                    if ! compare_performance "apollo-mcp-server" "$apollo_time"; then
                        has_regression=true
                    fi
                else
                    log_warning "Could not measure Apollo MCP Server performance"
                fi
            else
                log_warning "Apollo MCP Server did not start in time, skipping performance test"
            fi
            
            # Clean up
            kill $apollo_pid 2>/dev/null || true
            wait $apollo_pid 2>/dev/null || true
        fi
    fi
    
    # Test Avainode MCP Server if modified
    if [ "$avainode_modified" = true ]; then
        log_info "Avainode MCP Server files modified, checking performance..."
        
        # Start Avainode server in background
        cd "$PROJECT_ROOT/avainode-mcp-server"
        if [ -f "package.json" ] && [ -d "src" ]; then
            npm run build > /dev/null 2>&1 || true
            PORT=8124 npm start > "$TEMP_DIR/avainode.log" 2>&1 &
            local avainode_pid=$!
            
            # Wait for server to start
            if wait_for_server "http://localhost:8124"; then
                local avainode_time
                avainode_time=$(run_perf_test "http://localhost:8124" "avainode-tools-list" 5)
                
                if [ $? -eq 0 ] && [ -n "$avainode_time" ]; then
                    echo ""
                    log_info "Avainode MCP Server Performance:"
                    if ! compare_performance "avainode-mcp-server" "$avainode_time"; then
                        has_regression=true
                    fi
                else
                    log_warning "Could not measure Avainode MCP Server performance"
                fi
            else
                log_warning "Avainode MCP Server did not start in time, skipping performance test"
            fi
            
            # Clean up
            kill $avainode_pid 2>/dev/null || true
            wait $avainode_pid 2>/dev/null || true
        fi
    fi
    
    # Overall result
    echo ""
    echo "======================================"
    if [ "$has_regression" = true ]; then
        log_error "Performance regression detected! Please review your changes."
        log_info "To update baselines (if intentional): rm -rf $RESULTS_DIR"
        echo ""
        echo "Tips to improve performance:"
        echo "- Profile your code to find bottlenecks"
        echo "- Check for memory leaks or excessive allocations"
        echo "- Optimize database queries or API calls"
        echo "- Use caching where appropriate"
        echo "- Review algorithmic complexity"
        return 1
    elif [ "$apollo_modified" = false ] && [ "$avainode_modified" = false ]; then
        log_info "No MCP server files modified, skipping performance check"
    else
        log_success "No significant performance regressions detected"
    fi
    
    return 0
}

# Cleanup function
cleanup() {
    # Kill any remaining processes
    pkill -P $$ 2>/dev/null || true
    
    # Clean up temp directory
    rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

# Run main function
main "$@"