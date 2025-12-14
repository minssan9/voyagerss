import express from 'express';
import { ServiceRegistry } from '@/services/domain/ServiceRegistry';
import { logger } from '@/utils/common/logger';

const router = express.Router();

// ================================
// DATA COLLECTION ENDPOINTS
// ================================

/**
 * 일별 통합 데이터 수집
 */
router.post('/collect/daily', async (req, res) => {
  try {
    const { date, options = {} } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: '날짜가 필요합니다 (YYYY-MM-DD 형식)'
      });
    }

    const result = await ServiceRegistry.dataCollection.collectDailyData(date, options);
    
    return res.json({
      success: true,
      message: '일별 데이터 수집 완료',
      data: result
    });

  } catch (error) {
    logger.error('[DomainAPI] 일별 데이터 수집 실패:', error);
    return res.status(500).json({
      success: false,
      message: '데이터 수집 실패',
      error: (error as Error).message
    });
  }
});

/**
 * 특정 데이터 소스 수집
 */
router.post('/collect/specific', async (req, res) => {
  try {
    const { source, date, options = {} } = req.body;
    
    if (!source || !date) {
      return res.status(400).json({
        success: false,
        message: '데이터 소스와 날짜가 필요합니다'
      });
    }

    const result = await ServiceRegistry.dataCollection.collectSpecificData(source, date, options);
    
    return res.json({
      success: true,
      message: `${source} 데이터 수집 완료`,
      data: result
    });

  } catch (error) {
    logger.error('[DomainAPI] 특정 데이터 수집 실패:', error);
    return res.status(500).json({
      success: false,
      message: '데이터 수집 실패',
      error: (error as Error).message
    });
  }
});

/**
 * 이력 데이터 수집
 */
router.post('/collect/historical', async (req, res) => {
  try {
    const { startDate, endDate, sources = ['dart', 'krx', 'fearGreed'] } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '시작일과 종료일이 필요합니다'
      });
    }

    const result = await ServiceRegistry.dataCollection.collectHistoricalData(
      startDate,
      endDate,
      sources
    );
    
    return res.json({
      success: true,
      message: '이력 데이터 수집 완료',
      data: result
    });

  } catch (error) {
    logger.error('[DomainAPI] 이력 데이터 수집 실패:', error);
    return res.status(500).json({
      success: false,
      message: '이력 데이터 수집 실패',
      error: (error as Error).message
    });
  }
});

// ================================
// BATCH PROCESSING ENDPOINTS
// ================================

/**
 * 일별 배치 작업 스케줄링
 */
router.post('/batch/schedule-daily', async (req, res) => {
  try {
    const { date, options = {} } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: '날짜가 필요합니다'
      });
    }

    const jobId = await ServiceRegistry.batchProcessing.scheduleDailyCollection(date, options);
    
    return res.json({
      success: true,
      message: '일별 배치 작업이 스케줄되었습니다',
      data: { jobId }
    });

  } catch (error) {
    logger.error('[DomainAPI] 일별 배치 스케줄링 실패:', error);
    return res.status(500).json({
      success: false,
      message: '배치 스케줄링 실패',
      error: (error as Error).message
    });
  }
});

/**
 * 이력 배치 작업 스케줄링
 */
router.post('/batch/schedule-historical', async (req, res) => {
  try {
    const { startDate, endDate, sources = ['dart', 'krx', 'fearGreed'] } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '시작일과 종료일이 필요합니다'
      });
    }

    const jobId = await ServiceRegistry.batchProcessing.scheduleHistoricalCollection(
      startDate,
      endDate,
      sources
    );
    
    return res.json({
      success: true,
      message: '이력 배치 작업이 스케줄되었습니다',
      data: { jobId }
    });

  } catch (error) {
    logger.error('[DomainAPI] 이력 배치 스케줄링 실패:', error);
    return res.status(500).json({
      success: false,
      message: '배치 스케줄링 실패',
      error: (error as Error).message
    });
  }
});

