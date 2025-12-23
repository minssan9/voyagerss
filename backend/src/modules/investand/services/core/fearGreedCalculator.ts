import { formatDate } from '@investand/utils/common/dateUtils'
import { FearGreedIndexRepository } from '@investand/repositories/FearGreedIndexRepository'
import { MarketDataRepository } from '@investand/repositories/market/MarketDataRepository'

/**
 * Fear & Greed Index 계산 결과 인터페이스
 */
export interface FearGreedResult {
  date: string
  value: number
  level: string
  confidence: number
  components: {
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }
}

/**
 * Fear & Greed Index 계산기
 * 공포탐욕지수 계산 로직과 시장 분석 기능 제공
 */
export class FearGreedCalculator {

  // ================================
  // STATIC PROPERTIES & CONSTANTS
  // ================================

  /**
   * 구성요소별 가중치 (총합 100%)
   */
  private static readonly WEIGHTS = {
    priceMomentum: 0.25,      // 주가 모멘텀 25%
    investorSentiment: 0.25,  // 투자자 심리 25%
    putCallRatio: 0.15,       // 풋/콜 비율 15%
    volatilityIndex: 0.20,    // 변동성 지수 20%
    safeHavenDemand: 0.15     // 안전자산 수요 15%
  }

  /**
   * Fear & Greed 레벨 임계값
   */
  private static readonly LEVEL_THRESHOLDS = {
    EXTREME_FEAR: 20,
    FEAR: 40,
    NEUTRAL: 60,
    GREED: 80
  }

  // ================================
  // PUBLIC METHODS (API SURFACE)
  // ================================

  /**
   * 특정 날짜의 Fear & Greed Index 계산
   */
  static async calculateIndex(date: string): Promise<FearGreedResult> {
    console.log(`[FearGreed] ${date} Fear & Greed Index 계산 시작`)

    try {
      const components = await this.calculateComponents(date)

      // 가중평균으로 최종 지수 계산
      const value = Math.round(
        components.priceMomentum * this.WEIGHTS.priceMomentum +
        components.investorSentiment * this.WEIGHTS.investorSentiment +
        components.putCallRatio * this.WEIGHTS.putCallRatio +
        components.volatilityIndex * this.WEIGHTS.volatilityIndex +
        components.safeHavenDemand * this.WEIGHTS.safeHavenDemand
      )

      // 신뢰도 계산 (모든 구성요소가 있으면 100%)
      const confidence = this.calculateConfidence(components)

      const result: FearGreedResult = {
        date,
        value,
        level: this.getLevel(value),
        confidence,
        components
      }

      console.log(`[FearGreed] ${date} 계산 완료: ${value} (${result.level})`)
      return result

    } catch (error) {
      console.error(`[FearGreed] ${date} 계산 실패:`, error)
      throw error
    }
  }

  /**
   * 날짜 범위의 Fear & Greed Index 일괄 계산
   */
  static async calculateIndexForDateRange(
    startDate: string,
    endDate: string
  ): Promise<FearGreedResult[]> {
    const results: FearGreedResult[] = []

    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      try {
        const dateStr = formatDate(date)
        const result = await this.calculateIndex(dateStr)
        results.push(result)
      } catch (error) {
        console.error(`[FearGreed] ${formatDate(date)} 계산 실패:`, error)
      }
    }

