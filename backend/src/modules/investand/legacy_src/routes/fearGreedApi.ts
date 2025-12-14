import express from 'express'
import { DatabaseService } from '@/services/core/databaseService'
import { FearGreedCalculator } from '@/services/core/fearGreedCalculator'
import { KrxCollectionService } from '@/collectors/krxCollectionService'
import { MarketDataRepository } from '@/repositories/market/MarketDataRepository'
import { FearGreedIndexRepository } from '@/repositories/analytics/FearGreedIndexRepository'
import { BOKCollector } from '@/collectors/financial/bokCollector'
import { formatDate } from '@/utils/common/dateUtils'
import { requireAdmin, requirePermission, AuthenticatedRequest } from '@/middleware/authMiddleware'

const router = express.Router()

/**
 * 최신 Fear & Greed Index 조회
 * GET /api/fear-greed/latest
 */
router.get('/fear-greed/latest', async (req, res) => {
  try {
    const latest = await DatabaseService.getLatestFearGreedIndex()
    
    if (!latest) {
      return res.status(404).json({
        success: false,
        message: 'Fear & Greed Index 데이터가 없습니다.'
      })
    }

    // 응답 데이터 구성
    const response = {
      success: true,
      data: {
        date: latest.date.toISOString().split('T')[0],
        value: latest.value,
        level: latest.level,
        components: {
          priceMomentum: latest.priceMomentum,
          investorSentiment: latest.investorSentiment,
          putCallRatio: latest.putCallRatio,
          volatilityIndex: latest.volatilityIndex,
          safeHavenDemand: latest.safeHavenDemand
        },
        updatedAt: latest.updatedAt
      }
    }

    return res.json(response)
  } catch (error) {
    console.error('[API] Fear & Greed Index 조회 실패:', error)
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    })
  }
})

/**
 * Fear & Greed Index 히스토리 조회
 * GET /api/fear-greed/history?days=30
 */
router.get('/fear-greed/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30
    const history = await DatabaseService.getFearGreedIndexHistory(days)

    const response = {
      success: true,
      data: history.map((item: any) => ({
        date: item.date.toISOString().split('T')[0],
        value: item.value,
        level: item.level,
        components: {
          priceMomentum: item.priceMomentum,
          investorSentiment: item.investorSentiment,
          putCallRatio: item.putCallRatio,
          volatilityIndex: item.volatilityIndex,
          safeHavenDemand: item.safeHavenDemand
        }
      }))
    }

    return res.json(response)
  } catch (error) {
    console.error('[API] Fear & Greed Index 히스토리 조회 실패:', error)
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    })
  }
})

/**
 * 최신 KOSPI 데이터 조회
 * GET /api/market/kospi/latest
 */
router.get('/market/kospi/latest', async (req, res) => {
  try {
    const latest = await DatabaseService.getLatestKOSPIData()
    
    if (!latest) {
      return res.status(404).json({
        success: false,
        message: 'KOSPI 데이터가 없습니다.'
      })
    }

    const response = {
      success: true,
      data: {
        date: latest.date.toISOString().split('T')[0],
        change: parseFloat(latest.prdy_vrss.toString()),
        changePercent: parseFloat(latest.prdy_ctrt.toString()),
        volume: latest.acml_vol.toString(),
        updatedAt: latest.updatedAt
      }
    }

    return res.json(response)
  } catch (error) {
    console.error('[API] KOSPI 데이터 조회 실패:', error)
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    })
  }
})

/**
 * 데이터 수집 상태 조회
 * GET /api/system/collection-status?days=7
 */
router.get('/system/collection-status', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7
    const status = await DatabaseService.getDataCollectionStatus(days)

    const response = {
      success: true,
      data: status.map((item: any) => ({
        date: item.date.toISOString().split('T')[0],
        source: item.source,
        dataType: item.dataType,
        status: item.status,
        recordCount: item.recordCount,
        errorMessage: item.errorMessage,
        createdAt: item.createdAt
      }))
    }

    return res.json(response)
  } catch (error) {
    console.error('[API] 데이터 수집 상태 조회 실패:', error)
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    })
  }
})

// NOTE: 수동 데이터 수집 기능은 /api/admin/collect-data 에서 처리됩니다.

/**
 * Fear & Greed Index 수동 계산 (관리자용)
 * POST /api/admin/calculate-index
 * Body: { date: "2024-01-15" }
 */
router.post('/admin/calculate-index', requireAdmin, requirePermission('write'), async (req: AuthenticatedRequest, res) => {
  try {
    const { date } = req.body
    const targetDate = date || formatDate(new Date())

    console.log(`[API] Fear & Greed Index 계산 시작: ${targetDate}`)
    
    const result = await FearGreedCalculator.calculateIndex(targetDate)

    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Fear & Greed Index 계산에 실패했습니다. 데이터가 부족할 수 있습니다.'
      })
    }

    await FearGreedIndexRepository.saveFearGreedIndex(result)

    return res.json({
      success: true,
      message: 'Fear & Greed Index 계산 완료',
      data: {
        date: result.date,
        value: result.value,
        level: result.level,
        confidence: result.confidence,
        components: result.components
      }
    })

  } catch (error) {
    console.error('[API] Fear & Greed Index 계산 실패:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    })
  }
})

/**
 * 시스템 상태 조회
 * GET /api/system/status
 */
router.get('/system/status', async (req, res) => {
  try {
    const [latestIndex, latestKospi, recentLogs] = await Promise.all([
      DatabaseService.getLatestFearGreedIndex(),
      DatabaseService.getLatestKOSPIData(),
      DatabaseService.getDataCollectionStatus(1)
    ])

    const response = {
      success: true,
      data: {
        system: {
          status: 'RUNNING',
          timestamp: new Date().toISOString()
        },
        latestData: {
          fearGreedIndex: latestIndex ? {
            date: latestIndex.date.toISOString().split('T')[0],
            value: latestIndex.value,
            level: latestIndex.level
          } : null,
          kospiIndex: latestKospi ? {
            date: latestKospi.date.toISOString().split('T')[0],
            change: parseFloat(latestKospi.prdy_vrss.toString())
          } : null
        },
        recentCollections: recentLogs.length
      }
    }

    return res.json(response)
  } catch (error) {
    console.error('[API] 시스템 상태 조회 실패:', error)
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    })
  }
})

export default router 