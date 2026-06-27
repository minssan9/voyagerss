# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Generate Prisma clients for all schemas
RUN npm run generate || echo "Prisma generate skipped or failed"

# Build the application
RUN npm run build

# Production stage — Debian slim for Prisma OpenSSL 3 query engine
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy built assets, prisma schemas, and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

RUN mkdir -p /app/data

EXPOSE 9002

CMD ["npm", "run", "start"]
