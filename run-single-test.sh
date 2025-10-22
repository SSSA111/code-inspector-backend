#!/bin/bash

# Script to run individual test suites
# Usage: ./run-single-test.sh <test-suite>
# Example: ./run-single-test.sh analysis

PORT=8787
API_URL="http://localhost:$PORT"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <test-suite>"
    echo ""
    echo "Available test suites:"
    echo "  api-keys    - API key management tests"
    echo "  projects    - Project CRUD tests"
    echo "  analysis    - Security analysis tests"
    echo "  github      - GitHub integration tests"
    echo "  system      - System health and limits tests"
    echo "  issues      - Security issues management tests"
    echo "  chat        - Project chat/messaging tests"
    echo "  all         - Run all test suites"
    exit 1
fi

TEST_SUITE="$1"

# Map test suite names to file paths
case "$TEST_SUITE" in
    "api-keys")
        TEST_FILE="tests/api/api-keys.test.ts"
        ;;
    "projects")
        TEST_FILE="tests/api/projects.test.ts"
        ;;
    "analysis")
        TEST_FILE="tests/api/analysis.test.ts"
        ;;
    "github")
        TEST_FILE="tests/api/github.test.ts"
        ;;
    "system")
        TEST_FILE="tests/api/system.test.ts"
        ;;
    "issues")
        TEST_FILE="tests/api/issues.test.ts"
        ;;
    "chat")
        TEST_FILE="tests/api/chat.test.ts"
        ;;
    "all")
        echo "Running all test suites..."
        exec ./test-runner-enhanced.sh
        ;;
    *)
        echo "Unknown test suite: $TEST_SUITE"
        echo "Run '$0' without arguments to see available test suites"
        exit 1
        ;;
esac

echo "🚀 Starting single test suite: $TEST_SUITE"

# Function to check if server is ready
check_server() {
    curl -s "$API_URL/health" > /dev/null 2>&1
    return $?
}

# Function to cleanup
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        echo "🧹 Stopping server..."
        kill $SERVER_PID 2>/dev/null
        wait $SERVER_PID 2>/dev/null
    fi
}

trap cleanup EXIT

# Check if server is already running
if check_server; then
    echo "✅ Server already running, using existing instance"
    export TEST_API_URL="$API_URL"
    npx vitest run "$TEST_FILE" --config tests/setup/vitest.config.ts
else
    echo "🖥️  Starting development server..."
    wrangler dev --port $PORT &
    SERVER_PID=$!
    
    # Wait for server
    echo "⏳ Waiting for server..."
    for i in {1..30}; do
        if check_server; then
            echo "✅ Server ready!"
            break
        fi
        sleep 1
        echo -n "."
    done
    
    if ! check_server; then
        echo "❌ Server failed to start"
        exit 1
    fi
    
    export TEST_API_URL="$API_URL"
    echo "🧪 Running $TEST_SUITE tests..."
    npx vitest run "$TEST_FILE" --config tests/setup/vitest.config.ts
fi