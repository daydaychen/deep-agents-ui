#!/bin/bash

# TypeScript strict type checking script
# Usage: ./scripts/type-check.sh [--strict]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

STRICT_MODE=false

# Parse arguments
if [ "$1" = "--strict" ]; then
  STRICT_MODE=true
fi

echo "=========================================="
echo "TypeScript Type Check"
echo "=========================================="
echo ""

if [ "$STRICT_MODE" = true ]; then
  echo -e "${BLUE}🔍 Running in STRICT mode...${NC}"
  echo ""

  # Create temporary tsconfig for strict checking
  cat > tsconfig.strict.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
EOF

  if npx tsc --project tsconfig.strict.json --noEmit; then
    echo ""
    echo -e "${GREEN}✅ Strict type check passed!${NC}"
    rm tsconfig.strict.json
    exit 0
  else
    echo ""
    echo -e "${RED}❌ Strict type check failed!${NC}"
    rm tsconfig.strict.json
    exit 1
  fi
else
  echo -e "${BLUE}🔍 Running standard type check...${NC}"
  echo ""

  if npx tsc --noEmit; then
    echo ""
    echo -e "${GREEN}✅ Type check passed!${NC}"
    exit 0
  else
    echo ""
    echo -e "${RED}❌ Type check failed!${NC}"
    exit 1
  fi
fi
