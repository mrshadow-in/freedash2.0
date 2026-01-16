#!/bin/bash
# FreeDash 2.0 - VPS Installation Script
# Copy and paste these commands one by one into your VPS terminal

# ===================================
# STEP 1: Update System
# ===================================
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git wget nano ufw

# ===================================
# STEP 2: Install Docker
# ===================================
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# ===================================
# STEP 3: Configure Firewall
# ===================================
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable
sudo ufw status

# ===================================
# STEP 4: Clone FreeDash
# ===================================
cd /opt
sudo git clone https://github.com/mrshadow-in/freedash2.0.git
cd freedash2.0
sudo chown -R $USER:$USER /opt/freedash2.0

# ===================================
# STEP 5: Generate JWT Secrets
# ===================================
echo "JWT_SECRET:"
openssl rand -hex 64
echo ""
echo "JWT_REFRESH_SECRET:"
openssl rand -hex 64

# COPY BOTH SECRETS ABOVE - YOU'LL NEED THEM FOR .env FILE

# ===================================
# STEP 6: Create .env File
# ===================================
# Edit this file and add your settings
nano .env

# ===================================
# STEP 7: Build and Start Docker
# ===================================
docker-compose build
docker-compose up -d

# ===================================
# STEP 8: Check Logs
# ===================================
docker-compose logs -f

# ===================================
# STEP 9: Run Database Migrations
# ===================================
docker exec -it freedash_backend npx prisma migrate deploy
docker exec -it freedash_backend npx prisma generate

# ===================================
# STEP 10: Setup SSL (Let's Encrypt)
# ===================================
sudo apt install -y certbot python3-certbot-nginx
docker-compose stop frontend
sudo certbot certonly --standalone -d yourdomain.com
# Update nginx config and restart
docker-compose up -d frontend

# ===================================
# USEFUL COMMANDS
# ===================================

# View all logs
# docker-compose logs -f

# View backend logs only
# docker-compose logs -f backend

# Restart all services
# docker-compose restart

# Restart specific service
# docker-compose restart backend

# Stop all
# docker-compose down

# Start all
# docker-compose up -d

# Database backup
# docker exec freedash_db pg_dump -U postgres freedash > backup_$(date +%Y%m%d).sql

# Update code
# cd /opt/freedash2.0
# git pull origin main
# docker-compose build
# docker-compose up -d

# Check running containers
# docker-compose ps

# Check container stats
# docker stats

echo "Installation complete! Access your panel at https://yourdomain.com"
