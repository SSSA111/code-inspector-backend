#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PORT=8787
API_URL="http://localhost:$PORT"
MAX_RETRIES=30
RETRY_DELAY=1

echo -e "${YELLOW}🚀 Starting AI Security Helper API Test Suite${NC}"

# Function to check if server is ready
check_server() {
    curl -s "$API_URL/health" > /dev/null 2>&1
    return $?
}

# Function to wait for server
wait_for_server() {
    echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
    
    for i in $(seq 1 $MAX_RETRIES); do
        if check_server; then
            echo -e "${GREEN}✅ Server is ready!${NC}"
            return 0
        fi
        
        echo -n "."
        sleep $RETRY_DELAY
    done
    
    echo -e "\n${RED}❌ Server failed to start within $(($MAX_RETRIES * $RETRY_DELAY)) seconds${NC}"
    return 1
}

# Function to cleanup
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
        kill $SERVER_PID 2>/dev/null
        wait $SERVER_PID 2>/dev/null
        echo -e "${GREEN}✅ Server stopped${NC}"
    fi
}

# Set trap for cleanup on script exit
trap cleanup EXIT

# Start the development server
echo -e "${YELLOW}🖥️  Starting development server on port $PORT...${NC}"
wrangler dev --port $PORT &
SERVER_PID=$!

# Check if wrangler started successfully
sleep 2
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start wrangler dev server${NC}"
    exit 1
fi

# Wait for server to be ready
if ! wait_for_server; then
    exit 1
fi

# Set environment variable for tests
export TEST_API_URL="$API_URL"

echo -e "\n${YELLOW}🧪 Running API test suite...${NC}"
echo -e "${YELLOW}================================================${NC}"

# Run different test suites
test_suites=(
    "api-keys:tests/api/api-keys.test.ts"
    "projects:tests/api/projects.test.ts"
    "analysis:tests/api/analysis.test.ts"
    "system:tests/api/system.test.ts"
    "issues:tests/api/issues.test.ts"
    "chat:tests/api/chat.test.ts"
)

failed_suites=()
passed_suites=()

for suite in "${test_suites[@]}"; do
    suite_name="${suite%%:*}"
    suite_file="${suite##*:}"
    
    echo -e "\n${YELLOW}📋 Running $suite_name tests...${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
    
    if npx vitest run "$suite_file" --config tests/setup/vitest.config.ts; then
        echo -e "${GREEN}✅ $suite_name tests passed${NC}"
        passed_suites+=("$suite_name")
    else
        echo -e "${RED}❌ $suite_name tests failed${NC}"
        failed_suites+=("$suite_name")
    fi
done

# Summary
echo -e "\n${YELLOW}📊 Test Summary${NC}"
echo -e "${YELLOW}===============${NC}"

if [ ${#passed_suites[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ Passed (${#passed_suites[@]}):${NC}"
    for suite in "${passed_suites[@]}"; do
        echo -e "   - $suite"
    done
fi

if [ ${#failed_suites[@]} -gt 0 ]; then
    echo -e "${RED}❌ Failed (${#failed_suites[@]}):${NC}"
    for suite in "${failed_suites[@]}"; do
        echo -e "   - $suite"
    done
fi

echo -e "\n${YELLOW}🏁 Test run completed!${NC}"

# Exit with error code if any tests failed
if [ ${#failed_suites[@]} -gt 0 ]; then
    exit 1
else
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
fi