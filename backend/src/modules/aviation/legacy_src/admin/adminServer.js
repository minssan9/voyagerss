const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const cors = require('cors');
const ApplicationFactory = require('../ApplicationFactory');

class AdminServer {
  constructor(database) {
    this.app = express();
    this.port = process.env.ADMIN_PORT || 3011;
    this.database = database;
    // Initialize new architecture
    const applicationFactory = new ApplicationFactory();
    const app = applicationFactory.createApp(database);
    this.topicService = applicationFactory.getContainer().resolve('topicService');
    // Get weather service from the new architecture
    this.weatherImageService = applicationFactory.getContainer().resolve('weatherService');
    // Get scheduler service
    this.scheduler = applicationFactory.getService('schedulingService');
    this.backupDir = path.join(__dirname, '../../data/backups');
    
    this.setupMiddleware();
    this.setupRoutes();
    this.ensureBackupDir();
    this.initializeWeatherService();
  }

  setupMiddleware() {
    // CORS configuration for development
    this.app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));
    
    this.app.use(express.json());
    // Serve frontend build files in production, or allow dev server proxy in development
    if (process.env.NODE_ENV === 'production') {
      this.app.use(express.static(path.join(__dirname, '../../../frontend/dist')));
    }
    
    // Request logging for debugging
    this.app.use((req, res, next) => {
      if (req.url.includes('client') || req.url.includes('main.ts') || 
          req.url.includes('pwa-entry') || req.url.includes('manifest')) {
        console.log(`🔍 Admin request: ${req.method} ${req.url} from ${req.headers['user-agent']?.substring(0, 50)}`);
      }
      next();
    });
    
    // Multer for file uploads
    const upload = multer({ dest: path.join(__dirname, '../../../temp/') });
    this.upload = upload;
  }

  async ensureBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('백업 디렉토리 생성 실패:', error);
    }
  }

  async initializeWeatherService() {
    try {
      await this.weatherImageService.initialize();
      console.log('✅ SimpleWeatherService initialized for admin server');
    } catch (error) {
      console.error('❌ SimpleWeatherService initialization failed:', error);
    }
  }

  setupRoutes() {
    // 메인 어드민 페이지 - serve frontend in production
    if (process.env.NODE_ENV === 'production') {
      this.app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../../../frontend/dist/index.html'));
      });
      // Handle Vue Router history mode - must be after API routes
    }

    // 개발 도구 관련 404 처리
    const devToolsRoutes = ['/client', '/main.ts', '/pwa-entry-point-loaded'];
    devToolsRoutes.forEach(route => {
      this.app.get(route, (req, res) => {
        res.status(404).json({ 
          error: 'Not Found', 
          message: 'This is a static admin page, not a development server',
          route: route 
        });
      });
    });

    // Web App Manifest (optional)
    this.app.get('/manifest.webmanifest', (req, res) => {
      const manifest = {
        name: 'Aviation Bot Admin',
        short_name: 'Aviation Admin',
        description: '항공지식 봇 관리 시스템',
        start_url: '/',
        display: 'standalone',
        theme_color: '#2c5aa0',
        background_color: '#f5f7fa',
        icons: [
          {
            src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiBmaWxsPSIjMmM1YWEwIi8+Cjx0ZXh0IHg9Ijk2IiB5PSIxMTAiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjgwIiBmb250LWZhbWlseT0ic2VyaWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuKciO+4jzwvdGV4dD4KPHN2Zz4K',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      };
      res.json(manifest);
    });

    // 모든 항공지식 데이터 조회 (DB 기반)
    this.app.get('/api/knowledge', async (req, res) => {
      try {
        // DB에서 토픽별로 주제들을 조회하여 기존 형식으로 변환
        const topics = await this.topicService.getAllTopics();
        const knowledgeData = {};
        
        for (const topic of topics) {
          knowledgeData[topic.day_of_month] = {
            topic: topic.name,
            description: topic.description
          };
        }
        
        res.json(knowledgeData);
      } catch (error) {
        console.error('DB 데이터 조회 오류:', error);
        
        // Return static fallback data if DB fails
        console.log('DB failed, using static fallback data...');
        const fallbackData = this._getStaticFallbackData();
        res.json(fallbackData);
      }
    });

    // 특정 요일 데이터 업데이트 (DB 기반)
    this.app.put('/api/knowledge/:day', async (req, res) => {
      try {
        const day = parseInt(req.params.day);
        const { topic, description } = req.body;

        if (day < 0 || day > 6) {
          return res.status(400).json({ error: '잘못된 요일입니다' });
        }

        if (!topic) {
          return res.status(400).json({ error: '토픽명이 필요합니다' });
        }

        // DB에서 해당 요일의 토픽 찾기
        const existingTopic = await this.topicService.getTopicByDayOfMonth(day);
        
        if (!existingTopic) {
          return res.status(404).json({ error: '해당 요일의 토픽을 찾을 수 없습니다' });
        }

        // 토픽 정보 업데이트 (description은 선택값)
        await this.topicService.updateTopic(existingTopic.id, topic, description || '', day);

        res.json({ success: true, message: '데이터가 업데이트되었습니다' });
      } catch (error) {
        console.error('DB 데이터 업데이트 오류:', error);
        
        // DB update failed
        res.status(500).json({ error: '데이터를 업데이트할 수 없습니다' });
      }
    });

    // 백업 생성 (DB + 파일)
    this.app.post('/api/knowledge/backup', async (req, res) => {
      try {
        // DB에서 데이터 백업
        const topics = await this.topicService.getAllTopics();
        const backupData = {};
        
        for (const topic of topics) {
          backupData[topic.day_of_month] = {
            topic: topic.name,
            description: topic.description
          };
        }
        
        // 백업 파일 생성
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `aviation-knowledge-db-${timestamp}.json`;
        const filePath = require('path').join(this.backupDir, filename);
        
        await require('fs').promises.writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf8');
        
        // DB backup created successfully
        
        res.json({ success: true, filename, source: 'database' });
      } catch (error) {
        console.error('DB 백업 생성 오류:', error);
        
        // DB backup failed
        res.status(500).json({ error: '백업을 생성할 수 없습니다' });
      }
    });

    // 백업 복원 (DB 기반)
    this.app.post('/api/knowledge/restore', this.upload.single('backup'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: '백업 파일이 필요합니다' });
        }

        // 백업 파일에서 데이터 읽기
        const backupContent = await fs.readFile(req.file.path, 'utf8');
        const backupData = JSON.parse(backupContent);
        
        // 데이터 유효성 검증
        const validation = this.validateDataStructure(backupData);
        if (!validation.valid) {
          await fs.unlink(req.file.path);
          return res.status(400).json({ 
            error: `유효하지 않은 백업 데이터: ${validation.errors.join(', ')}` 
          });
        }

        // DB로 데이터 복원
        await this.restoreToDatabase(backupData);
        
        // 임시 파일 삭제
        await fs.unlink(req.file.path);
        
        res.json({ success: true, message: '백업이 데이터베이스에 복원되었습니다' });
      } catch (error) {
        console.error('백업 복원 오류:', error);
        
        // 임시 파일 정리
        if (req.file?.path) {
          try {
            await fs.unlink(req.file.path);
          } catch (unlinkError) {
            console.warn('임시 파일 삭제 실패:', unlinkError.message);
          }
        }
        
        res.status(500).json({ error: '백업을 복원할 수 없습니다' });
      }
    });

    // 데이터 검증
    this.app.post('/api/knowledge/validate', async (req, res) => {
      try {
        const validation = await this.validateData();
        res.json(validation);
      } catch (error) {
        console.error('데이터 검증 오류:', error);
        res.status(500).json({ error: '데이터를 검증할 수 없습니다' });
      }
    });

    // === 토픽 관리 API ===
    // 모든 토픽 조회
    this.app.get('/api/topics', async (req, res) => {
      try {
        const topics = await this.topicService.getAllTopics();
        res.json(topics);
      } catch (error) {
        console.error('토픽 조회 오류:', error);
        res.status(500).json({ error: '토픽을 조회할 수 없습니다' });
      }
    });

    // 주간 스케줄 조회
    this.app.get('/api/topics/schedule', async (req, res) => {
      try {
        const schedule = await this.topicService.getWeeklySchedule();
        res.json(schedule);
      } catch (error) {
        console.error('스케줄 조회 오류:', error);
        res.status(500).json({ error: '스케줄을 조회할 수 없습니다' });
      }
    });

    // (removed) 주제 관련 API는 더 이상 제공하지 않습니다

    // 토픽 생성
    this.app.post('/api/topics', async (req, res) => {
      try {
        const { name, description, dayOfWeek } = req.body;
        
        if (!name || dayOfWeek === undefined) {
          return res.status(400).json({ error: '토픽명과 요일은 필수입니다' });
        }

        const id = await this.topicService.createTopic(name, description, dayOfWeek);
        res.json({ success: true, id, message: '토픽이 생성되었습니다' });
      } catch (error) {
        console.error('토픽 생성 오류:', error);
        if (error.code === 'ER_DUP_ENTRY') {
          res.status(400).json({ error: '이미 존재하는 토픽명입니다' });
        } else {
          res.status(500).json({ error: '토픽을 생성할 수 없습니다' });
        }
      }
    });

    // 토픽 업데이트
    this.app.put('/api/topics/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { name, description, dayOfWeek } = req.body;
        
        if (!name || dayOfWeek === undefined) {
          return res.status(400).json({ error: '토픽명과 요일은 필수입니다' });
        }

        await this.topicService.updateTopic(id, name, description, dayOfWeek);
        res.json({ success: true, message: '토픽이 업데이트되었습니다' });
      } catch (error) {
        console.error('토픽 업데이트 오류:', error);
        res.status(500).json({ error: '토픽을 업데이트할 수 없습니다' });
      }
    });

    // (removed) 주제 생성 API는 더 이상 제공하지 않습니다

    // (removed) 주제 업데이트 API는 더 이상 제공하지 않습니다

    // (removed) 주제 삭제 API는 더 이상 제공하지 않습니다

    // (removed) 주제 순서 업데이트 API는 더 이상 제공하지 않습니다

    // (removed) 주제 검색 API는 더 이상 제공하지 않습니다

    // 통계 정보
    this.app.get('/api/topics/stats', async (req, res) => {
      try {
        const stats = await this.topicService.getTopicStats();
        res.json(stats);
      } catch (error) {
        console.error('통계 조회 오류:', error);
        res.status(500).json({ error: '통계를 조회할 수 없습니다' });
      }
    });

    // === KMA 위성사진 수집 API ===
    
    // 위성사진 수집 실행
    this.app.post('/api/weather/collect', async (req, res) => {
      try {
        console.log('📡 위성사진 수집 API 호출');
        const result = await this.weatherImageService.downloadWeatherImage();
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          result: result
        });
      } catch (error) {
        console.error('위성사진 수집 API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 위성사진 직접 수집
    this.app.post('/api/weather/kma/collect', async (req, res) => {
      try {
        console.log('🛰️ 위성사진 직접 수집 API 호출');
        
        const result = await this.weatherImageService.downloadWeatherImage();
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          result: result
        });
      } catch (error) {
        console.error('위성사진 직접 수집 API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 저장된 위성사진 목록 조회
    this.app.get('/api/weather/images', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 20;
        
        // Parse date range parameters (format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
        let startDate = null;
        let endDate = null;
        
        if (req.query.startDate) {
          startDate = new Date(req.query.startDate);
          if (isNaN(startDate.getTime())) {
            return res.status(400).json({
              success: false,
              error: 'Invalid startDate format. Use YYYY-MM-DD or ISO 8601 format.'
            });
          }
          // Set to start of day if only date is provided
          if (!req.query.startDate.includes('T')) {
            startDate.setHours(0, 0, 0, 0);
          }
        }
        
        if (req.query.endDate) {
          endDate = new Date(req.query.endDate);
          if (isNaN(endDate.getTime())) {
            return res.status(400).json({
              success: false,
              error: 'Invalid endDate format. Use YYYY-MM-DD or ISO 8601 format.'
            });
          }
          // Set to end of day if only date is provided
          if (!req.query.endDate.includes('T')) {
            endDate.setHours(23, 59, 59, 999);
          }
        }
        
        // Validate date range
        if (startDate && endDate && startDate > endDate) {
          return res.status(400).json({
            success: false,
            error: 'startDate must be before or equal to endDate'
          });
        }
        
        const images = await this.weatherImageService.getStoredImages(limit, startDate, endDate);
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          count: images.length,
          filters: {
            limit,
            startDate: startDate ? startDate.toISOString() : null,
            endDate: endDate ? endDate.toISOString() : null
          },
          images: images.map(image => ({
            filename: image.filename,
            size: image.size,
            sizeKB: Math.round(image.size / 1024),
            sizeMB: Math.round(image.size / 1024 / 1024 * 10) / 10,
            created: image.created,
            modified: image.modified,
            capturedAt: image.capturedAt ? image.capturedAt.toISOString() : null,
            filepath: image.filepath
          }))
        });
      } catch (error) {
        console.error('이미지 목록 조회 API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 위성사진 서비스 상태 확인
    this.app.get('/api/weather/kma/status', async (req, res) => {
      try {
        const status = await this.weatherImageService.getStatus();
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          status: status.status,
          currentTimestamp: status.currentTimestamp,
          testUrl: status.testUrl,
          error: status.error
        });
      } catch (error) {
        console.error('위성사진 서비스 상태 조회 API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 위성사진 정리 (cleanup)
    this.app.post('/api/weather/cleanup', async (req, res) => {
      try {
        const daysToKeep = parseInt(req.body.daysToKeep) || 7;
        const deletedCount = await this.weatherImageService.cleanup(daysToKeep);
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          deletedCount,
          daysToKeep,
          message: `${deletedCount}개 파일이 삭제되었습니다`
        });
      } catch (error) {
        console.error('이미지 정리 API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Weather gathering enabled status
    this.app.get('/api/weather/gathering/enabled', async (req, res) => {
      try {
        if (!this.scheduler) {
          return res.status(503).json({
            success: false,
            error: 'Scheduler not available'
          });
        }
        
        const enabled = this.scheduler.getWeatherGatheringEnabled();
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          enabled: enabled
        });
      } catch (error) {
        console.error('Weather gathering status API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Set weather gathering enabled status
    this.app.post('/api/weather/gathering/enabled', async (req, res) => {
      try {
        if (!this.scheduler) {
          return res.status(503).json({
            success: false,
            error: 'Scheduler not available'
          });
        }
        
        const { enabled } = req.body;
        
        if (typeof enabled !== 'boolean') {
          return res.status(400).json({
            success: false,
            error: 'enabled must be a boolean value'
          });
        }
        
        this.scheduler.setWeatherGatheringEnabled(enabled);
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          enabled: enabled,
          message: `Weather gathering ${enabled ? 'enabled' : 'disabled'}`
        });
      } catch (error) {
        console.error('Weather gathering toggle API 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 위성사진 이미지 파일 서빙
    this.app.get('/api/weather/image/:filename', async (req, res) => {
      try {
        const filename = req.params.filename;
        // Security: prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          return res.status(400).json({ error: 'Invalid filename' });
        }
        
        const imagePath = path.resolve(this.weatherImageService.baseImageDir, filename);
        
        // Verify the resolved path is still within baseImageDir (security check)
        const baseDir = path.resolve(this.weatherImageService.baseImageDir);
        if (!imagePath.startsWith(baseDir)) {
          return res.status(400).json({ error: 'Invalid file path' });
        }
        
        // Check if file exists
        try {
          await fs.access(imagePath);
        } catch (error) {
          return res.status(404).json({ error: 'Image not found' });
        }
        
        // Send file with appropriate content type
        res.sendFile(imagePath, {
          headers: {
            'Content-Type': 'image/png'
          }
        });
      } catch (error) {
        console.error('이미지 서빙 오류:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Vue Router history mode fallback - must be last
    if (process.env.NODE_ENV === 'production') {
      this.app.get('*', (req, res) => {
        // Only handle non-API routes
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(__dirname, '../../../frontend/dist/index.html'));
        } else {
          res.status(404).json({ error: 'Not Found' });
        }
      });
    }
  }

  // Static fallback data (replaces aviationKnowledge.js file)
  _getStaticFallbackData() {
    return {
      0: { topic: "응급상황 및 안전", subjects: ["Engine Failure 시 Best Glide Speed와 Landing Site 선정", "Spatial Disorientation 예방과 발생 시 대응방법"] },
      1: { topic: "항공역학", subjects: ["Bernoulli's Principle과 실제 양력 생성 원리의 차이점", "Wing Loading이 항공기 성능에 미치는 영향"] },
      2: { topic: "항법", subjects: ["ILS Approach의 구성요소와 Category별 최저기상조건", "GPS WAAS와 기존 GPS의 차이점 및 정밀접근 가능성"] },
      3: { topic: "기상학", subjects: ["Thunderstorm의 생성과정과 3단계 (Cumulus, Mature, Dissipating)", "Wind Shear의 종류와 조종사 대응절차"] },
      4: { topic: "항공기 시스템", subjects: ["Turbocharged vs Supercharged Engine의 차이점과 운용방법", "Electrical System 구성과 Generator/Alternator 고장 시 절차"] },
      5: { topic: "비행 규정", subjects: ["Class A, B, C, D, E Airspace의 입장 요건과 장비 요구사항", "사업용 조종사의 Duty Time과 Rest Requirements"] },
      6: { topic: "비행 계획 및 성능", subjects: ["Weight & Balance 계산과 CG Envelope 내 유지 방법", "Takeoff/Landing Performance Chart 해석과 실제 적용"] }
    };
  }

  async createBackup() {
    // Legacy method - no longer used, DB backup is handled in API endpoint
    throw new Error('File-based backup is deprecated. Use DB-based backup via API.');
  }

  async restoreToDatabase(backupData) {
    try {
      console.log('Restoring data to database...');
      
      // 트랜잭션으로 복원 실행
      const connection = await this.database.pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // 백업 데이터로 복원 (토픽만 반영)
        for (let day = 0; day < 7; day++) {
          const dayData = backupData[day];
          if (!dayData) continue;
          
          // 해당 요일의 토픽 찾기
          const [topicRows] = await connection.execute(
            'SELECT id FROM topics WHERE day_of_month = ? AND is_active = 1',
            [day]
          );
          
          if (topicRows.length === 0) {
            console.warn(`No topic found for day ${day}, skipping...`);
            continue;
          }
          
          const topicId = topicRows[0].id;
          
          // 토픽 정보 업데이트 (이름/설명)
          await connection.execute(
            'UPDATE topics SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [dayData.topic, dayData.description || '', topicId]
          );
        }
        
        await connection.commit();
        console.log('Database restore completed successfully');
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('Database restore failed:', error);
      throw new Error(`데이터베이스 복원 실패: ${error.message}`);
    }
  }

  async validateData() {
    // Validate database data instead
    try {
      const stats = await this.topicService.getStats();
      const errors = [];
      
      if (stats.totalTopics === 0) {
        errors.push('토픽이 없습니다');
      }
      

      
      // Check for all weekdays
      for (let day = 0; day < 7; day++) {
        const topic = await this.topicService.getTopicByDayOfMonth(day);
        if (!topic) {
          errors.push(`${day}요일 토픽이 없습니다`);
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
        stats
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`데이터베이스 검증 실패: ${error.message}`]
      };
    }
  }

  validateDataStructure(data) {
    const errors = [];

    // 기본 구조 검증
    if (typeof data !== 'object' || data === null) {
      errors.push('데이터가 객체가 아닙니다');
      return { valid: false, errors };
    }

    // 요일별 데이터 검증 (0-6)
    for (let day = 0; day < 7; day++) {
      const dayData = data[day];
      
      if (!dayData) {
        errors.push(`${day}요일 데이터가 없습니다`);
        continue;
      }

      if (typeof dayData.topic !== 'string' || dayData.topic.trim() === '') {
        errors.push(`${day}요일 주제가 유효하지 않습니다`);
      }

      if (dayData.description !== undefined && typeof dayData.description !== 'string') {
        errors.push(`${day}요일 설명이 문자열이 아닙니다`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`🌐 어드민 서버가 시작되었습니다: http://localhost:${this.port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('⏹️ 어드민 서버가 중지되었습니다');
    }
  }
}

module.exports = AdminServer;