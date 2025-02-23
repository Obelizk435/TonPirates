#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting TonPirates setup...${NC}"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}MySQL is not installed. Please install MySQL first.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating .env file...${NC}"
    echo "DATABASE_URL=\"mysql://root:your_password@localhost:3306/tonpirates\"" > .env
    echo -e "${GREEN}Created .env file. Please update the database credentials.${NC}"
fi

# Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
npx prisma generate

# Push database schema
echo -e "${BLUE}Setting up database...${NC}"
npx prisma db push

# Initialize database with test data
echo -e "${BLUE}Initializing database with test data...${NC}"
npx ts-node scripts/init-db.ts

# Build the application
echo -e "${BLUE}Building the application...${NC}"
npm run build

echo -e "${GREEN}Setup complete! You can now start the game with 'npm run dev'${NC}"

