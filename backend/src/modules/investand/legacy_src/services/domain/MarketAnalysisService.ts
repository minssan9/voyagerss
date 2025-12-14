import { FearGreedCalculator } from '@/services/core/fearGreedCalculator'
import { DatabaseService } from '@/services/core/databaseService'
import { MarketDataRepository } from '@/repositories/market/MarketDataRepository'
import { logger } from '@/utils/common/logger'
import { formatDate } from '@/utils/common/dateUtils'

/**
 * 시장 분석 도메인 서비스
 * Fear & Greed Index, 시장 분석, 투자 인사이트 제공
 */
export class MarketAnalysisService {

  // ================================
  // PUBLIC ANALYSIS METHODS
  // ================================

  /**
   * 현재 시장 상황 종합 분석
   */
  static async getCurrentMarketAnalysis(): Promise<{
    fearGreedIndex: any
    marketStatus: string
    recommendation: string
    confidence: number
    components: any
    marketData: any
  }> {
    logger.info('[MarketAnalysis] 현재 시장 분석 시작')

    try {
      const today = formatDate(new Date())
      
      // Fear & Greed Index 계산
      const fearGreedResult = await FearGreedCalculator.calculateIndex(today)
      
      // 현재 시장 요약
      const marketSummary = await FearGreedCalculator.getCurrentMarketSummary()
      
      // 최신 시장 데이터 조회
      const marketData = await this.getLatestMarketData()
      
      const analysis = {
        fearGreedIndex: fearGreedResult,
        marketStatus: marketSummary.marketStatus,
        recommendation: marketSummary.recommendation,
        confidence: fearGreedResult.confidence,
        components: fearGreedResult.components,
        marketData,
        analyzedAt: new Date()
      }

      logger.info('[MarketAnalysis] 현재 시장 분석 완료')
      return analysis

    } catch (error) {
      logger.error('[MarketAnalysis] 현재 시장 분석 실패:', error)
      throw error
    }
  }

  /**
   * 특정 기간의 시장 분석
   */
  static async getPeriodMarketAnalysis(
    startDate: string,
    endDate: string
  ): Promise<{
    period: { startDate: string; endDate: string }
    fearGreedHistory: any[]
    marketTrend: any
    analysis: {
      averageFearGreed: number
      volatility: number
      trend: string
      keyEvents: any[]
    }
  }> {
    logger.info(`[MarketAnalysis] 기간별 시장 분석: ${startDate} ~ ${endDate}`)

    try {
      // Fear & Greed Index 히스토리 계산
      const fearGreedHistory = await FearGreedCalculator.calculateIndexForDateRange(
        startDate,
        endDate
      )

      // 시장 데이터 트렌드 분석
      const marketTrend = await this.analyzeMarketTrend(startDate, endDate)

      // 종합 분석
      const analysis = this.performComprehensiveAnalysis(fearGreedHistory, marketTrend)

      const result = {
        period: { startDate, endDate },
        fearGreedHistory,
        marketTrend,
        analysis,
        analyzedAt: new Date()
      }

      logger.info('[MarketAnalysis] 기간별 시장 분석 완료')
      return result

    } catch (error) {
      logger.error('[MarketAnalysis] 기간별 시장 분석 실패:', error)
      throw error
    }
  }

  /**
   * 투자 인사이트 생성
   */
  static async generateInvestmentInsights(): Promise<{
    currentSentiment: string
    marketPhase: string
    riskLevel: string
    opportunities: string[]
    warnings: string[]
    recommendedActions: string[]
  }> {
    logger.info('[MarketAnalysis] 투자 인사이트 생성 시작')

    try {
      const currentAnalysis = await this.getCurrentMarketAnalysis()
      const fearGreedValue = currentAnalysis.fearGreedIndex.value
      const confidence = currentAnalysis.confidence

      // 시장 페이즈 판단
      const marketPhase = this.determineMarketPhase(fearGreedValue)
      
      // 리스크 레벨 평가
      const riskLevel = this.assessRiskLevel(fearGreedValue, confidence)
      
      // 기회 요소 분석
      const opportunities = this.identifyOpportunities(fearGreedValue, currentAnalysis.components)
      
      // 경고 사항 분석
      const warnings = this.identifyWarnings(fearGreedValue, currentAnalysis.components)
      
      // 추천 액션
      const recommendedActions = this.generateRecommendedActions(
        fearGreedValue,
        marketPhase,
        riskLevel
      )

      const insights = {
        currentSentiment: currentAnalysis.marketStatus,
        marketPhase,
        riskLevel,
        opportunities,
        warnings,
        recommendedActions,
        generatedAt: new Date()
      }

      logger.info('[MarketAnalysis] 투자 인사이트 생성 완료')
      return insights

    } catch (error) {
      logger.error('[MarketAnalysis] 투자 인사이트 생성 실패:', error)
      throw error
    }
  }

