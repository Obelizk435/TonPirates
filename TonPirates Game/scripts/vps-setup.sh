#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Prompt for domain name
read -p "Enter your domain name (e.g., example.com): " DOMAIN_NAME

# Update system
echo -e "${BLUE}Updating system...${NC}"
apt update && apt upgrade -y

# Install required packages
echo -e "${BLUE}Installing required packages...${NC}"
apt install -y nginx mysql-server certbot python3-certbot-nginx nodejs npm

# Install PM2 globally
echo -e "${BLUE}Installing PM2...${NC}"
npm install -g pm2

# Configure MySQL
echo -e "${BLUE}Configuring MySQL...${NC}"
mysql_secure_installation

# Create database and user
echo -e "${BLUE}Creating database...${NC}"
mysql -e "CREATE DATABASE IF NOT EXISTS tonpirates;"
read -p "Enter MySQL password for tonpirates user: " MYSQL_PASSWORD
mysql -e "CREATE USER IF NOT EXISTS 'tonpirates'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';"
mysql -e "GRANT ALL PRIVILEGES ON tonpirates.* TO 'tonpirates'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Configure Nginx
echo -e "${BLUE}Configuring Nginx...${NC}"
sed "s/your-domain.com/$DOMAIN_NAME/g" nginx/tonpirates.conf > /etc/nginx/sites-available/tonpirates
ln -sf /etc/nginx/sites-available/tonpirates /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Set up SSL with Let's Encrypt
echo -e "${BLUE}Setting up SSL certificate...${NC}"
certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email your-email@example.com

# Create .env file
echo -e "${BLUE}Creating .env file...${NC}"
cat > .env << EOL
DATABASE_URL="mysql://tonpirates:${MYSQL_PASSWORD}@localhost:3306/tonpirates"
EOL

# Install dependencies and build
echo -e "${BLUE}Installing dependencies and building...${NC}"
npm install
npm run build

# Start with PM2
echo -e "${BLUE}Starting application with PM2...${NC}"
pm2 delete tonpirates 2>/dev/null || true
pm2 start npm --name "tonpirates" -- start
pm2 save

# Set up PM2 to start on boot
echo -e "${BLUE}Setting up PM2 startup script...${NC}"
pm2 startup

echo -e "${GREEN}Setup complete!${NC}"
echo -e "Your game is now running at: https://$DOMAIN_NAME"
echo -e "To view logs: pm2 logs tonpirates"
echo -e "To restart: pm2 restart tonpirates"

