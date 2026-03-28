# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install dependencies (--force for platform-specific rollup dep)
RUN npm install --force

# Copy env file for build-time VITE_* variables
# In production, pass build args or mount .env at build time
COPY ../.env* ../

# Copy source code and public assets
COPY src ./src
COPY public ./public
COPY index.html ./

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 9003

CMD ["nginx", "-g", "daemon off;"]
