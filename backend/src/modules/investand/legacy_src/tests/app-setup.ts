// Test app setup - separate from main server
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// Create test app
const app = express();

// Basic middleware for testing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock routes for testing (simplified versions)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mock Fear & Greed routes
app.get('/api/fear-greed/latest', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      value: 42,
      level: 'Fear',
      date: '2024-01-15',
      components: {
        priceMomentum: 40,
        investorSentiment: 35,
        putCallRatio: 50,
        volatilityIndex: 45,
        safeHavenDemand: 48
      },
      confidence: 85,
      updatedAt: '2024-01-15T09:00:00Z'
    }
  });
});

app.get('/api/fear-greed/history', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const data = [];
  
  for (let i = 0; i < Math.min(days, 10); i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 40) + 30,
      level: 'Fear',
      components: {
        priceMomentum: Math.floor(Math.random() * 30) + 25,
        investorSentiment: Math.floor(Math.random() * 30) + 25,
        putCallRatio: Math.floor(Math.random() * 30) + 40,
        volatilityIndex: Math.floor(Math.random() * 30) + 35,
        safeHavenDemand: Math.floor(Math.random() * 30) + 40
      }
    });
  }
  
  res.json({ success: true, data });
});

app.get('/api/fear-greed/date/:date', (req: Request, res: Response) => {
  const { date } = req.params;
  
  // Validate date format
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date format. Expected YYYY-MM-DD'
    });
  }
  
  return res.json({
    success: true,
    data: {
      date,
      value: 42,
      level: 'Fear'
    }
  });
});

// Mock Market Data routes
app.get('/api/market/kospi/latest', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      date: '2024-01-15',
      change: -12.45,
      changePercent: -0.50,
      volume: '450000000',
      updatedAt: '2024-01-15T15:30:00Z'
    }
  });
});

// Mock System routes
app.get('/api/system/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      system: {
        status: 'HEALTHY',
        timestamp: '2024-01-15T12:00:00Z'
      },
      latestData: {
        fearGreedIndex: {
          date: '2024-01-15',
          value: 42,
          level: 'Fear'
        },
        kospiIndex: {
          date: '2024-01-15',
          change: -12.45
        }
      },
      recentCollections: 5
    }
  });
});

app.get('/api/system/collection-status', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  const data = [
    {
      date: '2024-01-15',
      source: 'KRX',
      dataType: 'KOSPI',
      status: 'SUCCESS',
      recordCount: 1,
      errorMessage: null,
      createdAt: '2024-01-15T09:00:00Z'
    }
  ];
  
  res.json({ success: true, data });
});

// Mock Admin routes
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '사용자명과 비밀번호를 입력해주세요.',
      code: 'MISSING_CREDENTIALS'
    });
  }
  
  return res.json({
    success: true,
    message: '로그인 성공',
    data: {
      token: 'mock-jwt-token',
      user: {
        id: '1',
        username: 'admin',
        role: 'admin',
        permissions: ['read', 'write']
      }
    }
  });
});

app.get('/api/admin/system-health', (req: Request, res: Response) => {
  // Require authentication header
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '인증이 필요합니다.'
    });
  }
  
  return res.json({
    success: true,
    data: {
      database: {
        status: 'HEALTHY',
        responseTime: 25,
        connections: 15
      },
      api: {
        status: 'HEALTHY',
        responseTime: 12,
        uptime: '1d 5h 30m'
      }
    }
  });
});

// Error handling
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.path}`
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

export default app;