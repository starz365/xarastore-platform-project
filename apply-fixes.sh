#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}XaraStore Platform - Quick Fix Script${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found!${NC}"
    echo -e "${YELLOW}Please run this script from your project root directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}This script will:${NC}"
echo "  1. Backup your current next.config.js"
echo "  2. Apply the fixed next.config.js"
echo "  3. Create .env.local if it doesn't exist"
echo "  4. Clear Next.js cache"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

# Step 1: Backup next.config.js
echo -e "\n${YELLOW}📦 Backing up next.config.js...${NC}"
if [ -f "next.config.js" ]; then
    cp next.config.js next.config.js.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backup created${NC}"
else
    echo -e "${RED}⚠️  next.config.js not found${NC}"
fi

# Step 2: Copy fixed config
echo -e "\n${YELLOW}🔧 Applying fixed next.config.js...${NC}"
if [ -f "fixed-next.config.js" ]; then
    cp fixed-next.config.js next.config.js
    echo -e "${GREEN}✅ next.config.js updated${NC}"
else
    echo -e "${RED}❌ fixed-next.config.js not found in current directory${NC}"
    echo -e "${YELLOW}Please copy fixed-next.config.js to your project root first${NC}"
    exit 1
fi

# Step 3: Check .env.local
echo -e "\n${YELLOW}📝 Checking .env.local...${NC}"
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Creating .env.local from example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
    else
        cat > .env.local << 'ENVEOF'
# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=XaraStore

# Add your other environment variables below
ENVEOF
    fi
    echo -e "${GREEN}✅ .env.local created${NC}"
    echo -e "${YELLOW}⚠️  Please update .env.local with your actual values${NC}"
else
    echo -e "${GREEN}✅ .env.local exists${NC}"
    if ! grep -q "NEXT_PUBLIC_SITE_URL" .env.local; then
        echo -e "${YELLOW}⚠️  Adding NEXT_PUBLIC_SITE_URL to .env.local${NC}"
        echo -e "\n# Site Configuration" >> .env.local
        echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" >> .env.local
        echo "NEXT_PUBLIC_SITE_NAME=XaraStore" >> .env.local
    fi
fi

# Step 4: Clear cache
echo -e "\n${YELLOW}🗑️  Clearing Next.js cache...${NC}"
if [ -d ".next" ]; then
    rm -rf .next
    echo -e "${GREEN}✅ Cache cleared${NC}"
else
    echo -e "${YELLOW}⚠️  No .next directory found (already clean)${NC}"
fi

# Summary
echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ All fixes applied successfully!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Update app/layout.tsx with metadataBase (see layout-metadata-example.tsx)"
echo "  2. Review .env.local and add your environment variables"
echo "  3. Restart your dev server: npm run dev"
echo ""
echo -e "${YELLOW}Manual steps required:${NC}"
echo "  - Add metadataBase to your app/layout.tsx metadata export"
echo "  - See IMPLEMENTATION_GUIDE.md for detailed instructions"
echo ""
