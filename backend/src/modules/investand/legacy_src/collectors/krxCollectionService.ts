import { KrxApiClient } from '@/clients/krx/KrxApiClient'
import { MarketDataRepository } from '@/repositories/market/MarketDataRepository'
import type { krxStockData, InvestorTradingData } from '@/types/collectors/krxTypes'
import { logger } from '@/utils/common/logger'
import { formatDate } from '@/utils/common/dateUtils'

/**
 * KRX 데이터 수집 서비스
 * API 클라이언트와 리포지토리를 조합한 비즈니스 로직 처리
 */
export class KrxCollectionService {

  // ================================
  // PUBLIC COLLECTION METHODS
  // ================================

  /**
   * 일별 전체 KRX 데이터 수집 및 저장
   */
  static async collectDailyMarketData(date: string, saveToDb: boolean = true): Promise<{
    kospiSuccess: boolean
    kosdaqSuccess: boolean
    investorDataSuccess: boolean
    summary: {
      totalAttempts: number
      totalSuccesses: number
      errors: string[]
    }
  }> {
    logger.info(`[KRX Collection] ${date} 일별 시장데이터 수집 시작`)

    // API 키 검증
    if (!KrxApiClient.validateApiKeys()) {
      throw new Error('KRX API 키가 설정되지 않았습니다')
    }

    // 날짜 형식 검증
    if (!KrxApiClient.validateDateFormat(date)) {
      throw new Error('날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)')
    }

    const results = {
      kospiSuccess: false,
      kosdaqSuccess: false,
      investorDataSuccess: false,
      summary: {
        totalAttempts: 0,
        totalSuccesses: 0,
        errors: [] as string[]
      }
    }

    try {
      // 1. 모든 시장데이터 수집
      const marketData = await this.fetchAllMarketData(date)
      
      // 2. 데이터베이스 저장
      if (saveToDb) {
        const saveResults = await this.saveAllMarketData(marketData)
        results.kospiSuccess = saveResults.kospiSuccess
        results.kosdaqSuccess = saveResults.kosdaqSuccess
        results.investorDataSuccess = saveResults.investorDataSuccess
        results.summary = saveResults.summary
      } else {
        // 저장하지 않는 경우 수집 성공 여부만 체크
        results.kospiSuccess = !!marketData.kospiData
        results.kosdaqSuccess = !!marketData.kosdaqData
        results.investorDataSuccess = !!(marketData.kospiInvestorTrading || marketData.kosdaqInvestorTrading)
      }

      logger.info(`[KRX Collection] ${date} 수집 완료: KOSPI(${results.kospiSuccess}), KOSDAQ(${results.kosdaqSuccess})`)
      return results

    } catch (error) {
      logger.error(`[KRX Collection] ${date} 수집 실패:`, error)
      throw error
    }
  }

  /**
   * 특정 시장의 데이터만 수집
   */
  static async collectMarketSpecificData(
    date: string,
    market: 'KOSPI' | 'KOSDAQ',
    includeInvestorData: boolean = true
  ): Promise<{
    stockData: krxStockData | null
    investorData: InvestorTradingData | null
  }> {
    logger.info(`[KRX Collection] ${market} 시장데이터 수집: ${date}`)

    try {
      const promises: Promise<any>[] = [
        KrxApiClient.fetchStockData(date, market)
      ]

      if (includeInvestorData) {
        promises.push(KrxApiClient.fetchInvestorTradingData(date, market))
      }

      const results = await Promise.allSettled(promises)
      
      const stockData = results[0]?.status === 'fulfilled' ? results[0].value : null
      const investorData = includeInvestorData && results[1]?.status === 'fulfilled' 
        ? results[1].value : null

      logger.info(`[KRX Collection] ${market} 수집 완료: 주식데이터(${!!stockData}), 투자자데이터(${!!investorData})`)
      
      return { stockData, investorData }

    } catch (error) {
      logger.error(`[KRX Collection] ${market} 수집 실패:`, error)
      throw error
    }
  }

  /**
   * 이력 데이터 일괄 수집 (날짜 범위)
   */
  static async collectHistoricalData(
    startDate: string,
    endDate: string,
    skipWeekends: boolean = true
  ): Promise<{
    totalDays: number
    successDays: number
    failedDays: number
    details: Array<{
      date: string
      success: boolean
      error?: string
    }>
  }> {
    logger.info(`[KRX Collection] 이력 데이터 수집: ${startDate} ~ ${endDate}`)

    const results = {
      totalDays: 0,
      successDays: 0,
      failedDays: 0,
      details: [] as Array<{ date: string; success: boolean; error?: string }>
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = formatDate(date)

      // 주말 스킵 옵션
      if (skipWeekends && !this.isBusinessDay(dateStr)) {
        continue
      }

      results.totalDays++

      try {
        await this.collectDailyMarketData(dateStr, true)
        results.successDays++
        results.details.push({ date: dateStr, success: true })
        
        // API 호출 제한을 위한 지연
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        results.failedDays++
        results.details.push({
          date: dateStr,
          success: false,
          error: (error as Error).message
        })
      }
    }

    logger.info(`[KRX Collection] 이력 수집 완료: ${results.successDays}/${results.totalDays}일 성공`)
    return results
  }

