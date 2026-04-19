# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and Prisma schemas first for better layer caching
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY src ./src

# Generate Prisma clients for all schemas
RUN npm run generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy Prisma schemas and generated clients
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p /app/logs

EXPOSE 9002

CMD ["node", "dist/app.js"]
