# Voyagerss Setup Guide

Complete guide for setting up and running Voyagerss in local development and production environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Git**: Latest version
- **Database**: PostgreSQL (for production) or SQLite (for development)

### Optional Tools
- **Docker**: For containerized deployment
- **PM2**: For production process management

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/minssan9/voyagerss.git
cd voyagerss
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd backend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Database
DATABASE_URL="file:./dev.db"  # SQLite for development

# API Keys
DART_API_KEY="your-dart-api-key"
KRX_API_KEY="your-krx-api-key"

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"

# CORS
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:5174"
```

#### Setup Database (Prisma)

> **Note**: Prisma client generation may require internet access to download engine binaries.

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed
```

If you encounter network issues with Prisma:
```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
```

#### Build TypeScript

```bash
npm run build
```

#### Start Development Server

```bash
# Development mode with auto-reload
npm run dev

# Or build and run
npm run build
npm start
```

Backend will be available at: `http://localhost:3000`

### 3. Frontend Setup

#### Install Dependencies

```bash
cd ../frontend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
# API Endpoints
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=30000

# Environment
VITE_ENV=development

# Firebase (Optional)
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
```

#### Start Development Server

```bash
# Development mode with hot reload
npm run dev

# Or local mode
npm run local
```

Frontend will be available at: `http://localhost:5173`

### 4. Verify Installation

1. Open browser to `http://localhost:5173`
2. Check that frontend loads without errors
3. Verify API connection by checking browser console
4. Test authentication flow (if applicable)

---

## Production Deployment

### 1. Backend Production Setup

#### Install Dependencies

```bash
cd backend
npm ci --only=production
```

#### Configure Production Environment

Create a `.env.production` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/voyagerss?schema=public"

# API Keys
DART_API_KEY="your-production-dart-api-key"
KRX_API_KEY="your-production-krx-api-key"

# Server
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

# JWT
JWT_SECRET="strong-production-secret-key"
JWT_EXPIRES_IN="7d"

# Security
CORS_ORIGINS="https://yourdomain.com"
HELMET_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

#### Setup Production Database

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

#### Build Application

```bash
npm run build
```

#### Start Production Server

**Option 1: Using PM2 (Recommended)**

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start dist/app.js --name voyagerss-backend

# Save PM2 configuration
pm2 save

# Setup auto-restart on server reboot
pm2 startup
```

**Option 2: Using Node.js directly**

```bash
NODE_ENV=production node dist/app.js
```

**Option 3: Using Docker**

```bash
# Build Docker image
docker build -t voyagerss-backend .

# Run container
docker run -d \
  --name voyagerss-backend \
  -p 3000:3000 \
  --env-file .env.production \
  voyagerss-backend
```

### 2. Frontend Production Setup

#### Install Dependencies

```bash
cd frontend
npm ci --only=production
```

#### Configure Production Environment

Create a `.env.production` file:

```bash
# API Endpoints
VITE_API_URL=https://api.yourdomain.com
VITE_API_TIMEOUT=30000

# Environment
VITE_ENV=production

# Firebase
VITE_FIREBASE_API_KEY="your-production-firebase-key"
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"

# Analytics (Optional)
VITE_GA_TRACKING_ID="G-XXXXXXXXXX"
```

#### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

#### Deploy Static Files

**Option 1: Serve with Nginx**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/voyagerss/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Option 2: Preview Locally**

```bash
npm run preview
```

**Option 3: Deploy to CDN**

Upload the `dist` directory to your CDN provider (Vercel, Netlify, AWS S3 + CloudFront, etc.)

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- dateUtils.test.ts

# Run tests in watch mode
npm test -- --watch
```

#### Current Test Status

- ✅ **dateUtils.test.ts**: 10 tests passing
- ✅ **api-integration.test.ts**: 12 tests passing
- ⊘ **fearGreedCalculator.test.ts**: Skipped (requires Prisma setup)
- ⊘ **databaseService.test.ts**: Skipped (outdated methods)
- ⊘ **dartCollector.test.ts**: Skipped (class refactored)
- ⊘ **krxCollector.test.ts**: Skipped (class refactored)

### Frontend Tests

```bash
cd frontend

# Run tests (if configured)
npm test
```

### Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

---

## Troubleshooting

### Common Issues

#### 1. Prisma Client Not Initialized

**Error:**
```
@prisma/client did not initialize yet. Please run "prisma generate"
```

**Solution:**
```bash
cd backend
npx prisma generate
```

If network issues occur:
```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
```

#### 2. Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

#### 3. Module Not Found Errors

**Error:**
```
Cannot find module 'supertest'
```

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. TypeScript Compilation Errors

**Error:**
```
error TS2307: Cannot find module '@/...'
```

**Solution:**
```bash
# Verify tsconfig.json paths are correct
# Rebuild the project
npm run build
```

#### 5. Database Connection Issues

**Error:**
```
Error: Can't reach database server
```

**Solution:**
- Verify `DATABASE_URL` in `.env` is correct
- Check database server is running
- Test connection: `npx prisma db pull`

#### 6. CORS Errors in Browser

**Error:**
```
Access to fetch at 'http://localhost:3000' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:**
- Add frontend URL to `ALLOWED_ORIGINS` in backend `.env`
- Restart backend server

#### 7. Test Failures Due to Missing Dependencies

**Solution:**
```bash
cd backend
npm install --save-dev ts-jest supertest @types/supertest
```

### Performance Optimization

#### Backend

1. **Enable caching** for frequently accessed data
2. **Use PM2 cluster mode** for multi-core utilization:
   ```bash
   pm2 start dist/app.js -i max --name voyagerss-backend
   ```
3. **Setup Redis** for session management
4. **Enable compression** in Express
5. **Optimize database queries** with indexes

#### Frontend

1. **Enable code splitting** in Vite config
2. **Lazy load routes** using React.lazy()
3. **Optimize images** and assets
4. **Enable PWA** features for offline support
5. **Setup CDN** for static assets

---

## Health Checks

### Backend Health Check

```bash
curl http://localhost:3000/health
```

### Database Health Check

```bash
cd backend
npx prisma db pull
```

### Frontend Build Verification

```bash
cd frontend
npm run build
# Check dist folder is created
ls -la dist/
```

---

## Monitoring

### PM2 Monitoring

```bash
# View logs
pm2 logs voyagerss-backend

# Monitor resources
pm2 monit

# View status
pm2 status
```

### Application Logs

Backend logs are stored in:
- Development: Console output
- Production: `./logs/app.log` (if configured)

---

## Backup and Maintenance

### Database Backup

```bash
# PostgreSQL backup
pg_dump voyagerss > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql voyagerss < backup_20250101_120000.sql
```

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update to latest versions (careful!)
npm install -g npm-check-updates
ncu -u
npm install
```

---

## Security Checklist

- [ ] Change default JWT secret
- [ ] Use strong database passwords
- [ ] Enable HTTPS in production
- [ ] Set up firewall rules
- [ ] Keep dependencies updated
- [ ] Enable rate limiting
- [ ] Sanitize user inputs
- [ ] Use environment variables for secrets
- [ ] Enable CORS only for trusted origins
- [ ] Regular security audits: `npm audit`

---

## Support

For issues and questions:
- Create an issue on [GitHub](https://github.com/minssan9/voyagerss/issues)
- Check existing documentation
- Review error logs

---

## License

This project is licensed under the ISC License.