/**
 * 주간 리포트 생성
 */
router.post('/batch/weekly-report', async (req, res) => {
  try {
    const jobId = await ServiceRegistry.batchProcessing.scheduleWeeklyReport();
    
    return res.json({
      success: true,
      message: '주간 리포트 생성 작업이 스케줄되었습니다',
      data: { jobId }
    });

  } catch (error) {
    logger.error('[DomainAPI] 주간 리포트 생성 실패:', error);
    return res.status(500).json({
      success: false,
      message: '주간 리포트 생성 실패',
      error: (error as Error).message
    });
  }
});

// ================================
// MARKET ANALYSIS ENDPOINTS
// ================================

/**
 * 현재 시장 분석
 */
router.get('/analysis/current', async (req, res) => {
  try {
    const analysis = await ServiceRegistry.marketAnalysis.getCurrentMarketAnalysis();
    
    return res.json({
      success: true,
      message: '현재 시장 분석 완료',
      data: analysis
    });

  } catch (error) {
    logger.error('[DomainAPI] 현재 시장 분석 실패:', error);
    return res.status(500).json({
      success: false,
      message: '시장 분석 실패',
      error: (error as Error).message
    });
  }
});

/**
 * 기간별 시장 분석
 */
router.get('/analysis/period', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '시작일과 종료일이 필요합니다'
      });
    }

    const analysis = await ServiceRegistry.marketAnalysis.getPeriodMarketAnalysis(
      startDate as string,
      endDate as string
    );
    
    return res.json({
      success: true,
      message: '기간별 시장 분석 완료',
      data: analysis
    });

  } catch (error) {
    logger.error('[DomainAPI] 기간별 시장 분석 실패:', error);
    return res.status(500).json({
      success: false,
      message: '시장 분석 실패',
      error: (error as Error).message
    });
  }
});

/**
 * 투자 인사이트 생성
 */
router.get('/analysis/insights', async (req, res) => {
  try {
    const insights = await ServiceRegistry.marketAnalysis.generateInvestmentInsights();
    
    return res.json({
      success: true,
      message: '투자 인사이트 생성 완료',
      data: insights
    });

  } catch (error) {
    logger.error('[DomainAPI] 투자 인사이트 생성 실패:', error);
    return res.status(500).json({
      success: false,
      message: '투자 인사이트 생성 실패',
      error: (error as Error).message
    });
  }
});

// ================================
// SYSTEM STATUS ENDPOINTS
// ================================

/**
 * 서비스 레지스트리 상태 조회
 */
router.get('/status', (req, res) => {
  try {
    const status = ServiceRegistry.getStatus();
    
    return res.json({
      success: true,
      message: '서비스 상태 조회 완료',
      data: status
    });

  } catch (error) {
    logger.error('[DomainAPI] 서비스 상태 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '서비스 상태 조회 실패',
      error: (error as Error).message
    });
  }
});

/**
 * 데이터 수집 환경 검증
 */
router.get('/validate', (req, res) => {
  try {
    const validation = ServiceRegistry.dataCollection.validateEnvironment();
    
    return res.json({
      success: true,
      message: '환경 검증 완료',
      data: validation
    });

  } catch (error) {
    logger.error('[DomainAPI] 환경 검증 실패:', error);
    return res.status(500).json({
      success: false,
      message: '환경 검증 실패',
      error: (error as Error).message
    });
  }
});

/**
 * 수집 상태 조회
 */
router.get('/collection-status', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const status = await ServiceRegistry.dataCollection.getCollectionStatus(Number(days));
    
    return res.json({
      success: true,
      message: '수집 상태 조회 완료',
      data: status
    });

  } catch (error) {
    logger.error('[DomainAPI] 수집 상태 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '수집 상태 조회 실패',
      error: (error as Error).message
    });
  }
});

export default router;
