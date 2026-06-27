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

# Production stage
FROM node:20-alpine

WORKDIR /app

# Prisma query engine (linux-musl) requires OpenSSL 1.1 compat on Alpine 3.17+
RUN apk add --no-cache openssl1.1-compat

# Copy built assets, prisma schemas, and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

RUN mkdir -p /app/data

EXPOSE 9002

CMD ["npm", "run", "start"]
