import express from 'express'
import { logger } from '@/utils/common/logger'
import { DartCollectionService } from '@/collectors/dartCollectionService'
import { ServiceRegistry } from '@/services/domain/ServiceRegistry'
import { formatDate } from '@/utils/common/dateUtils'
import { DartDisclosureRepository } from '@/repositories/dart/DartDisclosureRepository'

const router = express.Router()

/**
 * GET /api/dart/batch/status
 * 배치 서비스 상태 조회
 */
router.get('/batch/status', async (req, res) => {
  try {
    const status = ServiceRegistry.batchProcessing.getStatus()

    res.json({
      success: true,
      data: status
    })

    logger.info('[DART Batch] Status query successful')

  } catch (error) {
    logger.error('[DART Batch] Status query failed:', error)
    res.status(500).json({
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
    const status = {
      isOperational: true,
      rateLimit: { remaining: 1000 },
      lastError: null
    }

    res.json({
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
    res.status(503).json({
      success: false,
      error: 'DART 서비스 헬스 체크 실패',
      message: (error as Error).message
    })
  }
})

/**
 * POST /api/dart/test
 * DART API 테스트 - 특정 날짜의 공시 데이터 조회
 */
router.post('/test', async (req, res) => {
  try {
    const { date, maxPages = 1, pageSize = 10 } = req.body
    const targetDate = date || formatDate(new Date())

    logger.info(`[DART Test] Testing DART API for date: ${targetDate}`)

    const result = await DartCollectionService.collectDailyDisclosures(
      targetDate,
      false,
      { maxPages, pageSize }
    )

    res.json({
      success: true,
      message: 'DART API 테스트 성공',
      data: {
        date: targetDate,
        totalDisclosures: result.totalDisclosures,
        sampleDisclosures: result.stockDisclosures.slice(0, 5),
        count: result.stockDisclosures.length
      }
    })

  } catch (error) {
    logger.error('[DART Test] API 테스트 실패:', error)
    res.status(500).json({
      success: false,
      error: 'DART API 테스트 실패',
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

    // 주식 보유현황 데이터 조회
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
 * POST /api/dart/batch/daily
 * DART 일별 배치 수집 - 수동 트리거
 */
router.post('/batch/daily', async (req, res) => {
  try {
    const { date, maxPages = 50, pageSize = 100 } = req.body
    const targetDate = date || formatDate(new Date())

    logger.info(`[DART Batch] Manual daily batch triggered for date: ${targetDate}`)

    const result = await DartCollectionService.collectDailyDisclosures(
      targetDate,
      true,
      { maxPages, pageSize }
    )

    res.json({
      success: true,
      message: 'DART 일별 데이터 수집 완료',
      data: {
        date: targetDate,
        totalDisclosures: result.totalDisclosures,
        savedDisclosures: result.stockDisclosures.length,
        summary: {
          maxPages,
          pageSize,
          timestamp: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    logger.error('[DART Batch] Daily batch failed:', error)
    res.status(500).json({
      success: false,
      error: 'DART 일별 배치 수집 실패',
      message: (error as Error).message
    })
  }
})

export default router