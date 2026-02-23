#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Layout.tsx Merge Verification Script${NC}"
echo -e "${BLUE}==========================================${NC}\n"

# Track overall status
ALL_GOOD=true

# Function to check file existence
check_file() {
    local file=$1
    local required=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ Found:${NC} $file"
        return 0
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}❌ Missing (REQUIRED):${NC} $file"
            ALL_GOOD=false
        else
            echo -e "${YELLOW}⚠️  Missing (optional):${NC} $file"
        fi
        return 1
    fi
}

# Function to check directory
check_dir() {
    local dir=$1
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ Directory exists:${NC} $dir"
        return 0
    else
        echo -e "${RED}❌ Directory missing:${NC} $dir"
        ALL_GOOD=false
        return 1
    fi
}

# Function to check env variable
check_env() {
    local var_name=$1
    local env_file=".env.local"
    
    if [ -f "$env_file" ]; then
        if grep -q "^$var_name=" "$env_file" || grep -q "^# $var_name=" "$env_file"; then
            echo -e "${GREEN}✅ Found in .env.local:${NC} $var_name"
            return 0
        else
            echo -e "${YELLOW}⚠️  Not found in .env.local:${NC} $var_name"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  .env.local not found${NC}"
        return 1
    fi
}

echo -e "${BLUE}Checking required files...${NC}\n"

# Check main layout
check_file "app/layout.tsx" "required"

# Check components
echo -e "\n${BLUE}Checking required components...${NC}\n"
check_file "app/providers.tsx" "required"
check_file "app/ClientComponentsWrapper.tsx" "required"
check_file "components/layout/Header.tsx" "required"
check_file "components/layout/Footer.tsx" "required"
check_file "components/shared/Toast.tsx" "required"
check_file "components/shared/OfflineIndicator.tsx" "required"

# Check fonts
echo -e "\n${BLUE}Checking font files...${NC}\n"
check_dir "app/fonts/Inter-fonts/web"
check_file "app/fonts/Inter-fonts/web/InterVariable.woff2" "required"

# Check settings manager
echo -e "\n${BLUE}Checking Settings Manager...${NC}\n"
check_file "lib/utils/settings.ts" "required"

# Check static assets
echo -e "\n${BLUE}Checking static assets...${NC}\n"
check_file "public/manifest.json" "required"
check_file "public/icons/apple-touch-icon.png" "required"
check_file "public/og-image.png" "optional"
check_file "public/twitter-image.png" "optional"

# Check environment variables
echo -e "\n${BLUE}Checking environment variables...${NC}\n"
check_env "NEXT_PUBLIC_APP_URL"
check_env "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION"

# Check CSS
echo -e "\n${BLUE}Checking styles...${NC}\n"
check_file "app/globals.css" "required"

# Summary
echo -e "\n${BLUE}==========================================${NC}"
if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ All required files are in place!${NC}"
    echo -e "${GREEN}You're ready to use the merged layout.${NC}\n"
    
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Review the new app/layout.tsx"
    echo "  2. Clear Next.js cache: rm -rf .next"
    echo "  3. Restart dev server: npm run dev"
    echo "  4. Check for any warnings in console"
else
    echo -e "${RED}❌ Some required files are missing!${NC}"
    echo -e "${YELLOW}Please fix the issues above before proceeding.${NC}\n"
    
    echo -e "${YELLOW}Common fixes:${NC}"
    echo "  - Font missing? Download Inter font and place in app/fonts/"
    echo "  - Components missing? Check your project structure"
    echo "  - Settings Manager missing? Verify lib/utils/settings.ts exists"
fi
echo -e "${BLUE}==========================================${NC}\n"

# Additional checks
echo -e "${BLUE}Additional Information:${NC}\n"

# Check if .next exists (might need clearing)
if [ -d ".next" ]; then
    echo -e "${YELLOW}ℹ️  .next directory exists - consider clearing cache${NC}"
    echo "   Run: rm -rf .next"
fi

# Check package.json for required dependencies
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ package.json found${NC}"
    
    # Check for key dependencies
    if grep -q "next-pwa" "package.json"; then
        echo -e "${GREEN}✅ next-pwa installed${NC}"
    else
        echo -e "${YELLOW}⚠️  next-pwa not found in package.json${NC}"
    fi
fi

echo ""
