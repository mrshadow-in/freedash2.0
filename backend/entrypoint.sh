#!/bin/sh

# Wait for database to be ready (optional, but good practice)
# echo "Waiting for database..."
# /wait-for-it.sh database:5432 -- timeout=30 -- strict -- echo "Database is up"

echo "🔄 Running Database Migrations..."
npx prisma migrate deploy

echo "🚀 Starting Backend..."
npm run start
