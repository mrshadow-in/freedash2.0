# Backend Dockerfile
FROM node:18-slim

WORKDIR /app

# Install system dependencies (openssl is required for Prisma)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Copy Prisma schema (needed before npm install so postinstall can run)
COPY prisma ./prisma

# Install dependencies (postinstall will auto-generate Prisma client)
RUN npm install -g typescript
RUN npm install

# Fix Prisma binary permissions
RUN chmod +x /app/node_modules/.bin/prisma || true
RUN chmod +x /app/node_modules/prisma/build/index.js || true

# Copy rest of source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose API port
EXPOSE 3000

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
