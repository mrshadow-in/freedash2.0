#!/bin/bash
# VPS Deployment Script - Fix Ads Page White Background + Database Migration

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Navigate to project directory
cd ~/freedash2.0

echo "📥 Pulling latest code from GitHub..."
git pull origin main

echo "🛑 Stopping containers..."
docker compose down

echo "🔨 Building and starting containers..."
docker compose up -d --build

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🗄️ Running database migration..."
docker compose exec -T backend npx prisma db push --accept-data-loss

echo "🔄 Restarting backend to ensure changes apply..."
docker compose restart backend

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "  1. Clear browser cache (Ctrl+Shift+Delete)"
echo "  2. Hard refresh the page (Ctrl+F5)"
echo "  3. Test the Admin Ads page dropdowns"
echo ""
echo "🔍 To check logs:"
echo "  docker compose logs backend --tail=50"
echo "  docker compose logs frontend --tail=50"