  // ================================
  // PRIVATE ANALYSIS METHODS
  // ================================

  /**
   * 최신 시장 데이터 조회
   */
  private static async getLatestMarketData(): Promise<any> {
    try {
      const [kospiData, kosdaqData, fearGreedData] = await Promise.all([
        DatabaseService.getLatestKOSPIData(),
        DatabaseService.getLatestKOSDAQData(),
        DatabaseService.getLatestFearGreedIndex()
      ])

      return {
        kospi: kospiData ? {
          price: kospiData.stck_prpr,
          change: kospiData.prdy_vrss,
          changeRate: kospiData.prdy_ctrt,
          volume: kospiData.acml_vol,
          tradingValue: kospiData.acml_tr_pbmn
        } : null,
        kosdaq: kosdaqData ? {
          price: kosdaqData.stck_prpr,
          change: kosdaqData.prdy_vrss,
          changeRate: kosdaqData.prdy_ctrt,
          volume: kosdaqData.acml_vol,
          tradingValue: kosdaqData.acml_tr_pbmn
        } : null,
        fearGreed: fearGreedData ? {
          value: fearGreedData.value,
          level: fearGreedData.level,
          date: fearGreedData.date
        } : null
      }
    } catch (error) {
      logger.error('[MarketAnalysis] 최신 시장 데이터 조회 실패:', error)
      return null
    }
  }

  /**
   * 시장 트렌드 분석
   */
  private static async analyzeMarketTrend(startDate: string, endDate: string): Promise<any> {
    try {
      const marketData = await MarketDataRepository.getMarketDataByDateRange(startDate, endDate)
      
      const kospiData = marketData.kospiData
      const kosdaqData = marketData.kosdaqData

      // KOSPI 트렌드 분석
      const kospiTrend = this.calculateTrend(kospiData, 'stck_prpr')
      
      // KOSDAQ 트렌드 분석
      const kosdaqTrend = this.calculateTrend(kosdaqData, 'stck_prpr')

      return {
        kospi: kospiTrend,
        kosdaq: kosdaqTrend,
        overallTrend: this.determineOverallTrend(kospiTrend, kosdaqTrend)
      }
    } catch (error) {
      logger.error('[MarketAnalysis] 시장 트렌드 분석 실패:', error)
      return null
    }
  }

  /**
   * 종합 분석 수행
   */
  private static performComprehensiveAnalysis(fearGreedHistory: any[], marketTrend: any): any {
    const values = fearGreedHistory.map(item => item.value)
    const averageFearGreed = values.reduce((sum, val) => sum + val, 0) / values.length
    
    // 변동성 계산 (표준편차)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - averageFearGreed, 2), 0) / values.length
    const volatility = Math.sqrt(variance)

    // 트렌드 방향 판단
    const trend = this.determineTrendDirection(values)

    return {
      averageFearGreed: Math.round(averageFearGreed),
      volatility: Math.round(volatility * 100) / 100,
      trend,
      keyEvents: this.identifyKeyEvents(fearGreedHistory)
    }
  }

  /**
   * 시장 페이즈 판단
   */
  private static determineMarketPhase(fearGreedValue: number): string {
    if (fearGreedValue <= 20) return 'Extreme Fear Phase'
    if (fearGreedValue <= 40) return 'Fear Phase'
    if (fearGreedValue <= 60) return 'Neutral Phase'
    if (fearGreedValue <= 80) return 'Greed Phase'
    return 'Extreme Greed Phase'
  }

