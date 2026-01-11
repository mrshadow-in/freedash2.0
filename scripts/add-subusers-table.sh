#!/bin/bash

# Simple migration script for adding ServerAccess table
# Run this on your VPS

echo "🗄️  Creating ServerAccess table migration..."
echo ""

# Create migration SQL
cat > /tmp/add_server_access.sql << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "server_access" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "server_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "server_access_serverId_userId_key" ON "server_access"("serverId", "userId");

-- AddForeignKey
ALTER TABLE "server_access" ADD CONSTRAINT "server_access_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_access" ADD CONSTRAINT "server_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EOF

echo "✅ Migration SQL created"
echo ""

# Run migration
echo "Running migration..."
docker-compose exec -T dashboard_db psql -U postgres -d freedash < /tmp/add_server_access.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration successful!"
    echo ""
    echo "Verifying table..."
    docker-compose exec dashboard_db psql -U postgres -d freedash -c "\d server_access"
    echo ""
    echo "✅ ServerAccess table created!"
    echo ""
    echo "Now restart the backend:"
    echo "  docker-compose restart dashboard_backend"
else
    echo ""
    echo "❌ Migration failed. Check the error above."
fi

# Cleanup
rm /tmp/add_server_access.sql
