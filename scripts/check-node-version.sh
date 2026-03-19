#!/bin/bash

# Check Node.js version against .nvmrc
# Usage: ./scripts/check-node-version.sh

set -e

NODE_VERSION_FILE=".nvmrc"
REQUIRED_VERSION=$(cat "$NODE_VERSION_FILE" 2>/dev/null || echo "20")
CURRENT_VERSION=$(node --version 2>/dev/null | sed 's/v//' || echo "none")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Node.js Version Check"
echo "=========================================="
echo ""

if [ "$CURRENT_VERSION" = "none" ]; then
  echo -e "${RED}❌ Node.js is not installed!${NC}"
  echo ""
  echo "Please install Node.js v${REQUIRED_VERSION} or higher."
  echo "Recommended: Use nvm (https://github.com/nvm-sh/nvm)"
  echo ""
  echo "Quick install:"
  echo "  nvm install ${REQUIRED_VERSION}"
  echo "  nvm use ${REQUIRED_VERSION}"
  exit 1
fi

# Extract major versions
REQUIRED_MAJOR=$(echo "$REQUIRED_VERSION" | cut -d. -f1)
CURRENT_MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)

echo -e "Required: v${YELLOW}${REQUIRED_VERSION}${NC}"
echo -e "Current:  v${YELLOW}${CURRENT_VERSION}${NC}"
echo ""

if [ "$CURRENT_MAJOR" -eq "$REQUIRED_MAJOR" ]; then
  echo -e "${GREEN}✅ Node.js version is correct!${NC}"
  exit 0
elif [ "$CURRENT_MAJOR" -lt "$REQUIRED_MAJOR" ]; then
  echo -e "${RED}❌ Node.js version is too old!${NC}"
  echo ""
  echo "Please upgrade to Node.js v${REQUIRED_VERSION} or higher."
  echo ""
  echo "If you're using nvm:"
  echo "  nvm install ${REQUIRED_VERSION}"
  echo "  nvm use ${REQUIRED_VERSION}"
  exit 1
else
  echo -e "${YELLOW}⚠️  Node.js version is newer than required.${NC}"
  echo "   This should be fine, but the project is tested with v${REQUIRED_VERSION}."
  exit 0
fi
