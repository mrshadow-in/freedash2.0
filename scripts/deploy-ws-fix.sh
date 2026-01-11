#!/bin/bash

# WebSocket Console Fix Deployment Script for VPS
# This script deploys the latest WebSocket proxy changes to your Docker VPS

set -e

echo "🚀 Deploying WebSocket Console Fix to VPS..."

# Check if we're on VPS or local machine
if [ -f /.dockerenv ]; then
    echo "✅ Running on VPS (inside Docker)"
    IS_VPS=true
else
    echo "📦 Running locally - will guide manual deployment"
    IS_VPS=false
fi

if [ "$IS_VPS" = false ]; then
    echo ""
    echo "================================================"
    echo "📋 MANUAL DEPLOYMENT INSTRUCTIONS FOR VPS"
    echo "================================================"
    echo ""
    echo "1️⃣ PUSH YOUR CODE TO GIT:"
    echo "   git add ."
    echo "   git commit -m 'Fix: WebSocket console proxy with logging'"
    echo "   git push origin main"
    echo ""
    echo "2️⃣ SSH INTO YOUR VPS:"
    echo "   ssh your-user@your-vps-ip"
    echo ""
    echo "3️⃣ PULL LATEST CODE:"
    echo "   cd /path/to/freedash2.0"
    echo "   git pull origin main"
    echo ""
    echo "4️⃣ REBUILD & RESTART CONTAINERS:"
    echo "   docker-compose down"
    echo "   docker-compose build --no-cache backend"
    echo "   docker-compose up -d"
    echo ""
    echo "5️⃣ VIEW BACKEND LOGS (TO SEE WS DIAGNOSTICS):"
    echo "   docker-compose logs -f backend"
    echo ""
    echo "6️⃣ TEST THE CONSOLE:"
    echo "   - Open your dashboard in browser"
    echo "   - Go to a server's console tab"
    echo "   - Watch the backend logs for emoji messages (✅/❌/🔌)"
    echo ""
    echo "================================================"
    echo ""
    
    # Offer to commit and push automatically
    read -p "Do you want me to commit and push now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📝 Committing changes..."
        git add .
        git commit -m "Fix: WebSocket console proxy with comprehensive logging" || echo "Nothing to commit"
        
        echo "⬆️ Pushing to remote..."
        git push origin main
        
        echo ""
        echo "✅ Code pushed! Now SSH into your VPS and run steps 3-6 above."
    fi
    
    exit 0
fi

# If running on VPS, auto-rebuild
echo "🔄 Stopping containers..."
docker-compose down

echo "🏗️ Rebuilding backend (this may take a few minutes)..."
docker-compose build --no-cache backend

echo "▶️ Starting containers..."
docker-compose up -d

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 To view live logs and see WebSocket diagnostics:"
echo "   docker-compose logs -f backend"
echo ""
echo "Look for these emoji indicators:"
echo "   ✅ = Success"
echo "   ❌ = Error"
echo "   🔌 = New WebSocket connection"
echo "   📋 = Connection params"
echo "   🔗 = Upstream connection"
echo ""