    return results
  }

  /**
   * 현재 시장 상황 요약 분석
   */
  static async getCurrentMarketSummary(): Promise<{
    fearGreedIndex: FearGreedResult
    marketStatus: string
    recommendation: string
  }> {
    const today = formatDate(new Date())
    const fearGreedIndex = await this.calculateIndex(today)

    let marketStatus = ''
    let recommendation = ''

    switch (fearGreedIndex.level) {
      case 'Extreme Fear':
        marketStatus = '극도의 공포 상태'
        recommendation = '매수 기회일 수 있으나 신중한 접근 필요'
        break
      case 'Fear':
        marketStatus = '공포 상태'
        recommendation = '점진적 매수 고려'
        break
      case 'Neutral':
        marketStatus = '중립 상태'
        recommendation = '균형잡힌 포트폴리오 유지'
        break
      case 'Greed':
        marketStatus = '탐욕 상태'
        recommendation = '수익 실현 고려'
        break
      case 'Extreme Greed':
        marketStatus = '극도의 탐욕 상태'
        recommendation = '매도 타이밍일 수 있음'
        break
    }

    return {
      fearGreedIndex,
      marketStatus,
      recommendation
    }
  }

  // ================================
  // PRIVATE METHODS (IMPLEMENTATION)
  // ================================

  /**
   * 구성요소 통합 계산
   */
  private static async calculateComponents(date: string): Promise<{
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }> {
    const [
      priceMomentum,
      investorSentiment,
      putCallRatio,
      volatilityIndex,
      safeHavenDemand
    ] = await Promise.all([
      this.calculatePriceMomentum(date),
      this.calculateInvestorSentiment(date),
      this.calculatePutCallRatio(date),
      this.calculateVolatilityIndex(date),
      this.calculateSafeHavenDemand(date)
    ])

    return {
      priceMomentum,
      investorSentiment,
      putCallRatio,
      volatilityIndex,
      safeHavenDemand
    }
  }

  /**
   * 주가 모멘텀 계산 (0-100)
   */
  private static async calculatePriceMomentum(date: string): Promise<number> {
    try {
      // MarketDataRepository를 통해 KOSPI 데이터 조회
      const endDate = date
      const startDate = new Date(date)
      startDate.setDate(startDate.getDate() - 120)

      const marketData = await MarketDataRepository.getMarketDataByDateRange(
        formatDate(startDate),
        endDate
      )

      const historicalData = marketData.kospiData
      if (historicalData.length < 20) {
        console.warn('[FearGreed] 주가 모멘텀 계산을 위한 데이터 부족')
        return 50 // 중립값 반환
      }

      // 날짜순 정렬 (최신순)
      const sortedData = historicalData.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      // 20일/120일 이동평균 계산
      const ma20 = sortedData.slice(0, 20).reduce((sum, data) =>
        sum + Number(data.stck_prpr || 0), 0) / 20
      const ma120 = sortedData.reduce((sum, data) =>
        sum + Number(data.stck_prpr || 0), 0) / sortedData.length

      // 모멘텀 점수 계산 (MA20이 MA120 대비 ±10% 범위를 0-100으로 변환)
      const momentum = ((ma20 / ma120 - 0.9) * 500)
      return Math.max(0, Math.min(100, momentum))

    } catch (error) {
      console.error('[FearGreed] 주가 모멘텀 계산 실패:', error)
      return 50 // 오류 시 중립값 반환
    }
  }

  /**
   * 투자자 심리 계산 (0-100)
   */
  private static async calculateInvestorSentiment(date: string): Promise<number> {
    try {
      // 5일간의 투자자 데이터 조회를 위한 날짜 범위 설정
      const endDate = date
      const startDate = new Date(date)
      startDate.setDate(startDate.getDate() - 5)

      const marketData = await MarketDataRepository.getMarketDataByDateRange(
        formatDate(startDate),
        endDate
      )

      const tradingData = marketData.investorData
      if (tradingData.length === 0) {
        console.warn('[FearGreed] 투자자 심리 계산을 위한 데이터 부족')
        return 50 // 중립값 반환
      }

      // 외국인과 기관의 순매수 합산
      let totalNetBuying = 0
      tradingData.forEach(data => {
        // 외국인 순매수 = 매수 - 매도 (거래대금 기준)
        const foreignNet = Number(data.frgn_shnu_tr_pbmn || 0) - Number(data.frgn_seln_tr_pbmn || 0)
        // 기관 순매수 = 매수 - 매도 (거래대금 기준)
        const institutionalNet = Number(data.orgn_shnu_tr_pbmn || 0) - Number(data.orgn_seln_tr_pbmn || 0)
        totalNetBuying += foreignNet + institutionalNet
      })

      // 순매수를 0-100 점수로 변환 (±10조원 범위)
      const maxRange = 10000000000000 // 10조원
      const score = ((totalNetBuying + maxRange) * 100) / (maxRange * 2)
      return Math.max(0, Math.min(100, score))

    } catch (error) {
      console.error('[FearGreed] 투자자 심리 계산 실패:', error)
      return 50 // 오류 시 중립값 반환
    }
  }

  /**
   * 풋/콜 비율 계산 (0-100)
   */
  private static async calculatePutCallRatio(date: string): Promise<number> {
    try {
      const marketData = await MarketDataRepository.getMarketDataByDateRange(date, date)
      const optionData = marketData.optionData[0]

      if (!optionData) {
        console.warn('[FearGreed] 풋/콜 비율 계산을 위한 데이터 부족')
        return 50 // 중립값 반환
      }

      // Put/Call 비율을 0-100 점수로 변환 (0.5~2.0 범위)
      // 비율이 높을수록 공포심리 (낮은 점수)
      const ratio = Number(optionData.putCallRatio)
      const score = 100 - ((ratio - 0.5) * 66.67)
      return Math.max(0, Math.min(100, score))

    } catch (error) {
      console.error('[FearGreed] 풋/콜 비율 계산 실패:', error)
      return 50 // 오류 시 중립값 반환
    }
  }

  /**
   * 변동성 지수 계산 (0-100)
   */
  private static async calculateVolatilityIndex(date: string): Promise<number> {
    try {
      const latestData = await MarketDataRepository.getLatestMarketData()
      const vkospiData = latestData.vkospi

      if (!vkospiData) {
        console.warn('[FearGreed] 변동성 지수 계산을 위한 데이터 부족')
        return 50 // 중립값 반환
      }

      // VKOSPI를 0-100 점수로 변환 (10~40 범위)
      // 변동성이 높을수록 공포심리 (낮은 점수)
      const vkospi = Number(vkospiData.value)
      const score = 100 - ((vkospi - 10) * 3.33)
      return Math.max(0, Math.min(100, score))

    } catch (error) {
      console.error('[FearGreed] 변동성 지수 계산 실패:', error)
      return 50 // 오류 시 중립값 반환
    }
  }

  /**
   * 안전자산 수요 계산 (0-100)
   */
  private static async calculateSafeHavenDemand(date: string): Promise<number> {
    try {
      const marketData = await MarketDataRepository.getMarketDataByDateRange(date, date)
      const yieldData = marketData.bondYieldData[0]

      if (!yieldData || !yieldData.yield3Y || !yieldData.yield10Y) {
        console.warn('[FearGreed] 안전자산 수요 계산을 위한 데이터 부족')
        return 50 // 중립값 반환
      }

      // 10년물과 3년물의 스프레드 계산
      const spread = Number(yieldData.yield10Y) - Number(yieldData.yield3Y)

      // 스프레드를 0-100 점수로 변환 (-0.5~2.0 범위)
      // 스프레드가 작을수록 공포심리 (낮은 점수)
      const score = ((spread + 0.5) * 40)
      return Math.max(0, Math.min(100, score))

    } catch (error) {
      console.error('[FearGreed] 안전자산 수요 계산 실패:', error)
      return 50 // 오류 시 중립값 반환
    }
  }

  // ================================
  // HELPER METHODS & UTILITIES
  // ================================

  /**
   * Fear & Greed 레벨 분류
   */
  private static getLevel(value: number): string {
    if (value <= this.LEVEL_THRESHOLDS.EXTREME_FEAR) return 'Extreme Fear'
    if (value <= this.LEVEL_THRESHOLDS.FEAR) return 'Fear'
    if (value <= this.LEVEL_THRESHOLDS.NEUTRAL) return 'Neutral'
    if (value <= this.LEVEL_THRESHOLDS.GREED) return 'Greed'
    return 'Extreme Greed'
  }

  /**
   * 신뢰도 계산 (구성요소 유효성 기반)
   */
  private static calculateConfidence(components: any): number {
    let availableComponents = 0
    const totalComponents = 5

    if (components.priceMomentum >= 0) availableComponents++
    if (components.investorSentiment >= 0) availableComponents++
    if (components.putCallRatio >= 0) availableComponents++
    if (components.volatilityIndex >= 0) availableComponents++
    if (components.safeHavenDemand >= 0) availableComponents++

    return Math.round((availableComponents / totalComponents) * 100)
  }

  // ================================
  // ERROR HANDLING & VALIDATION
  // ================================

  /**
   * 날짜 형식 검증
   */
  private static validateDateFormat(date: string): void {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      throw new Error(`잘못된 날짜 형식: ${date} (YYYY-MM-DD 형식 사용)`)
    }
  }

  /**
   * 구성요소 값 검증 및 정규화
   */
  private static validateAndNormalizeScore(value: number, componentName: string): number {
    if (isNaN(value) || value < 0) {
      console.warn(`[FearGreed] ${componentName} 값이 유효하지 않음: ${value}`)
      return 50 // 중립값 반환
    }
    return Math.max(0, Math.min(100, value))
  }
} 