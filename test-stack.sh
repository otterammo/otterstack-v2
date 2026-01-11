#!/bin/bash
#
# OtterStack Smoke Test Runner
# Convenience script to run smoke tests with common options
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_SCRIPT="$SCRIPT_DIR/tests/smoke_test.py"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is required but not installed${NC}"
    exit 1
fi

# Make test script executable
chmod +x "$TEST_SCRIPT"

# Parse arguments
VERBOSE=""
JSON=""
WAIT_FOR_STACK=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE="--verbose"
            shift
            ;;
        --json)
            JSON="--json"
            shift
            ;;
        --wait)
            WAIT_FOR_STACK="true"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -v, --verbose    Show all test results (not just failures)"
            echo "  --json           Output results as JSON"
            echo "  --wait           Wait for stack to be ready before testing (30s delay)"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0               # Run tests with default settings"
            echo "  $0 -v            # Run tests with verbose output"
            echo "  $0 --wait        # Wait for services to start, then test"
            echo "  $0 --json        # Output JSON for CI/CD integration"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Wait for stack if requested
if [ -n "$WAIT_FOR_STACK" ]; then
    echo -e "${YELLOW}Waiting 30 seconds for services to initialize...${NC}"
    sleep 30
fi

# Run the smoke tests
echo -e "${BLUE}Running OtterStack smoke tests...${NC}"
echo ""

if python3 "$TEST_SCRIPT" $VERBOSE $JSON; then
    echo -e "${GREEN}✓ All smoke tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some smoke tests failed${NC}"
    echo -e "${YELLOW}Tip: Run with -v flag for detailed output${NC}"
    exit 1
fi
