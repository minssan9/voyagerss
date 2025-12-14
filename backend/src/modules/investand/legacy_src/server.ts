import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '@/config/swagger';

// 환경변수 로드
dotenv.config();

// 라우터 import
import apiRoutes from '@/routes/fearGreedApi';
import fearGreedRoutes from '@/routes/fearGreedPublic';
import dataRoutes from '@/routes/marketData';
import adminRoutes from '@/routes/adminManagement';
import dartRoutes from '@/routes/dartApiSimple';
import domainRoutes from '@/routes/domainApi';
import messagingRoutes from '@/routes/messagingApi';
import telegramWebhookRoutes from '@/routes/telegramWebhook';

// 미들웨어 import
import { errorHandler } from '@/middleware/errorMiddleware';
import { requestLogger } from '@/middleware/loggingMiddleware';

// 유틸리티 import
import { logger } from '@/utils/common/logger';
import { ServiceRegistry } from '@/services/domain/ServiceRegistry';

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 미들웨어 (with CSP modifications for Swagger)
if (process.env.HELMET_ENABLED === 'true') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        connectSrc: ["'self'", "https://unpkg.com"],
        imgSrc: ["'self'", "data:", "https://unpkg.com"],
        fontSrc: ["'self'", "data:", "https://unpkg.com"]
      }
    }
  }));
}

// CORS 설정
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:3000',
  'http://localhost:5173', // Vite default port
  'http://127.0.0.1:8082',
  'http://127.0.0.1:8083',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

// In development, allow all localhost origins
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all localhost origins
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-mfa-token', 'x-refresh-token', 'x-mfa-verified']
};

app.use(cors(corsOptions));

// 기본 미들웨어
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 로깅 미들웨어
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => console.log(message.trim())
    }
  }));
}
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Swagger Documentation
app.get('/api/docs', (req: any, res: any) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>KOSPI FG Index API Documentation</title>
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
        <style>
          .swagger-ui .topbar { display: none; }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
        <script>
          SwaggerUIBundle({
            url: '/api/docs.json',
            dom_id: '#swagger-ui',
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIBundle.presets.standalone
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            persistAuthorization: true,
            tryItOutEnabled: true,
            filter: true,
            displayRequestDuration: true
          });
        </script>
      </body>
    </html>
  `);
});

// Swagger JSON endpoint
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API 라우트
app.use('/api', apiRoutes);
app.use('/api/fear-greed', fearGreedRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dart', dartRoutes);
app.use('/api/domain', domainRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/telegram', telegramWebhookRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'KOSPI Fear & Greed Index API Server',
    version: '1.0.0',
    documentation: {
      swagger: '/api/docs',
      json: '/api/docs.json'
    },
    endpoints: {
      fearGreedIndex: '/api/fear-greed',
      marketData: '/api/data',
      adminPanel: '/api/admin',
      dartData: '/api/dart',
      domainServices: '/api/domain',
      messaging: '/api/messaging',
      telegramWebhook: '/api/telegram',
      health: '/health'
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// 에러 핸들러
app.use(errorHandler);

// 서버 시작
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📊 환경: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS 허용 도메인: ${process.env.ALLOWED_ORIGINS}`);
  
  // 도메인 서비스 레지스트리 초기화
  if (process.env.NODE_ENV === 'production') {
    ServiceRegistry.initialize()
      .then(() => {
        console.log('📅 도메인 서비스 레지스트리가 초기화되었습니다.');
        console.log('📊 등록된 서비스:', ServiceRegistry.getRegisteredServices());
      })
      .catch((error) => {
        console.error('❌ 도메인 서비스 초기화 실패:', error);
      });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM 신호를 받았습니다. 서버를 종료합니다...');
  
  // 도메인 서비스 종료
  try {
    await ServiceRegistry.shutdown();
    console.log('📅 도메인 서비스가 정상적으로 종료되었습니다.');
  } catch (error) {
    console.error('❌ 도메인 서비스 종료 중 오류:', error);
  }
  
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT 신호를 받았습니다. 서버를 종료합니다...');
  
  // 도메인 서비스 종료
  try {
    await ServiceRegistry.shutdown();
    console.log('📅 도메인 서비스가 정상적으로 종료되었습니다.');
  } catch (error) {
    console.error('❌ 도메인 서비스 종료 중 오류:', error);
  }
  
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

export default app; 