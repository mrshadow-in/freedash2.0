#!/bin/bash

# 1. Pull latest code
echo "⬇️ Pulling latest changes..."
git pull

# 2. Rebuild containers (Backend needs rebuild for Prisma client & code changes)
echo "🏗️ Rebuilding Docker containers..."
docker-compose build --no-cache backend frontend

# 3. Start containers in background
echo "🚀 Starting services..."
docker-compose up -d

# 4. Wait for DB to be healthy
echo "⏳ Waiting for Database..."
sleep 10

# 5. Push Database Schema Changes (Since we modified schema.prisma)
echo "📦 Updating Database Schema..."
docker-compose exec -T backend npx prisma db push

echo "✅ Update Complete!"
echo "👉 You may need to restart the bot inside the backend if it didn't auto-reload (Docker restart handles this usually)."