  // ================================
  // PRIVATE BUSINESS LOGIC METHODS
  // ================================

  /**
   * 모든 시장데이터 수집
   */
  private static async fetchAllMarketData(date: string) {
    return KrxApiClient.fetchAllMarketData(date)
  }

  /**
   * 수집된 모든 시장데이터 저장
   */
  private static async saveAllMarketData(marketData: {
    kospiData: krxStockData | null
    kosdaqData: krxStockData | null
    kospiInvestorTrading: InvestorTradingData | null
    kosdaqInvestorTrading: InvestorTradingData | null
  }) {
    const results = {
      kospiSuccess: false,
      kosdaqSuccess: false,
      investorDataSuccess: false,
      summary: {
        totalAttempts: 0,
        totalSuccesses: 0,
        errors: [] as string[]
      }
    }

    // KOSPI/KOSDAQ 주식 데이터 저장
    if (marketData.kospiData || marketData.kosdaqData) {
      try {
        const batchResult = await MarketDataRepository.saveStockDataBatch(
          marketData.kospiData ? [marketData.kospiData] : [],
          marketData.kosdaqData ? [marketData.kosdaqData] : []
        )
        
        results.kospiSuccess = marketData.kospiData ? batchResult.kospiSuccess > 0 : true
        results.kosdaqSuccess = marketData.kosdaqData ? batchResult.kosdaqSuccess > 0 : true
        results.summary.totalAttempts += 2
        results.summary.totalSuccesses += batchResult.kospiSuccess + batchResult.kosdaqSuccess
        
        if (batchResult.totalErrors > 0) {
          results.summary.errors.push(`주식데이터 저장 오류: ${batchResult.totalErrors}건`)
        }
      } catch (error) {
        results.summary.errors.push(`주식데이터 배치 저장 실패: ${(error as Error).message}`)
      }
    }

    // 투자자 거래 데이터 저장
    const investorPromises: Promise<void>[] = []
    
    if (marketData.kospiInvestorTrading) {
      investorPromises.push(
        MarketDataRepository.saveInvestorTradingData(marketData.kospiInvestorTrading)
          .then(() => { results.investorDataSuccess = true })
          .catch(error => {
            results.summary.errors.push(`KOSPI 투자자데이터 저장 실패: ${error.message}`)
          })
      )
    }

    if (marketData.kosdaqInvestorTrading) {
      investorPromises.push(
        MarketDataRepository.saveInvestorTradingData(marketData.kosdaqInvestorTrading)
          .then(() => { results.investorDataSuccess = true })
          .catch(error => {
            results.summary.errors.push(`KOSDAQ 투자자데이터 저장 실패: ${error.message}`)
          })
      )
    }

    if (investorPromises.length > 0) {
      results.summary.totalAttempts += investorPromises.length
      await Promise.allSettled(investorPromises)
    }

    return results
  }

  // ================================
  // HELPER METHODS
  // ================================

  /**
   * 영업일인지 확인 (한국 기준)
   */
  private static isBusinessDay(date: string): boolean {
    const d = new Date(date)
    const dayOfWeek = d.getDay()
    
    // 토요일(6), 일요일(0) 제외
    return dayOfWeek !== 0 && dayOfWeek !== 6
  }

  /**
   * 마지막 영업일 계산
   */
  static getLastBusinessDay(offsetDays: number = 1): string {
    const date = new Date()
    let dayCount = 0
    
    while (dayCount < offsetDays) {
      date.setDate(date.getDate() - 1)
      if (this.isBusinessDay(formatDate(date))) {
        dayCount++
      }
    }
    
    return formatDate(date)
  }

  /**
   * 데이터 품질 검증
   */
  static validateMarketData(stockData: krxStockData): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    // 필수 필드 검증
    if (!stockData.stck_prpr || stockData.stck_prpr === '0') {
      issues.push('현재가 데이터 누락')
    }

    if (!stockData.acml_vol || stockData.acml_vol === '0') {
      issues.push('거래량 데이터 누락')
    }

    if (!stockData.acml_tr_pbmn || stockData.acml_tr_pbmn === '0') {
      issues.push('거래대금 데이터 누락')
    }

    // 데이터 일관성 검증
    const currentPrice = Number(stockData.stck_prpr || 0)
    const openPrice = Number(stockData.stck_oprc || 0)
    const highPrice = Number(stockData.stck_hgpr || 0)
    const lowPrice = Number(stockData.stck_lwpr || 0)

    if (currentPrice > 0 && highPrice > 0 && currentPrice > highPrice) {
      issues.push('현재가가 고가보다 높음 (데이터 불일치)')
    }

    if (currentPrice > 0 && lowPrice > 0 && currentPrice < lowPrice) {
      issues.push('현재가가 저가보다 낮음 (데이터 불일치)')
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  // ================================
  // VALIDATION METHODS
  // ================================

  /**
   * 수집 전 환경 검증
   */
  static validateCollectionEnvironment(): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    if (!KrxApiClient.validateApiKeys()) {
      issues.push('KRX API 키가 설정되지 않았습니다 (KIS_API_KEY, KIS_API_SECRET)')
    }

    // 네트워크 연결 확인은 실제 API 호출에서 처리
    return {
      isValid: issues.length === 0,
      issues
    }
  }
}