#!/bin/bash

# FreeDash 2.0 - VPS Update Script
# This script updates the application with new features

echo "🚀 FreeDash 2.0 - VPS Update Script"
echo "===================================="
echo ""

# Step 1: Stop containers
echo "📦 Step 1: Stopping containers..."
docker-compose down
echo "✅ Containers stopped"
echo ""

# Step 2: Pull latest changes (if using git)
echo "📥 Step 2: Pulling latest changes..."
git pull origin main || echo "⚠️  Git pull skipped (not a git repo or already up to date)"
echo ""

# Step 3: Rebuild images
echo "🔨 Step 3: Rebuilding Docker images..."
docker-compose build --no-cache
echo "✅ Images rebuilt"
echo ""

# Step 4: Start containers
echo "🚀 Step 4: Starting containers..."
docker-compose up -d
echo "✅ Containers started"
echo ""

# Step 5: Wait for database to be ready
echo "⏳ Step 5: Waiting for database to be ready..."
sleep 10
echo "✅ Database should be ready"
echo ""

# Step 6: Run Prisma migration
echo "🗄️  Step 6: Running Prisma migration..."
docker-compose exec -T dashboard_backend npx prisma migrate deploy
echo "✅ Migration completed"
echo ""

# Step 7: Generate Prisma client
echo "📝 Step 7: Generating Prisma client..."
docker-compose exec -T dashboard_backend npx prisma generate
echo "✅ Prisma client generated"
echo ""

# Step 8: Restart backend to apply changes
echo "🔄 Step 8: Restarting backend..."
docker-compose restart dashboard_backend
echo "✅ Backend restarted"
echo ""

# Step 9: Show container status
echo "📊 Step 9: Container Status"
echo "============================"
docker-compose ps
echo ""

# Step 10: Show logs
echo "📋 Step 10: Recent Logs"
echo "======================="
docker-compose logs --tail=20 dashboard_backend
echo ""

echo "✅ Update Complete!"
echo ""
echo "🌐 Your FreeDash panel should now be updated with:"
echo "   - Enhanced Plugin Manager with popular plugins"
echo "   - Installed plugins list"
echo "   - Paper version changer"
echo "   - Subuser management system"
echo "   - Suspended server banner"
echo ""
echo "📝 To view logs: docker-compose logs -f"
echo "🔍 To check status: docker-compose ps"
echo ""
