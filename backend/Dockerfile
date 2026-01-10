# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install system dependencies (openssl and libc6-compat are required for Prisma)
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install -g typescript
RUN npm install

# Copy source code and Prisma schema
COPY . .

# Generate Prisma Client (after schema is copied)
RUN npx --yes prisma generate

# Build TypeScript
RUN npm run build

# Expose API port
EXPOSE 3000

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
