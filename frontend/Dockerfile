# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=https://api.voyagerss.com/api
ARG VITE_API_URL=https://api.voyagerss.com
ARG VITE_API_WEB=https://api.voyagerss.com

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_WEB=$VITE_API_WEB

COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

RUN npm install

COPY src ./src
COPY public ./public
COPY index.html ./

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
