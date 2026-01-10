#!/bin/sh
set -e

echo "🔄 Running Database Migrations..."
npx prisma migrate deploy

echo "🚀 Starting Backend..."
npm run start
