# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install system dependencies (openssl and libc6-compat are required for Prisma on Alpine)
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./

# Copy Prisma schema (needed before npm install for postinstall)
COPY prisma ./prisma

# Install dependencies (Triggers postinstall: prisma generate)
RUN npm install

# FIX: Ensure ALL binaries in node_modules/.bin have execute permissions
RUN chmod -R +x node_modules/.bin && \
    if [ -d "node_modules/prisma" ]; then find node_modules/prisma -name "query-engine*" -exec chmod +x {} +; fi

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
