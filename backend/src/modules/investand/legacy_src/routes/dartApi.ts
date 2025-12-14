import express from 'express'
import { DartCollectionService } from '@/collectors/dartCollectionService'
import { DartApiClient } from '@/clients/dart/DartApiClient'
import { ServiceRegistry } from '@/services/domain/ServiceRegistry'
import adminAuth from '@/middleware/authMiddleware'
import { logger } from '@/utils/common/logger'

const router = express.Router()

/**
 * DART API 라우터
 * 공시 데이터 조회, 배치 작업 관리, 통계 조회 등
 */

// Rate limiting 적용 (DART API는 외부 API 호출이므로 제한)
router.use('/batch', (req, res, next) => {
  // Rate limiting logic would be implemented here
  next()
})
router.use('/disclosures', (req, res, next) => {
  // Rate limiting logic would be implemented here  
  next()
})

/**
 * GET /api/dart/disclosures
 * 공시 데이터 조회
 */
router.get('/disclosures', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      corpCode,
      reportCode,
      sentimentOnly,
      page = 1,
      limit = 50
    } = req.query

    // 파라미터 검증
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate와 endDate는 필수 파라미터입니다.',
        example: '?startDate=2024-01-01&endDate=2024-01-31'
      })
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate as string) || !dateRegex.test(endDate as string)) {
      return res.status(400).json({
        error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)',
        startDate,
        endDate
      })
    }

    // 지분공시(D) 데이터만 수집 - 기업별 필터링 제거됨
    const result = await DartCollectionService.collectDailyDisclosures(
      startDate as string,
      false, // saveToDb = false
      {
        maxPages: 10,
        pageSize: parseInt(limit as string) || 50
      }
    )
    
    const disclosures = result.stockDisclosures

    // 기업별 필터링 (corpCode가 제공된 경우)
    const filteredByCorpCode = corpCode 
      ? disclosures.filter(d => d.corpCode === corpCode)
      : disclosures

    // 감정 분석 필터링은 제거됨 (D 타입 전용 단순화)
    const filteredDisclosures = filteredByCorpCode

    return res.json({
      success: true,
      data: {
        disclosures: filteredDisclosures,
        total: filteredDisclosures.length,
        params: {
          startDate,
          endDate,
          corpCode: corpCode || null,
          reportCode: reportCode || null,
          sentimentOnly: sentimentOnly === 'true',
          page: parseInt(page as string),
          limit: Math.min(parseInt(limit as string), 100)
        }
      }
    })

    logger.info(`[DART API] 공시 조회: ${startDate} ~ ${endDate}, ${filteredDisclosures.length}건`)

  } catch (error) {
    logger.error('[DART API] 공시 조회 실패:', error)
    return res.status(500).json({
      error: '공시 데이터 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/stock-holdings
 * 주식 보유현황 데이터 조회
 */
router.get('/stock-holdings', async (req, res) => {
  try {
    const {
      corpCode,
      corpName,
      startDate,
      endDate,
      reporterName,
      changeReason,
      reportReason,
      page = 1,
      limit = 50
    } = req.query

    // 파라미터 검증
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate와 endDate는 필수 파라미터입니다.',
        example: '?startDate=2024-01-01&endDate=2024-01-31&corpCode=00126380'
      })
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate as string) || !dateRegex.test(endDate as string)) {
      return res.status(400).json({
        error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)',
        startDate,
        endDate
      })
    }

    // DartDisclosureRepository를 사용하여 주식 보유현황 데이터 조회
    const { DartDisclosureRepository } = await import('@/repositories/dart/DartDisclosureRepository')
    
    const holdings = await DartDisclosureRepository.getStockHoldings({
      corpCode: corpCode as string,
      corpName: corpName as string,
      startDate: startDate as string,
      endDate: endDate as string,
      reporterName: reporterName as string,
      changeReason: changeReason as string,
      reportReason: reportReason as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    })

    // 전체 카운트 조회 (필터링된 결과의 실제 개수)
    const totalCount = await DartDisclosureRepository.getStockHoldingsCount({
      corpCode: corpCode as string,
      corpName: corpName as string,
      startDate: startDate as string,
      endDate: endDate as string,
      reporterName: reporterName as string,
      changeReason: changeReason as string,
      reportReason: reportReason as string
    })

    return res.json({
      success: true,
      data: {
        holdings,
        total: totalCount,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string)),
        params: {
          corpCode: corpCode || null,
          corpName: corpName || null,
          startDate,
          endDate,
          reporterName: reporterName || null,
          changeReason: changeReason || null,
          reportReason: reportReason || null,
          page: parseInt(page as string),
          limit: Math.min(parseInt(limit as string), 100)
        }
      }
    })

    logger.info(`[DART API] 주식 보유현황 조회: ${startDate} ~ ${endDate}, ${holdings.length}건`)

  } catch (error) {
    logger.error('[DART API] 주식 보유현황 조회 실패:', error)
    return res.status(500).json({
      error: '주식 보유현황 데이터 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/companies
 * 기업 정보 조회
 */
router.get('/companies', async (req, res) => {
  try {
    const { corpCode } = req.query

    if (!corpCode) {
      return res.status(400).json({
        error: 'corpCode는 필수 파라미터입니다.',
        example: '?corpCode=00126380'
      })
    }

    // fetchCompanyInfo method removed - only D-type collection supported
    return res.status(501).json({
      error: '기업 정보 조회는 지분공시(D) 전용 시스템에서 지원되지 않습니다.',
      suggestion: '지분공시 데이터만 조회 가능합니다.'
    })
  } catch (error) {
    logger.error('[DART API] 기업 정보 조회 실패:', error)
    return res.status(500).json({
      error: '기업 정보 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/financial
 * 재무 정보 조회
 */
router.get('/financial', async (req, res) => {
  try {
    const { corpCode, businessYear, reportCode = '11011', fsDiv = 'OFS' } = req.query

    if (!corpCode || !businessYear) {
      return res.status(400).json({
        error: 'corpCode와 businessYear는 필수 파라미터입니다.',
        example: '?corpCode=00126380&businessYear=2023&fsDiv=OFS',
        parameters: {
          corpCode: '기업 고유번호 (필수)',
          businessYear: '사업연도 (필수)',
          reportCode: '보고서 코드 (기본값: 11011)',
          fsDiv: '재무제표구분 (기본값: OFS) - OFS=재무상태표, PLS=손익계산서, CFS=현금흐름표'
        }
      })
    }

    // fetchFinancialInfo method removed - only D-type collection supported
    return res.status(501).json({
      error: '재무 정보 조회는 지분공시(D) 전용 시스템에서 지원되지 않습니다.',
      suggestion: '지분공시 데이터만 조회 가능합니다.'
    })
  } catch (error) {
    logger.error('[DART API] 재무 정보 조회 실패:', error)
    return res.status(500).json({
      error: '재무 정보 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/kospi200
 * KOSPI 200 구성 종목 리스트
 */
router.get('/kospi200', async (req, res) => {
  try {
    // TODO: Implement getKOSPI200CorpCodes in DartCollectionService  
    const corpCodes: string[] = [] // Placeholder until implemented

    return res.json({
      success: true,
      data: {
        corpCodes,
        count: corpCodes.length,
        description: 'KOSPI 200 구성 종목의 DART 고유번호 목록'
      }
    })

    logger.info(`[DART API] KOSPI 200 조회: ${corpCodes.length}개 종목`)

  } catch (error) {
    logger.error('[DART API] KOSPI 200 조회 실패:', error)
    return res.status(500).json({
      error: 'KOSPI 200 목록 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

// ============ 관리자 전용 배치 관리 API ============

/**
 * POST /api/dart/batch/daily
 * 일별 공시 데이터 배치 수집 예약 (관리자 전용)
 */
router.post('/batch/daily', adminAuth.requireAdmin, async (req, res) => {
  try {
    const { date, options } = req.body

    if (!date) {
      return res.status(400).json({
        error: 'date는 필수 파라미터입니다.',
        example: { date: '2024-01-15', options: {} }
      })
    }

    const jobId = await ServiceRegistry.batchProcessing.scheduleDailyCollection(date, {
      includeDart: true,
      includeKrx: false,
      includeFearGreed: false
    })

    return res.json({
      success: true,
      data: {
        jobId,
        message: `${date} 일별 공시 배치 수집이 예약되었습니다.`
      }
    })

    logger.info(`[DART Batch] 일별 배치 예약: ${date} (Job ID: ${jobId})`)

  } catch (error) {
    logger.error('[DART Batch] 일별 배치 예약 실패:', error)
    return res.status(500).json({
      error: '배치 작업 예약 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * POST /api/dart/batch/financial
 * 재무 데이터 배치 수집 예약 (관리자 전용)
 */
router.post('/batch/financial', adminAuth.requireAdmin, async (req, res) => {
  try {
    const { businessYear } = req.body

    if (!businessYear) {
      return res.status(400).json({
        error: 'businessYear는 필수 파라미터입니다.',
        example: { businessYear: '2023' }
      })
    }

    const jobId = await ServiceRegistry.batchProcessing.scheduleHistoricalCollection(
      `${businessYear}-01-01`,
      `${businessYear}-12-31`,
      ['dart']
    )

    return res.json({
      success: true,
      data: {
        jobId,
        message: `${businessYear}년 재무 데이터 배치 수집이 예약되었습니다.`
      }
    })

    logger.info(`[DART Batch] 재무 배치 예약: ${businessYear} (Job ID: ${jobId})`)

  } catch (error) {
    logger.error('[DART Batch] 재무 배치 예약 실패:', error)
    return res.status(500).json({
      error: '배치 작업 예약 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/batch/status
 * 배치 서비스 상태 조회 (관리자 전용)
 */
router.get('/batch/status', adminAuth.requireAdmin, async (req, res) => {
  try {
    const status = ServiceRegistry.batchProcessing.getStatus()

    return res.json({
      success: true,
      data: status
    })

  } catch (error) {
    logger.error('[DART Batch] 상태 조회 실패:', error)
    return res.status(500).json({
      error: '배치 서비스 상태 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/health
 * DART API 헬스 체크
 */
router.get('/health', async (req, res) => {
  try {
    // TODO: Implement checkBatchStatus in DartCollectionService
    const status = { isOperational: true, rateLimit: { remaining: 1000 }, lastError: null } // Placeholder

    return res.json({
      success: true,
      data: {
        isOperational: status.isOperational,
        rateLimit: status.rateLimit,
        timestamp: new Date().toISOString(),
        lastError: status.lastError || null
      }
    })

  } catch (error) {
    logger.error('[DART Health] 헬스 체크 실패:', error)
    return res.status(503).json({
      success: false,
      error: 'DART 서비스 헬스 체크 실패',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/stats
 * DART 수집 통계 조회
 */
router.get('/stats', async (req, res) => {
  try {
    const { date } = req.query
    const targetDate = date as string || new Date().toISOString().split('T')[0]

    // 실제로는 데이터베이스에서 통계 조회
    // 여기서는 mock 데이터 반환
    const stats = {
      date: targetDate,
      totalDisclosures: 0,
      sentimentRelevant: 0,
      apiCalls: 0,
      successRate: 100.0,
      averageResponseTime: 0
    }

    return res.json({
      success: true,
      data: stats
    })

  } catch (error) {
    logger.error('[DART Stats] 통계 조회 실패:', error)
    return res.status(500).json({
      error: '통계 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * POST /api/dart/test
 * DART 수집기 테스트 (개발/테스트 환경 전용)
 */
router.post('/test', async (req, res) => {
  // 프로덕션 환경에서는 접근 차단
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: '프로덕션 환경에서는 테스트 API를 사용할 수 없습니다.'
    })
  }

  try {
    const { testType = 'basic', date } = req.body
    const testDate = date || DartCollectionService.getLastBusinessDay(1)

    let result: any

    switch (testType) {
      case 'disclosures':
        result = await DartCollectionService.collectDailyDisclosures(testDate, false)
        break
      case 'kospi200':
        result = { message: 'KOSPI200 조회는 지분공시(D) 전용 시스템에서 지원되지 않습니다.' }
        break
      case 'filter':
        result = { message: '감정 분석 필터링은 지분공시(D) 전용 시스템에서 제거되었습니다.' }
        break
      default:
        result = { isOperational: true, message: '지분공시(D) 전용 시스템 정상 작동' }
    }

    return res.json({
      success: true,
      testType,
      testDate,
      data: result
    })

    logger.info(`[DART Test] 테스트 실행: ${testType}`)

  } catch (error) {
    logger.error('[DART Test] 테스트 실패:', error)
    return res.status(500).json({
      error: '테스트 실행 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

export default router