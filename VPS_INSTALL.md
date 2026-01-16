# FreeDash 2.0 - VPS Installation Guide (Docker)

Complete step-by-step guide to deploy FreeDash 2.0 on a VPS using Docker.

---

## 📋 Prerequisites

### VPS Requirements
- **OS**: Ubuntu 20.04 LTS or newer (recommended)
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Disk**: 20GB+ free space
- **CPU**: 2+ cores recommended
- **SSH Access**: Root or sudo user

### Required Services
- Pterodactyl Panel (already installed)
- Domain name (for SSL)
- SMTP server (for emails)

---

## 🚀 Step-by-Step Installation

### Step 1: Connect to Your VPS

```bash
ssh root@your-vps-ip
# OR
ssh username@your-vps-ip
```

---

### Step 2: Update System

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl git wget nano ufw
```

---

### Step 3: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

---

### Step 4: Configure Firewall

```bash
# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP & HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow backend port (if needed)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

### Step 5: Clone FreeDash Repository

```bash
# Navigate to installation directory
cd /opt

# Clone repository
git clone https://github.com/mrshadow-in/freedash2.0.git
cd freedash2.0

# Set proper permissions
sudo chown -R $USER:$USER /opt/freedash2.0
```

---

### Step 6: Generate Secure Secrets

```bash
# Generate JWT Secret
openssl rand -hex 64

# Save output - you'll need it for .env file
# Example output: 6dccf6fa557052b85f2af6137f74c8c605a36816...

# Generate JWT Refresh Secret (run again)
openssl rand -hex 64

# Save this too - you'll need both
```

---

### Step 7: Configure Environment Variables

```bash
# Create/edit .env file
nano .env
```

**Copy and paste this, then customize:**

```env
# Docker Compose Environment Variables

# Database (PostgreSQL)
DB_USERNAME=postgres
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD_HERE
DB_DATABASE=freedash

# Redis
REDIS_PASSWORD=YOUR_SECURE_REDIS_PASSWORD_HERE

# Backend Secrets
JWT_SECRET=YOUR_GENERATED_JWT_SECRET_HERE
JWT_REFRESH_SECRET=YOUR_GENERATED_JWT_REFRESH_SECRET_HERE

# Pterodactyl
PTERODACTYL_URL=https://panel.yourdomain.com
PTERODACTYL_API_KEY=ptla_YOUR_PTERODACTYL_API_KEY

# Discord (Optional - for Discord Bot)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=https://yourdomain.com/auth/discord/callback

# Frontend
FRONTEND_URL=https://yourdomain.com

# SMTP (Email) - Optional
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Node Environment
NODE_ENV=production
```

**Save with:** `Ctrl + X`, then `Y`, then `Enter`

---

### Step 8: Create Docker Compose File

```bash
nano docker-compose.yml
```

**Copy and paste:**

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: freedash_db
    restart: always
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_DATABASE}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - freedash_network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: freedash_redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - freedash_network

  # Backend API
  backend:
    build: ./backend
    container_name: freedash_backend
    restart: always
    environment:
      DATABASE_URL: postgresql://${DB_USERNAME}:${DB_PASSWORD}@postgres:5432/${DB_DATABASE}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      PTERODACTYL_URL: ${PTERODACTYL_URL}
      PTERODACTYL_API_KEY: ${PTERODACTYL_API_KEY}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      NODE_ENV: production
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    networks:
      - freedash_network
    volumes:
      - ./backend:/app
      - /app/node_modules

  # Frontend
  frontend:
    build: ./frontend
    container_name: freedash_frontend
    restart: always
    environment:
      VITE_API_URL: https://yourdomain.com/api
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - freedash_network
    volumes:
      - ./frontend:/app
      - /app/node_modules

networks:
  freedash_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

**Save and exit:** `Ctrl + X`, `Y`, `Enter`

---

### Step 9: Create Backend Dockerfile

```bash
nano backend/Dockerfile
```

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

# Copy app files
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3000

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

---

### Step 10: Create Frontend Dockerfile

```bash
nano frontend/Dockerfile
```

