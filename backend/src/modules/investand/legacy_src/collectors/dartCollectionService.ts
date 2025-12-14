import { DartApiClient } from '@/clients/dart/DartApiClient'
import { DartTypesMapper } from '@/clients/dart/DartTypesMapper'
import { DartDisclosureRepository } from '@/repositories/dart/DartDisclosureRepository'
import type { 
  DartBatchRequest, 
  DartDisclosureData, 
  SentimentRelevantDisclosure 
} from '@/types/collectors/dartTypes'
import { logger } from '@/utils/common/logger'
import { formatDate } from '@/utils/common/dateUtils'

/**
 * DART 데이터 수집 서비스
 * API 클라이언트와 리포지토리를 조합한 비즈니스 로직 처리
 */
export class DartCollectionService {
  
  // ================================
  // PUBLIC COLLECTION METHODS
  // ================================

  /**
   * 일별 지분공시 수집 및 저장 (D 타입 전용)
   */
  static async collectDailyDisclosures(
    date: string, 
    saveToDb: boolean = true,
    options: {
      maxPages?: number
      pageSize?: number
    } = {}
  ): Promise<{
    totalDisclosures: number
    stockDisclosures: DartDisclosureData[]
  }> {
    logger.info(`[DART Collection] ${date} 일별 지분공시 수집 시작`)

    // API 키 검증
    if (!DartApiClient.validateApiKey()) {
      throw new Error('DART API 키가 설정되지 않았습니다')
    }

    // 날짜 형식 검증
    if (!DartApiClient.validateDateFormat(date)) {
      throw new Error('날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)')
    }

    try {
      // 지분공시 데이터 수집 (pblntf_ty='D' 고정)
      const stockDisclosures = await this.fetchAllDisclosures(date, options)
      
      // 데이터베이스 저장
      if (saveToDb && stockDisclosures.length > 0) {
        await this.saveBatchDisclosures(stockDisclosures)
        
        // 상세 지분공시 분석 및 저장
        await this.processStockDisclosureDetails(stockDisclosures)
      }

      logger.info(`[DART Collection] 수집 완료: 총 ${stockDisclosures.length}건`)
      return {
        totalDisclosures: stockDisclosures.length,
        stockDisclosures
      }

    } catch (error) {
      logger.error(`[DART Collection] 수집 실패: ${date}`, error)
      throw error
    }
  }

  /**
   * 기업별 공시데이터 수집 (전체 페이지네이션)
   */
  /*static async collectCompanyDisclosures(
    corpCode: string, 
    startDate: string, 
    endDate: string,
    options: {
      maxPages?: number
      pageSize?: number
      reportCode?: string
    } = {}
  ): Promise<DartDisclosureData[]> {
    logger.info(`[DART Collection] 기업별 공시 수집: ${corpCode} (${startDate} ~ ${endDate})`)

    // 기업코드 형식 검증
    if (!DartApiClient.validateCorpCode(corpCode)) {
      throw new Error('기업코드 형식이 올바르지 않습니다 (8자리 숫자)')
    }

    const { 
      maxPages = 20,  // 기업별은 상대적으로 적으므로 20페이지
      pageSize = 100,
      reportCode 
    } = options

    const allDisclosures: DartDisclosureData[] = []
    let pageNo = 1
    let consecutiveErrors = 0
    const maxConsecutiveErrors = 3

    logger.info(`[DART Collection] 기업별 전체 데이터 수집 시작 (최대 ${maxPages}페이지)`)

    while (pageNo <= maxPages) {
      const request: DartBatchRequest = {
        startDate,
        endDate,
        corpCode,
        pageNo,
        pageCount: pageSize,
        ...(reportCode && { reportCode })
      }

      try {
        const disclosures = await DartApiClient.fetchDisclosures(request)
        
        // 데이터가 없으면 종료
        if (disclosures.length === 0) {
          logger.info(`[DART Collection] 기업별 페이지 ${pageNo}: 데이터 없음 - 수집 완료`)
          break
        }

        allDisclosures.push(...disclosures)
        consecutiveErrors = 0 // 성공 시 에러 카운트 리셋
        
        logger.info(`[DART Collection] 기업별 페이지 ${pageNo}: ${disclosures.length}건 수집 (누적: ${allDisclosures.length}건)`)
        
        // 페이지당 최대 건수보다 적으면 마지막 페이지
        if (disclosures.length < pageSize) {
          logger.info(`[DART Collection] 기업별 마지막 페이지 감지 (페이지 ${pageNo})`)
          break
        }

        pageNo++

        // API 과부하 방지를 위한 짧은 지연
        if (pageNo % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        consecutiveErrors++
        logger.error(`[DART Collection] 기업별 페이지 ${pageNo} 수집 실패 (연속 실패: ${consecutiveErrors}):`, error)
        
        // 연속 실패가 너무 많으면 중단
        if (consecutiveErrors >= maxConsecutiveErrors) {
          logger.warn(`[DART Collection] 기업별 연속 ${maxConsecutiveErrors}회 실패로 수집 중단`)
          break
        }
        
        // 실패 시에도 다음 페이지 시도
        pageNo++
        
        // 실패 후 지연
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    logger.info(`[DART Collection] 기업별 수집 완료: ${corpCode} - 총 ${allDisclosures.length}건 (${pageNo - 1}페이지 처리)`)
    return allDisclosures
  }*/

