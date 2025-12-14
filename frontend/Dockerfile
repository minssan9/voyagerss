# Stage 1: Build Vue3 Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY workschd-vue3/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY workschd-vue3/ ./

# Build for production
RUN npm run build

# Stage 2: Nginx for serving Vue3
FROM nginx:alpine AS frontend

# Copy custom nginx config
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