```dockerfile
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

### Step 11: Create Nginx Config for Frontend

```bash
nano frontend/nginx.conf
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /api/ws {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### Step 12: Build and Start Docker Containers

```bash
# Build images
docker-compose build

# Start containers in detached mode
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

### Step 13: Run Database Migrations

```bash
# Access backend container
docker exec -it freedash_backend sh

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client (if not done)
npx prisma generate

# Exit container
exit
```

---

### Step 14: Create Admin User (Optional)

```bash
# Access backend container
docker exec -it freedash_backend sh

# Create admin via Prisma Studio or script
npx prisma studio

# OR create via database
docker exec -it freedash_db psql -U postgres -d freedash

# SQL to create admin (update password hash)
INSERT INTO "User" (id, username, email, password, role, coins) 
VALUES (gen_random_uuid(), 'admin', 'admin@yourdomain.com', 'hashed_password', 'admin', 10000);
```

---

### Step 15: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Stop frontend container temporarily
docker-compose stop frontend

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx config for SSL
nano frontend/nginx.conf
```

**Add SSL configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ... rest of nginx config
}
```

**Update docker-compose.yml to mount SSL certificates:**

```yaml
frontend:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

```bash
# Restart frontend
docker-compose up -d frontend
```

---

### Step 16: Configure Auto-Renewal for SSL

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e

# Add this line:
0 3 * * * certbot renew --quiet && docker-compose restart frontend
```

---

## 🔧 Post-Installation

### Access Your Panel

1. Open browser: `https://yourdomain.com`
2. Register first user
3. Check admin panel: `https://yourdomain.com/admin`

### Configure Panel Settings

1. **Admin Panel** → Bot Configuration
2. Set Discord OAuth credentials
3. Configure SMTP settings
4. Create server plans
5. Customize theme and branding

---

## 🛠️ Useful Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

### Stop/Start
```bash
# Stop all
docker-compose down

# Start all
docker-compose up -d

# Rebuild and start
docker-compose up -d --build
```

### Database Backup
```bash
# Backup
docker exec freedash_db pg_dump -U postgres freedash > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260116.sql | docker exec -i freedash_db psql -U postgres freedash
```

### Update Code
```bash
cd /opt/freedash2.0

# Pull latest code
git pull origin main

# Rebuild containers
docker-compose build

# Restart
docker-compose up -d
```

---

## 🐛 Troubleshooting

### Console Not Connecting
```bash
# Check backend logs
docker-compose logs backend | grep "WS Console"

# Verify JWT secret is set
docker exec freedash_backend printenv | grep JWT_SECRET

# Restart backend
docker-compose restart backend
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check connection
docker exec freedash_backend psql $DATABASE_URL

# Restart database
docker-compose restart postgres
```

### Frontend 502 Error
```bash
# Check nginx logs
docker-compose logs frontend

# Verify backend is running
curl http://localhost:3000/health

# Check nginx config
docker exec freedash_frontend nginx -t
```

### Out of Memory
```bash
# Check memory usage
docker stats

# Increase VPS RAM or add swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 🔐 Security Best Practices

1. **Change default passwords** in `.env`
2. **Use strong JWT secrets** (64+ characters)
3. **Enable UFW firewall**
4. **Keep system updated**: `sudo apt update && sudo apt upgrade`
5. **Regular backups** of database
6. **Use SSL/HTTPS** always
7. **Disable root SSH** login
8. **Use fail2ban** for SSH protection
9. **Monitor logs** regularly
10. **Update FreeDash** regularly

---

## 📊 Monitoring

### Install Monitoring Tools (Optional)

```bash
# Install Docker monitoring
docker run -d --name portainer \
  -p 9000:9000 \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  portainer/portainer-ce

# Access Portainer
# https://your-vps-ip:9000
```

---

## 🎉 Done!

Your FreeDash 2.0 panel is now running on:
- **Frontend**: https://yourdomain.com
- **Backend API**: https://yourdomain.com/api
- **Admin Panel**: https://yourdomain.com/admin

**Need help?** Check:
- [GitHub Issues](https://github.com/mrshadow-in/freedash2.0/issues)
- [Discord Community](https://discord.gg/your-invite)
- Backend Logs: `docker-compose logs backend`

---

**Happy Hosting! 🚀**
