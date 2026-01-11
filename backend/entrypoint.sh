#!/bin/sh
set -e


echo "🚀 Applying Database Migrations..."
npx prisma db push
npx prisma generate

echo "🚀 Starting Backend..."
npm run start
