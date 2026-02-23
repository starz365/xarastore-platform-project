#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Supabase migrations...${NC}\n"

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if required env vars are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set${NC}"
    exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\/\([^.]*\).*/\1/')

echo -e "${GREEN}Project: $PROJECT_REF${NC}"
echo -e "${GREEN}Running migrations...${NC}\n"

# Function to run SQL file
run_migration() {
    local file=$1
    local filename=$(basename "$file")
    
    echo -e "${YELLOW}Running: $filename${NC}"
    
    # Use curl to execute SQL via Supabase REST API
    response=$(curl -s -X POST \
        "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        --data "{\"query\": $(jq -Rs . < "$file")}")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success: $filename${NC}\n"
    else
        echo -e "${RED}✗ Failed: $filename${NC}"
        echo -e "${RED}Response: $response${NC}\n"
    fi
}

# Run migrations in order
for migration in lib/supabase/migrations/*.sql; do
    if [ -f "$migration" ]; then
        run_migration "$migration"
    fi
done

echo -e "${GREEN}Migrations completed!${NC}"
