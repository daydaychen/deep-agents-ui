#!/bin/bash

# Setup development environment
# Usage: ./scripts/setup-dev.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Development Environment Setup"
echo "=========================================="
echo ""

# Check if running from project root
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Please run this script from the project root directory.${NC}"
  exit 1
fi

# Check Node.js version
echo -e "${BLUE}📦 Checking Node.js version...${NC}"
if ! ./scripts/check-node-version.sh; then
  exit 1
fi

echo ""

# Check if pnpm is available
echo -e "${BLUE}📦 Checking pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}❌ pnpm is not installed!${NC}"
  echo "Please install pnpm:"
  echo "  npm install -g pnpm"
  echo ""
  echo "Or use corepack:"
  echo "  corepack enable"
  echo "  corepack prepare pnpm@latest --activate"
  exit 1
fi

echo -e "${GREEN}✅ pnpm is available${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
if pnpm install --frozen-lockfile; then
  echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
  echo -e "${YELLOW}⚠️  No lockfile found or lockfile outdated. Running pnpm install...${NC}"
  if pnpm install; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
  else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
  fi
fi

echo ""

# Setup husky hooks
echo -e "${BLUE}🔧 Setting up Git hooks...${NC}"
if [ -d ".git" ]; then
  pnpm exec husky install 2>/dev/null || true
  echo -e "${GREEN}✅ Git hooks configured${NC}"
else
  echo -e "${YELLOW}⚠️  Not a Git repository. Skipping hook setup.${NC}"
fi

echo ""

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
  echo -e "${BLUE}📝 Creating .env.local...${NC}"
  cat > .env.local << 'EOF'
# Development environment variables
# Add your local configuration here

# Example:
# NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
  echo -e "${GREEN}✅ Created .env.local (please configure it)${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Configure .env.local with your settings"
echo "  2. Run 'pnpm dev' to start the development server"
echo ""
