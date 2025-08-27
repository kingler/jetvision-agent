#!/bin/bash

# Test n8n Webhook for JetVision Agent
# This script tests various scenarios to ensure the webhook is properly configured

echo "========================================="
echo "JetVision Agent n8n Webhook Test Suite"
echo "========================================="
echo ""

WEBHOOK_URL="https://n8n.vividwalls.blog/webhook/jetvision-agent"
LOCAL_API="http://localhost:3000/api/n8n-webhook"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Basic Connectivity Test
echo -e "${YELLOW}Test 1: Basic Connectivity Test${NC}"
echo "Testing direct n8n webhook connection..."
response=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test connection","threadId":"test-123"}' \
  --max-time 10)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Direct webhook connection successful (HTTP $http_code)${NC}"
    echo "Response: $body" | head -c 200
else
    echo -e "${RED}✗ Direct webhook connection failed (HTTP $http_code)${NC}"
    echo "Response: $body"
fi
echo ""

# Test 2: Apollo.io Query Test
echo -e "${YELLOW}Test 2: Apollo.io Lead Generation Query${NC}"
echo "Testing Apollo.io integration..."
response=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Find 10 executive assistants at NYC private equity firms with emails",
    "threadId": "apollo-test-001",
    "context": {
      "source": "apollo-test",
      "intent": "lead_generation"
    }
  }' \
  --max-time 15)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Apollo.io query successful (HTTP $http_code)${NC}"
    echo "Response preview:" 
    echo "$body" | python3 -m json.tool 2>/dev/null | head -n 20 || echo "$body" | head -c 300
else
    echo -e "${RED}✗ Apollo.io query failed (HTTP $http_code)${NC}"
    echo "Response: $body"
fi
echo ""

# Test 3: Avinode Query Test
echo -e "${YELLOW}Test 3: Avinode Aircraft Availability Query${NC}"
echo "Testing Avinode integration..."
response=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show available Gulfstream G650 for tomorrow Miami to New York",
    "threadId": "avinode-test-001",
    "context": {
      "source": "avinode-test",
      "intent": "aircraft_search"
    }
  }' \
  --max-time 15)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Avinode query successful (HTTP $http_code)${NC}"
    echo "Response preview:"
    echo "$body" | python3 -m json.tool 2>/dev/null | head -n 20 || echo "$body" | head -c 300
else
    echo -e "${RED}✗ Avinode query failed (HTTP $http_code)${NC}"
    echo "Response: $body"
fi
echo ""

# Test 4: Marketing Campaign Query
echo -e "${YELLOW}Test 4: Marketing Campaign Creation${NC}"
echo "Testing marketing directive integration..."
response=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create an email campaign for luxury jet card members in Manhattan",
    "threadId": "marketing-test-001",
    "context": {
      "source": "marketing-test",
      "intent": "campaign_creation"
    }
  }' \
  --max-time 15)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Marketing query successful (HTTP $http_code)${NC}"
    echo "Response preview:"
    echo "$body" | python3 -m json.tool 2>/dev/null | head -n 20 || echo "$body" | head -c 300
else
    echo -e "${RED}✗ Marketing query failed (HTTP $http_code)${NC}"
    echo "Response: $body"
fi
echo ""

# Test 5: Error Handling Test
echo -e "${YELLOW}Test 5: Error Handling Test${NC}"
echo "Testing error handling with invalid data..."
response=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"invalid":"data"}' \
  --max-time 10)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ] || [ "$http_code" = "400" ]; then
    echo -e "${GREEN}✓ Error handling working (HTTP $http_code)${NC}"
    echo "Response: $body" | head -c 200
else
    echo -e "${RED}✗ Unexpected error response (HTTP $http_code)${NC}"
    echo "Response: $body"
fi
echo ""

# Test 6: Local API Endpoint Test (if server is running)
echo -e "${YELLOW}Test 6: Local API Endpoint Test${NC}"
echo "Testing local Next.js API route..."
response=$(curl -s -w "\n%{http_code}" -X POST "$LOCAL_API" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test local API connection",
    "threadId": "local-test-001"
  }' \
  --max-time 5 2>/dev/null)

http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Local API endpoint working (HTTP $http_code)${NC}"
else
    echo -e "${YELLOW}⚠ Local API not available (server may not be running)${NC}"
fi
echo ""

# Test 7: Response Time Analysis
echo -e "${YELLOW}Test 7: Response Time Analysis${NC}"
echo "Measuring response times..."

for i in {1..3}; do
    start_time=$(date +%s%3N)
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d '{"message":"Performance test","threadId":"perf-'$i'"}' \
      --max-time 10 > /dev/null 2>&1
    end_time=$(date +%s%3N)
    
    response_time=$((end_time - start_time))
    
    if [ "$response_time" -lt 3000 ]; then
        echo -e "${GREEN}✓ Test $i: ${response_time}ms (Good)${NC}"
    elif [ "$response_time" -lt 5000 ]; then
        echo -e "${YELLOW}⚠ Test $i: ${response_time}ms (Acceptable)${NC}"
    else
        echo -e "${RED}✗ Test $i: ${response_time}ms (Too slow)${NC}"
    fi
done
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
echo "Webhook URL: $WEBHOOK_URL"
echo "Local API: $LOCAL_API"
echo ""
echo -e "${GREEN}Tests completed!${NC}"
echo ""
echo "Next steps:"
echo "1. If tests are failing, check that the n8n workflow is activated"
echo "2. Import JetVision_Agent_Prototype_UPDATED.json into n8n"
echo "3. Ensure all credentials are configured in n8n"
echo "4. Monitor the n8n execution logs for any errors"
echo ""