import type {
  DartMajorStockItem,
  DartStockHoldingData,
  DartDisclosureRawItem,
  DartDisclosureData
} from '@investand/interfaces/dartTypes'
import { logger } from '@investand/utils/common/logger'

/**
 * DART API 응답 데이터 변환 유틸리티
 * API 응답을 내부 비즈니스 모델로 변환
 */
export class DartTypesMapper {

  // ================================
  // PUBLIC TRANSFORMATION METHODS
  // ================================

  /**
   * disclosure list API 응답을 내부 데이터 구조로 변환 (snake_case → camelCase)
   */
  static transformDisclosureData(item: DartDisclosureRawItem): DartDisclosureData {
    logger.debug(`[DART Mapper] disclosure 데이터 변환: ${item.corp_name}`)

    return {
      corpCode: item.corp_code,
      corpName: item.corp_name,
      stockCode: item.stock_code || '',
      reportName: item.report_nm,
      receiptNumber: item.rcept_no,
      flrName: item.flr_nm,
      receiptDate: this.formatDateString(item.rcept_dt),
      disclosureDate: this.formatDateString(item.rcept_dt), // API에서 동일한 값 사용
      remarks: item.rm || '',
      reportCode: 'D' // 지분공시 전용
    }
  }

  /**
   * majorstock API 응답을 내부 데이터 구조로 변환
   */
  static transformMajorStockData(item: DartMajorStockItem): DartStockHoldingData {
    logger.debug(`[DART Mapper] majorstock 데이터 변환: ${item.corp_name}`)

    // 보고서 타입 분류
    const reportType = this.classifyMajorStockReportType(item.report_tp, item.report_resn)

    // 지분율 파싱 (안전한 숫자 변환)
    const afterHolding = this.parseNumericValue(item.stkrt, 0, true)
    const beforeHolding = this.calculateBeforeHolding(afterHolding, item.report_resn)
    const changeAmount = afterHolding - beforeHolding

    // 보고자 정보 정제
    const reporterName = this.sanitizeReporterName(item.reporter)
    const changeReason = this.normalizeChangeReason(item.report_resn)

    return {
      corpCode: item.corp_code,
      corpName: item.corp_name,
      stockCode: '', // majorstock API에서 제공하지 않음
      reportDate: this.formatDateString(item.rcept_dt),
      reporterName,
      holdingRatio: afterHolding,
      holdingShares: this.parseNumericValue(item.stkqy, 0, true),
      changeRatio: changeAmount,
      changeShares: this.calculateChangeShares(item.stkqy, changeAmount, afterHolding),
      changeReason,
      reportType,
      isSignificant: this.isSignificantChange(afterHolding, changeAmount),
      receiptNumber: item.rcept_no,
      reportTypeCode: item.report_tp
    }
  }

  /**
   * 접수번호 정규화 (하이픈 제거)
   */
  static normalizeReceiptNumber(receiptNumber: string): string {
    return receiptNumber.replace(/-/g, '')
  }

  /**
   * 날짜 문자열 포맷팅 (YYYYMMDD → YYYY-MM-DD)
   */
  static formatDateString(dateStr: string): string {
    if (!dateStr || dateStr.length !== 8) {
      return dateStr
    }
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  /**
   * 대량보유 보고서 타입 분류
   */
  private static classifyMajorStockReportType(reportTp: string, reportResn?: string): string {
    // 보고구분별 분류
    switch (reportTp) {
      case 'A':
        return 'initial_report'      // 최초 보고
      case 'B':
        return 'change_report'       // 변동 보고
      case 'C':
        return 'contract_report'     // 계약 보고
      default:
        break
    }

    // 보고사유로 세부 분류
    if (reportResn) {
      const reason = reportResn.toLowerCase()
      if (reason.includes('취득') || reason.includes('매수')) {
        return 'acquisition'
      } else if (reason.includes('처분') || reason.includes('매도')) {
        return 'disposal'
      } else if (reason.includes('계약') || reason.includes('담보')) {
        return 'contract'
      }
    }

    return 'other_stock'
  }

  /**
   * 변동사유 정규화
   */
  private static normalizeChangeReason(reportResn?: string): string {
    if (!reportResn) return 'Unknown'

    const reason = reportResn.trim()

    // 일반적인 변동사유 정규화
    const reasonMappings: Record<string, string> = {
      '취득': 'Acquisition',
      '처분': 'Disposal',
      '매수': 'Purchase',
      '매도': 'Sale',
      '증여': 'Gift',
      '상속': 'Inheritance',
      '계약': 'Contract',
      '담보제공': 'Collateral',
      '담보해지': 'Collateral Release'
    }

    for (const [korean, english] of Object.entries(reasonMappings)) {
      if (reason.includes(korean)) {
        return english
      }
    }

    return reason
  }

  /**
   * 보고자명 정제 (불필요한 문자 제거)
   */
  private static sanitizeReporterName(reporter?: string): string {
    if (!reporter) return 'Unknown'

    return reporter
      .trim()
      .replace(/\s+/g, ' ')           // 연속 공백 제거
      .replace(/[^\w\s가-힣().,\-]/g, '') // 특수문자 제거 (일부 허용)
      .substring(0, 100)              // 길이 제한
  }

  /**
   * 안전한 숫자 파싱
   */
  private static parseNumericValue(
    value: string | undefined,
    defaultValue: number = 0,
    removeCommas: boolean = false
  ): number {
    if (!value || value.trim() === '' || value === '-') {
      return defaultValue
    }

    try {
      let cleanValue = value.trim()
      if (removeCommas) {
        cleanValue = cleanValue.replace(/,/g, '')
      }

      const parsed = parseFloat(cleanValue)
      return isNaN(parsed) ? defaultValue : parsed
    } catch {
      return defaultValue
    }
  }

  /**
   * 이전 보유비율 계산 (변동사유 기반 추정)
   */
  private static calculateBeforeHolding(afterHolding: number, reportResn?: string): number {
    if (!reportResn) return 0

    // 최초 보고인 경우
    if (reportResn.includes('최초') || reportResn.includes('신규')) {
      return 0
    }

    // 완전 처분인 경우  
    if (reportResn.includes('전량처분') || reportResn.includes('완전처분')) {
      return afterHolding > 0 ? afterHolding * 2 : 5 // 추정값
    }

    // 일반적인 경우 - 현재 보유비율의 90% 수준으로 추정
    return afterHolding * 0.9
  }

  /**
   * 변동 주식수 계산
   */
  private static calculateChangeShares(
    totalShares: string | undefined,
    changeRatio: number,
    currentRatio: number
  ): number {
    const shares = this.parseNumericValue(totalShares, 0, true)
    if (shares === 0 || currentRatio === 0) return 0

    // 변동비율에 따른 주식수 계산
    return Math.round((shares * changeRatio) / currentRatio)
  }

  /**
   * 중요한 지분 변동인지 판단
   */
  private static isSignificantChange(holdingRatio: number, changeAmount: number): boolean {
    // 5% 이상 보유하거나 1% 이상 변동인 경우 중요한 변동으로 분류
    return holdingRatio >= 5.0 || Math.abs(changeAmount) >= 1.0
  }
}

// 타입 확장을 위한 인터페이스
export interface TransformedStockHolding extends DartStockHoldingData {
  reportType: string
  isSignificant: boolean
  receiptNumber: string
  reportTypeCode: string
}