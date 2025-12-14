import { DartCollectionService } from '@/collectors/dartCollectionService'
import { KrxCollectionService } from '@/collectors/krxCollectionService'
import { FearGreedCalculator } from '@/services/core/fearGreedCalculator'
import { DatabaseService } from '@/services/core/databaseService'
import { logger } from '@/utils/common/logger'
import { formatDate } from '@/utils/common/dateUtils'

/**
 * 통합 데이터 수집 도메인 서비스
 * 모든 데이터 소스의 수집을 통합 관리하는 최상위 서비스
 */
export class DataCollectionService {
  
  // ================================
  // PUBLIC COLLECTION METHODS
  // ================================

  /**
   * 일별 전체 데이터 수집 (DART + KRX + Fear & Greed)
   */
  static async collectDailyData(date: string, options: {
    includeDart?: boolean
    includeKrx?: boolean
    includeFearGreed?: boolean
    saveToDb?: boolean
  } = {}): Promise<{
    dartResult?: any
    krxResult?: any
    fearGreedResult?: any
    summary: {
      totalSuccess: number
      totalFailed: number
      errors: string[]
      processingTime: number
    }
  }> {
    const startTime = Date.now()
    logger.info(`[DataCollection] ${date} 통합 데이터 수집 시작`)

    const results = {
      dartResult: null as any,
      krxResult: null as any,
      fearGreedResult: null as any,
      summary: {
        totalSuccess: 0,
        totalFailed: 0,
        errors: [] as string[],
        processingTime: 0
      }
    }

    const {
      includeDart = true,
      includeKrx = true,
      includeFearGreed = true,
      saveToDb = true
    } = options

    try {
      // 1. DART 데이터 수집
      if (includeDart) {
        try {
          results.dartResult = await DartCollectionService.collectDailyDisclosures(date, saveToDb)
          results.summary.totalSuccess++
          logger.info(`[DataCollection] DART 수집 완료: ${results.dartResult.totalDisclosures}건`)
        } catch (error) {
          results.summary.totalFailed++
          results.summary.errors.push(`DART 수집 실패: ${(error as Error).message}`)
          logger.error('[DataCollection] DART 수집 실패:', error)
        }
      }

      // 2. KRX 데이터 수집
      if (includeKrx) {
        try {
          results.krxResult = await KrxCollectionService.collectDailyMarketData(date, saveToDb)
          results.summary.totalSuccess++
          logger.info(`[DataCollection] KRX 수집 완료: KOSPI(${results.krxResult.kospiSuccess}), KOSDAQ(${results.krxResult.kosdaqSuccess})`)
        } catch (error) {
          results.summary.totalFailed++
          results.summary.errors.push(`KRX 수집 실패: ${(error as Error).message}`)
          logger.error('[DataCollection] KRX 수집 실패:', error)
        }
      }

      // 3. Fear & Greed Index 계산
      if (includeFearGreed) {
        try {
          results.fearGreedResult = await FearGreedCalculator.calculateIndex(date)
          results.summary.totalSuccess++
          logger.info(`[DataCollection] Fear & Greed 계산 완료: ${results.fearGreedResult.value} (${results.fearGreedResult.level})`)
        } catch (error) {
          results.summary.totalFailed++
          results.summary.errors.push(`Fear & Greed 계산 실패: ${(error as Error).message}`)
          logger.error('[DataCollection] Fear & Greed 계산 실패:', error)
        }
      }

      results.summary.processingTime = Date.now() - startTime
      
      logger.info(`[DataCollection] ${date} 통합 수집 완료: 성공 ${results.summary.totalSuccess}개, 실패 ${results.summary.totalFailed}개 (${results.summary.processingTime}ms)`)
      
      return results

    } catch (error) {
      logger.error(`[DataCollection] ${date} 통합 수집 실패:`, error)
      throw error
    }
  }

  /**
   * 특정 데이터 소스만 수집
   */
  static async collectSpecificData(
    source: 'dart' | 'krx' | 'fearGreed',
    date: string,
    options: any = {}
  ): Promise<any> {
    logger.info(`[DataCollection] ${source} 데이터 수집: ${date}`)

    switch (source) {
      case 'dart':
        return await DartCollectionService.collectDailyDisclosures(date, true, options)
      
      case 'krx':
        return await KrxCollectionService.collectDailyMarketData(date, true)
      
      case 'fearGreed':
        return await FearGreedCalculator.calculateIndex(date)
      
      default:
        throw new Error(`지원하지 않는 데이터 소스: ${source}`)
    }
  }

  /**
   * 이력 데이터 일괄 수집
   */
  static async collectHistoricalData(
    startDate: string,
    endDate: string,
    sources: ('dart' | 'krx' | 'fearGreed')[] = ['dart', 'krx', 'fearGreed']
  ): Promise<{
    totalDays: number
    successDays: number
    failedDays: number
    sourceResults: Record<string, any>
  }> {
    logger.info(`[DataCollection] 이력 데이터 수집: ${startDate} ~ ${endDate} (${sources.join(', ')})`)

    const results = {
      totalDays: 0,
      successDays: 0,
      failedDays: 0,
      sourceResults: {} as Record<string, any>
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = formatDate(date)
      
      // 주말 스킵
      if (!this.isBusinessDay(dateStr)) {
        continue
      }

      results.totalDays++

      try {
        const dailyResult = await this.collectDailyData(dateStr, {
          includeDart: sources.includes('dart'),
          includeKrx: sources.includes('krx'),
          includeFearGreed: sources.includes('fearGreed')
        })

        if (dailyResult.summary.totalFailed === 0) {
          results.successDays++
        } else {
          results.failedDays++
        }

        // API 호출 제한을 위한 지연
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        results.failedDays++
        logger.error(`[DataCollection] ${dateStr} 수집 실패:`, error)
      }
    }

    logger.info(`[DataCollection] 이력 수집 완료: ${results.successDays}/${results.totalDays}일 성공`)
    return results
  }

  // ================================
  // HELPER METHODS
  // ================================

  /**
   * 영업일인지 확인
   */
  private static isBusinessDay(date: string): boolean {
    const d = new Date(date)
    const dayOfWeek = d.getDay()
    return dayOfWeek !== 0 && dayOfWeek !== 6
  }

  /**
   * 수집 상태 조회
   */
  static async getCollectionStatus(days: number = 7): Promise<any> {
    return await DatabaseService.getDataCollectionStatus(days)
  }

  /**
   * 수집 환경 검증
   */
  static validateEnvironment(): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    // DART API 키 검증
    if (!process.env.DART_API_KEY) {
      issues.push('DART_API_KEY가 설정되지 않았습니다')
    }

    // KRX API 키 검증
    if (!process.env.KIS_API_KEY || !process.env.KIS_API_SECRET) {
      issues.push('KRX API 키가 설정되지 않았습니다 (KIS_API_KEY, KIS_API_SECRET)')
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }
}