  /**
   * 리스크 레벨 평가
   */
  private static assessRiskLevel(fearGreedValue: number, confidence: number): string {
    // 신뢰도가 낮으면 리스크 높음
    if (confidence < 70) return 'High Risk'
    
    // 극단적인 값들은 리스크 높음
    if (fearGreedValue <= 20 || fearGreedValue >= 80) return 'High Risk'
    if (fearGreedValue <= 30 || fearGreedValue >= 70) return 'Medium Risk'
    
    return 'Low Risk'
  }

  /**
   * 기회 요소 식별
   */
  private static identifyOpportunities(fearGreedValue: number, components: any): string[] {
    const opportunities: string[] = []

    if (fearGreedValue <= 30) {
      opportunities.push('매수 기회: 극도의 공포 상태에서 반등 가능성')
    }

    if (components.priceMomentum <= 30) {
      opportunities.push('모멘텀 회복 기회: 주가 모멘텀이 낮은 상태')
    }

    if (components.investorSentiment <= 30) {
      opportunities.push('투자자 심리 개선 기회: 외국인/기관 매수 전환 가능성')
    }

    return opportunities
  }

  /**
   * 경고 사항 식별
   */
  private static identifyWarnings(fearGreedValue: number, components: any): string[] {
    const warnings: string[] = []

    if (fearGreedValue >= 80) {
      warnings.push('과열 경고: 극도의 탐욕 상태로 조정 가능성')
    }

    if (components.volatilityIndex >= 70) {
      warnings.push('변동성 경고: 높은 변동성으로 리스크 증가')
    }

    if (components.safeHavenDemand >= 70) {
      warnings.push('안전자산 선호: 시장 회피 심리 확산')
    }

    return warnings
  }

  /**
   * 추천 액션 생성
   */
  private static generateRecommendedActions(
    fearGreedValue: number,
    marketPhase: string,
    riskLevel: string
  ): string[] {
    const actions: string[] = []

    if (fearGreedValue <= 30) {
      actions.push('점진적 매수 고려')
      actions.push('장기 투자 관점에서 포지션 구축')
    } else if (fearGreedValue >= 70) {
      actions.push('수익 실현 고려')
      actions.push('리스크 관리 강화')
    } else {
      actions.push('현재 포지션 유지')
      actions.push('시장 상황 모니터링 지속')
    }

    if (riskLevel === 'High Risk') {
      actions.push('투자 금액 조절')
      actions.push('손절매 기준 설정')
    }

    return actions
  }

  // ================================
  // HELPER METHODS
  // ================================

  /**
   * 트렌드 계산
   */
  private static calculateTrend(data: any[], priceField: string): any {
    if (!data || data.length < 2) return null

    const prices = data.map(item => Number(item[priceField] || 0))
    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    
    // null/undefined 체크 추가
    if (firstPrice === undefined || lastPrice === undefined) {
      return null
    }
    
    const change = lastPrice - firstPrice
    const changeRate = (change / firstPrice) * 100

    return {
      firstPrice,
      lastPrice,
      change,
      changeRate: Math.round(changeRate * 100) / 100,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
    }
  }

  /**
   * 전체 트렌드 판단
   */
  private static determineOverallTrend(kospiTrend: any, kosdaqTrend: any): string {
    if (!kospiTrend || !kosdaqTrend) return 'unknown'

    const kospiDirection = kospiTrend.direction
    const kosdaqDirection = kosdaqTrend.direction

    if (kospiDirection === kosdaqDirection) {
      return kospiDirection
    }

    return 'mixed'
  }

  /**
   * 트렌드 방향 판단
   */
  private static determineTrendDirection(values: number[]): string {
    if (values.length < 2) return 'insufficient_data'

    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length

    if (secondAvg > firstAvg + 5) return 'improving'
    if (secondAvg < firstAvg - 5) return 'deteriorating'
    return 'stable'
  }

  /**
   * 주요 이벤트 식별
   */
  private static identifyKeyEvents(fearGreedHistory: any[]): any[] {
    const events: any[] = []
    
    for (let i = 1; i < fearGreedHistory.length; i++) {
      const current = fearGreedHistory[i]
      const previous = fearGreedHistory[i - 1]
      
      const change = current.value - previous.value
      
      if (Math.abs(change) >= 10) {
        events.push({
          date: current.date,
          change,
          type: change > 0 ? 'sentiment_improvement' : 'sentiment_deterioration',
          from: previous.value,
          to: current.value
        })
      }
    }

    return events
  }
}
