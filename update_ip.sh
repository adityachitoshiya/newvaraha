#!/bin/bash

# Configuration
ENV_FILE="frontend/.env"
ENV_LOCAL_FILE="frontend/.env.local"

# Text Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Varaha Jewels IP Updater ===${NC}"
echo "This script updates the API URL in your frontend configuration files."
echo ""

# Display Current Config
echo "Current API URL in .env:"
grep "NEXT_PUBLIC_API_URL" $ENV_FILE || echo "Not found"
echo ""

# Validation Loop
while true; do
    read -p "Enter your new Local IP Address (e.g., 192.168.1.X): " NEW_IP
    
    # Simple validation using regex for IP format
    if [[ $NEW_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        break
    else
        echo "Invalid IP format. Please try again (e.g., 192.168.1.5)"
    fi
done

NEW_API_URL="http://${NEW_IP}:8000"
NEW_SITE_URL="http://${NEW_IP}:3000"

echo ""
echo -e "Updating API to: ${GREEN}${NEW_API_URL}${NC}"
echo -e "Updating Site to: ${GREEN}${NEW_SITE_URL}${NC}"

# Update .env
if [ -f "$ENV_FILE" ]; then
    sed -i '' "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=${NEW_API_URL}|g" "$ENV_FILE"
    sed -i '' "s|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=${NEW_SITE_URL}|g" "$ENV_FILE"
    echo -e "${GREEN}✔ Updated $ENV_FILE${NC}"
else
    echo "⚠ Warning: $ENV_FILE not found"
fi

# Update .env.local
if [ -f "$ENV_LOCAL_FILE" ]; then
    sed -i '' "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=${NEW_API_URL}|g" "$ENV_LOCAL_FILE"
    sed -i '' "s|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=${NEW_SITE_URL}|g" "$ENV_LOCAL_FILE"
    echo -e "${GREEN}✔ Updated $ENV_LOCAL_FILE${NC}"
else
    echo "Creating $ENV_LOCAL_FILE..."
    echo "NEXT_PUBLIC_API_URL=${NEW_API_URL}" > "$ENV_LOCAL_FILE"
    echo "NEXT_PUBLIC_SITE_URL=${NEW_SITE_URL}" >> "$ENV_LOCAL_FILE"
    echo -e "${GREEN}✔ Created $ENV_LOCAL_FILE${NC}"
fi

echo ""
echo -e "${BLUE}Done!${NC}"
echo "Please restart your frontend server for changes to take effect:"
echo "  cd frontend && npm run dev"
