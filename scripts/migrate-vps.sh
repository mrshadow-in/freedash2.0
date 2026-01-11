#!/bin/bash

# Quick Migration Script for ServerAccess table
# Run this on your VPS after building new images

echo "🗄️  Running Prisma Migration for ServerAccess..."
echo ""

# Navigate to backend directory
cd /root/freedash2.0/backend

# Run migration
npx prisma migrate dev --name add_server_access

echo ""
echo "✅ Migration complete!"
echo ""
echo "Now restart the containers:"
echo "  cd /root/freedash2.0"
echo "  docker-compose restart"