  /**
   * Fear & Greed 관련 공시 필터링 (D 타입 전용으로 단순화)
   */
  static filterSentimentRelevantDisclosures(disclosures: DartDisclosureData[]): SentimentRelevantDisclosure[] {
    // D 타입 전용으로 단순화 - 감정 분석 기능 제거됨
    return []
  }

  // ================================
  // PRIVATE BUSINESS LOGIC METHODS
  // ================================

  /**
   * 모든 공시데이터 수집 (전체 페이지네이션 처리)
   */
  private static async fetchAllDisclosures(
    date: string, 
    options: {
      maxPages?: number
      pageSize?: number
      reportCode?: string
    } = {}
  ): Promise<DartDisclosureData[]> {
    const { 
      maxPages = 50,  // 기본 최대 50페이지 (5000건)
      pageSize = 100, // 최대 페이지 크기 (DART API 제한)
      reportCode 
    } = options

    const allDisclosures: DartDisclosureData[] = []
    let pageNo = 1
    let consecutiveErrors = 0
    const maxConsecutiveErrors = 3

    logger.info(`[DART Collection] 전체 데이터 수집 시작: ${date} (최대 ${maxPages}페이지)`)

    while (pageNo <= maxPages) {
      const request: DartBatchRequest = {
        startDate: date,
        endDate: date,
        pageNo,
        pageCount: pageSize,
        ...(reportCode && { reportCode })
      }

      try {
        const disclosures: DartDisclosureData[] = await DartApiClient.fetchDisclosures(request)
        
        // 데이터가 없으면 종료
        if (disclosures.length === 0) {
          logger.info(`[DART Collection] 페이지 ${pageNo}: 데이터 없음 - 수집 완료`)
          break
        }

        allDisclosures.push(...disclosures)
        consecutiveErrors = 0 // 성공 시 에러 카운트 리셋
        
        logger.info(`[DART Collection] 페이지 ${pageNo}: ${disclosures.length}건 수집 (누적: ${allDisclosures.length}건)`)
        
        // 페이지당 최대 건수보다 적으면 마지막 페이지
        if (disclosures.length < pageSize) {
          logger.info(`[DART Collection] 마지막 페이지 감지 (페이지 ${pageNo})`)
          break
        }

        pageNo++

        // API 과부하 방지를 위한 짧은 지연
        if (pageNo % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        consecutiveErrors++
        logger.error(`[DART Collection] 페이지 ${pageNo} 수집 실패 (연속 실패: ${consecutiveErrors}):`, error)
        
        // 연속 실패가 너무 많으면 중단
        if (consecutiveErrors >= maxConsecutiveErrors) {
          logger.warn(`[DART Collection] 연속 ${maxConsecutiveErrors}회 실패로 수집 중단`)
          break
        }
        
        // 실패 시에도 다음 페이지 시도
        pageNo++
        
        // 실패 후 지연
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    logger.info(`[DART Collection] 수집 완료: 총 ${allDisclosures.length}건 (${pageNo - 1}페이지 처리)`)
    return allDisclosures
  }
 
  /**
   * 배치 공시데이터 저장
   */
  private static async saveBatchDisclosures(disclosures: DartDisclosureData[]): Promise<void> {
    try {
      const result = await DartDisclosureRepository.saveDisclosuresBatch(disclosures)
      
      if (result.failed > 0) {
        logger.warn(`[DART Collection] 일부 저장 실패: ${result.failed}/${disclosures.length}건`)
        result.errors.slice(0, 5).forEach(error => logger.warn(error))
      }
    } catch (error) {
      logger.error('[DART Collection] 배치 저장 실패:', error)
      throw error
    }
  }

  /**
   * 데이터 필터링 조건 확인 (Unknown Company 및 0 값 필터링)
   */
  private static shouldFilterData(data: any): boolean {
    // corpName이 'Unknown Company'인 경우 필터링
    if (data.majorHoldingCorpName === 'Unknown Company' || 
        data.corpName === 'Unknown Company') {
      return true
    }
    
    // changeRatio와 changeShares가 모두 0인 경우 필터링
    const changeRatio = parseFloat(data.majorHoldingChangeRatio || data.changeRatio || '0')
    const changeShares = parseFloat(data.majorHoldingChangeShares || data.changeAmount || '0')
    
    if (changeRatio === 0 && changeShares === 0) {
      return true
    }
    
    return false
  }

  /**
   * 상세 지분공시 데이터 처리 (신규 기능)
   */
  private static async processStockDisclosureDetails(stockDisclosures: DartDisclosureData[]): Promise<void> {
    try {
      logger.info(`[DART Collection] ${stockDisclosures.length}건의 지분공시 상세 분석 시작`)

      // 지분공시 데이터를 상세 분석 형태로 변환
      const detailData = await Promise.all(stockDisclosures.map(async (disclosure) => {
        const beforeHolding = this.extractHoldingPercentage(disclosure.reportName || '', 'before')
        const afterHolding = this.extractHoldingPercentage(disclosure.reportName || '', 'after')
        const changeAmount = this.extractChangeAmount(disclosure.reportName || '')
        
        // 추가 분석: 대량보유 현황 및 임원 소유현황 조회 (날짜 필터링 적용)
        const additionalData = await this.fetchAdditionalOwnershipData(disclosure.corpCode, disclosure.disclosureDate)
        
        return {
          receiptNumber: disclosure.receiptNumber,
          disclosureType: disclosure.reportCode,
          beforeHolding: beforeHolding,
          afterHolding: afterHolding,
          changeAmount: changeAmount,
          changeReason: this.extractChangeReason(disclosure.reportName || ''),
          reporterName: disclosure.flrName,
          isSignificant: this.isSignificantChange(disclosure.reportName || ''),
          marketImpact: this.assessMarketImpact(disclosure.corpName || '', disclosure.reportName || ''),
          impactScore: this.calculateImpactScore(disclosure.reportName || ''),
          additionalOwnership: additionalData
        }
      }))

      // 유효한 데이터만 필터링 (undefined 값 제외)
      const validDetailData = detailData
        .filter(data => data.receiptNumber && data.additionalOwnership )
        .map(data => {
          let result: any = {
            receiptNumber: data.receiptNumber,
            disclosureType: data.disclosureType,
            changeReason: data.changeReason,
            reporterName: data.reporterName,
            isSignificant: data.isSignificant,
            marketImpact: data.marketImpact,
            impactScore: data.impactScore
          }
          
          // 옵션 필드들은 값이 있을 때만 포함
          if (data.beforeHolding !== null && data.beforeHolding !== undefined) {
            result.beforeHolding = data.beforeHolding
          }
          if (data.afterHolding !== null && data.afterHolding !== undefined) {
            result.afterHolding = data.afterHolding
          }
          if (data.changeAmount !== null && data.changeAmount !== undefined) {
            result.changeAmount = data.changeAmount
          }
          
          // 추가 소유현황 데이터 포함
          if (data.additionalOwnership) {
            result.majorHoldingsCount = data.additionalOwnership.majorHoldings?.length || 0
            result.executiveHoldingsCount = data.additionalOwnership.executiveHoldings?.length || 0
            result.totalAnalysisScore = data.additionalOwnership.totalAnalysisScore || 0
            
            // 대량보유 데이터 요약
            if (data.additionalOwnership.majorHoldings?.length > 0) {
              const topMajorHolding = data.additionalOwnership.majorHoldings[0]
              result.topMajorHolder = topMajorHolding?.repror || topMajorHolding?.reporter
              result.maxMajorHoldingRate = Math.max(
                ...data.additionalOwnership.majorHoldings.map(h => parseFloat(h.stkrt || '0'))
              )
              
              // 새로운 필드들 추가
              result.majorHoldingReceiptNumber = topMajorHolding?.rcept_no
              result.majorHoldingReceiptDate = topMajorHolding?.rcept_dt
              result.majorHoldingCorpCode = topMajorHolding?.corp_code
              result.majorHoldingCorpName = topMajorHolding?.corp_name
              result.majorHoldingReportType = topMajorHolding?.report_tp
              result.majorHoldingShares = topMajorHolding?.stkqy
              result.majorHoldingChangeShares = topMajorHolding?.stkqy_irds
              result.majorHoldingRatio = topMajorHolding?.stkrt
              result.majorHoldingChangeRatio = topMajorHolding?.stkrt_irds
              result.majorHoldingTransactionShares = topMajorHolding?.ctr_stkqy
              result.majorHoldingTransactionRatio = topMajorHolding?.ctr_stkrt
              result.majorHoldingReportReason = topMajorHolding?.report_resn
            }
            
            // 임원 소유현황 요약
            if (data.additionalOwnership.executiveHoldings?.length > 0) {
              result.topExecutiveHolder = data.additionalOwnership.executiveHoldings[0]?.repror
              result.maxExecutiveHoldingRate = Math.max(
                ...data.additionalOwnership.executiveHoldings.map(e => parseFloat(e.sp_stock_lmp_rate || '0'))
              )
            }
          }
          
          return result
        })

      // 필터링 조건에 따라 데이터 제외 (Unknown Company 및 0 값 필터링)
      const filteredData = validDetailData.filter(data => !this.shouldFilterData(data))
      
      if (filteredData.length !== validDetailData.length) {
        logger.info(`[DART Collection] 필터링: ${validDetailData.length} -> ${filteredData.length} 건 (Unknown Company 및 0 값 제외)`)
      }

      // receiptNumber 기준으로 중복 제거 (첫 번째 항목만 유지)
      const deduplicatedData = new Map<string, any>()
      
      for (const data of filteredData) {
        const receiptNumber = data.receiptNumber
        if (!deduplicatedData.has(receiptNumber)) {
          deduplicatedData.set(receiptNumber, data)
        }
        // 중복된 경우 무시 (첫 번째 항목만 유지)
      }
      
      const uniqueDetailData = Array.from(deduplicatedData.values())
      
      if (uniqueDetailData.length > 0) {
        logger.info(`[DART Collection] 중복 제거: ${filteredData.length} -> ${uniqueDetailData.length} 건`)
        
        // 배치로 상세 지분공시 데이터 저장
        const result = await DartDisclosureRepository.saveBatchStockDisclosureDetails(uniqueDetailData)
        logger.info(`[DART Collection] 상세 지분공시 저장 완료: ${result.saved}건 생성, ${result.updated}건 업데이트, ${result.failed}건 실패`)
      } else {
        logger.info('[DART Collection] 처리할 유효한 상세 지분공시 데이터 없음')
      }

    } catch (error) {
      logger.error('[DART Collection] 상세 지분공시 처리 실패:', error)
      // 상세 분석 실패해도 전체 수집은 계속 진행
    }
  }

  /**
   * 보고서명에서 보유비율 추출 (간단한 패턴 매칭)
   */
  private static extractHoldingPercentage(reportName: string, type: 'before' | 'after'): number | null {
    try {
      // 패턴: "5.02% → 6.15%" 형태에서 추출
      const percentagePattern = /(\d+\.?\d*)%\s*→\s*(\d+\.?\d*)%/
      const match = reportName.match(percentagePattern)
      
      if (match && match[1] && match[2]) {
        return type === 'before' ? parseFloat(match[1]) : parseFloat(match[2])
      }

      // 단일 퍼센트 패턴: "10.5%" 
      const singlePercentPattern = /(\d+\.?\d*)%/
      const singleMatch = reportName.match(singlePercentPattern)
      if (singleMatch && singleMatch[1] && type === 'after') {
        return parseFloat(singleMatch[1])
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * 보고서명에서 변동량 추출
   */
  private static extractChangeAmount(reportName: string): number | null {
    try {
      // 주식수 변동 패턴: "1,000,000주" 또는 "100만주"
      const sharePattern = /([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)[만]*주/
      const match = reportName.match(sharePattern)
      
      if (match && match[1]) {
        let amount = parseFloat(match[1].replace(/,/g, ''))
        if (reportName.includes('만주')) {
          amount *= 10000
        }
        return amount
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * 보고서명에서 변동사유 추출
   */
  private static extractChangeReason(reportName: string): string {
    const reasons = [
      '장내매수', '장내매도', '장외매수', '장외매도',
      '합병', '분할', '무상증자', '유상증자', '감자',
      '전환', '행사', '소각', '기타'
    ]

    for (const reason of reasons) {
      if (reportName.includes(reason)) {
        return reason
      }
    }

    // 일반적인 키워드 기반 추론
    if (reportName.includes('매수') || reportName.includes('취득')) {
      return '매수'
    }
    if (reportName.includes('매도') || reportName.includes('처분')) {
      return '매도'
    }

    return '기타'
  }

  /**
   * 중요한 변동인지 판단 (5% 이상 변동)
   */
  private static isSignificantChange(reportName: string): boolean {
    const beforeHolding = this.extractHoldingPercentage(reportName, 'before')
    const afterHolding = this.extractHoldingPercentage(reportName, 'after')

    if (beforeHolding !== null && afterHolding !== null) {
      return Math.abs(afterHolding - beforeHolding) >= 5.0
    }

    // 단일 비율에서 5% 이상이면 중요한 변동으로 간주
    const singleHolding = afterHolding || beforeHolding
    return singleHolding !== null && singleHolding >= 5.0
  }

  /**
   * 시장 영향도 평가
   */
  private static assessMarketImpact(corpName: string, reportName: string): string {
    const afterHolding = this.extractHoldingPercentage(reportName, 'after')
    const beforeHolding = this.extractHoldingPercentage(reportName, 'before')
    
    // KOSPI 200 대형주인 경우 높은 영향도
    const isLargeCap = corpName.includes('삼성') || corpName.includes('SK') || 
                      corpName.includes('LG') || corpName.includes('현대')

    if (afterHolding !== null && afterHolding >= 10) {
      return isLargeCap ? 'HIGH' : 'MEDIUM'
    }
    
    if (beforeHolding !== null && afterHolding !== null && 
        Math.abs(afterHolding - beforeHolding) >= 5) {
      return isLargeCap ? 'MEDIUM' : 'LOW'
    }

    return 'LOW'
  }

  /**
   * 영향 점수 계산 (0-100)
   */
  private static calculateImpactScore(reportName: string): number {
    let score = 0

    const beforeHolding = this.extractHoldingPercentage(reportName, 'before')
    const afterHolding = this.extractHoldingPercentage(reportName, 'after')

    // 보유비율 기반 점수
    if (afterHolding !== null) {
      score += Math.min(afterHolding * 2, 50) // 최대 50점
    }

    // 변동량 기반 점수
    if (beforeHolding !== null && afterHolding !== null) {
      const change = Math.abs(afterHolding - beforeHolding)
      score += Math.min(change * 3, 30) // 최대 30점
    }

    // 거래 유형별 가중치
    if (reportName.includes('대량보유')) {
      score += 20
    }
    if (reportName.includes('경영권') || reportName.includes('인수합병')) {
      score += 15
    }
    if (reportName.includes('자기주식')) {
      score += 10
    }

    return Math.min(Math.round(score), 100)
  }

  /**
   * 추가 소유현황 데이터 조회 (대량보유 + 임원 소유현황) - 날짜 필터링 적용
   */
  private static async fetchAdditionalOwnershipData(corpCode: string, targetDate?: string): Promise<{
    majorHoldings: any[]
    executiveHoldings: any[]
    totalAnalysisScore: number
  }> {
    try {
      // 병렬로 두 API 호출
      const [majorStockResult, executiveStockResult] = await Promise.all([
        DartApiClient.fetchMajorStockHoldings(corpCode),
        DartApiClient.fetchExecutiveStockOwnership(corpCode)
      ])

      let majorHoldings = majorStockResult.success ? majorStockResult.holdings : []
      let executiveHoldings = executiveStockResult.success ? executiveStockResult.executives : []

      // 날짜 필터링 적용 (targetDate가 있는 경우)
      if (targetDate) {
        const filterDate = targetDate.replace(/-/g, '') // YYYYMMDD 형식으로 변환
        const dateThreshold = 30 // 30일 범위내 데이터만 허용
        
        majorHoldings = majorHoldings.filter(item => {
          if (!item.rcept_dt) return false
          const itemDate = item.rcept_dt.replace(/-/g, '')
          const daysDiff = Math.abs((parseInt(filterDate) - parseInt(itemDate)) / 1) // 단순 날짜 차이 계산
          return daysDiff <= dateThreshold
        })

        executiveHoldings = executiveHoldings.filter(item => {
          if (!item.rcept_dt) return false
          const itemDate = item.rcept_dt.replace(/-/g, '')
          const daysDiff = Math.abs((parseInt(filterDate) - parseInt(itemDate)) / 1) // 단순 날짜 차이 계산
          return daysDiff <= dateThreshold
        })

        logger.info(`[DART Collection] 날짜 필터링 적용 (${targetDate}): 대량보유 ${majorHoldings.length}건, 임원 ${executiveHoldings.length}건`)
      }

      // 종합 분석 점수 계산
      const totalAnalysisScore = this.calculateCombinedOwnershipScore(majorHoldings, executiveHoldings)

      logger.info(`[DART Collection] 추가 소유현황 조회 완료: ${corpCode} - 대량보유 ${majorHoldings.length}건, 임원 ${executiveHoldings.length}건`)

      return {
        majorHoldings,
        executiveHoldings,
        totalAnalysisScore
      }
    } catch (error) {
      logger.warn(`[DART Collection] 추가 소유현황 조회 실패: ${corpCode}`, error)
      return {
        majorHoldings: [],
        executiveHoldings: [],
        totalAnalysisScore: 0
      }
    }
  }

  /**
   * 대량보유 + 임원 소유현황 종합 점수 계산
   */
  private static calculateCombinedOwnershipScore(majorHoldings: any[], executiveHoldings: any[]): number {
    let score = 0

    // 대량보유 분석 (60점 만점)
    majorHoldings.forEach(holding => {
      const holdingRate = parseFloat(holding.stkrt || '0')
      score += Math.min(holdingRate * 2, 15) // 각 보유자당 최대 15점
    })

    // 임원 소유현황 분석 (40점 만점)
    executiveHoldings.forEach(executive => {
      const ownershipRate = parseFloat(executive.sp_stock_lmp_rate || '0')
      const isExecutive = executive.isu_exctv_rgist_at === 'Y'
      
      let executiveScore = Math.min(ownershipRate * 1.5, 8) // 기본 점수
      if (isExecutive) {
        executiveScore *= 1.5 // 임원인 경우 가중치
      }
      
      score += Math.min(executiveScore, 10) // 각 임원당 최대 10점
    })

    return Math.min(Math.round(score), 100)
  }

  // ================================
  // VALIDATION METHODS
  // ================================

  /**
   * 영업일인지 확인 (한국 기준)
   */
  static isBusinessDay(date: string): boolean {
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
}