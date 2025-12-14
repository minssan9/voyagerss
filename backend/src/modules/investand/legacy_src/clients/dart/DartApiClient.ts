import axios from 'axios'
import type { 
  DartDisclosureData, 
  DartMajorStockResponse, 
  DartMajorStockItem,
  DartExecutiveStockResponse,
  DartExecutiveStockItem,
  DartBatchRequest,
  DartDisclosureRawResponse
} from '@/types/collectors/dartTypes'
import { DartTypesMapper } from '@/clients/dart/DartTypesMapper'
import { logger } from '@/utils/common/logger'
import { retryWithBackoff } from '@/utils/common/retryUtils'

/**
 * DART (전자공시시스템) API 클라이언트
 * 순수 API 호출 로직만 담당
 */
export class DartApiClient {
  // Static Configuration
  private static readonly BASE_URL = 'https://opendart.fss.or.kr/api'
  private static readonly API_KEY = process.env.DART_API_KEY || ''
  private static readonly TIMEOUT = 30000 // 30초
  private static readonly RATE_LIMIT_DELAY = 100 // 100ms between requests
  private static readonly MAX_RETRIES = 3

  // State Management
  private static lastRequestTime = 0

  // ================================
  // PUBLIC API METHODS
  // ================================

  /**
   * 지분공시 조회 (list.json) - pblntf_ty='D' 고정
   */
  static async fetchDisclosures(request: DartBatchRequest): Promise<DartDisclosureData[]> {
    logger.info(`[DART API] 지분공시 조회: ${request.startDate} ~ ${request.endDate}`)

    const params = {
      crtfc_key: this.API_KEY,
      bgn_de: request.startDate.replace(/-/g, ''),
      end_de: request.endDate.replace(/-/g, ''),
      corp_code: request.corpCode,
      pblntf_ty: 'D', // 지분공시만 수집
      page_no: request.pageNo || 1,
      page_count: Math.min(request.pageCount || 100, 100)
    }

    const response = await this.makeAPICall<DartDisclosureRawResponse>('list', params)
    
    // Raw snake_case API response → camelCase TypeScript interface transformation
    if (response?.list && response.list.length > 0) {
      logger.info(`[DART API] 지분공시 조회 완료: ${response.list.length}건 → 필드 매핑 적용`)
      return response.list.map(item => DartTypesMapper.transformDisclosureData(item))
    }
    
    return []
  }

  /**
   * 대량보유 현황 조회 (majorstock.json)
   */
  static async fetchMajorStockHoldings(corpCode: string): Promise<{
    success: boolean
    holdings: DartMajorStockItem[]
    error?: string
  }> {
    logger.info(`[DART API] 대량보유 현황 조회: ${corpCode}`)

    try {
      const params = {
        crtfc_key: this.API_KEY,
        corp_code: corpCode
      }

      const response = await this.makeAPICall<DartMajorStockResponse>('majorstock', params)
      
      if (response && response.list && response.list.length > 0) {
        logger.info(`[DART API] 대량보유 현황 조회 완료: ${corpCode} - ${response.list.length}건`)
        return {
          success: true,
          holdings: response.list
        }
      } else {
        return {
          success: false,
          holdings: [],
          error: '조회된 데이터가 없습니다'
        }
      }
    } catch (error) {
      logger.error(`[DART API] 대량보유 현황 조회 실패: ${corpCode}`, error)
      return {
        success: false,
        holdings: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 임원·주요주주 소유현황 조회 (elestock.json)
   */
  static async fetchExecutiveStockOwnership(corpCode: string): Promise<{
    success: boolean
    executives: DartExecutiveStockItem[]
    error?: string
  }> {
    logger.info(`[DART API] 임원·주요주주 소유현황 조회: ${corpCode}`)

    try {
      const params = {
        crtfc_key: this.API_KEY,
        corp_code: corpCode
      }

      const response = await this.makeAPICall<DartExecutiveStockResponse>('elestock', params)
      
      if (response && response.list && response.list.length > 0) {
        logger.info(`[DART API] 임원·주요주주 소유현황 조회 완료: ${corpCode} - ${response.list.length}건`)
        return {
          success: true,
          executives: response.list
        }
      } else {
        return {
          success: false,
          executives: [],
          error: '조회된 데이터가 없습니다'
        }
      }
    } catch (error) {
      logger.error(`[DART API] 임원·주요주주 소유현황 조회 실패: ${corpCode}`, error)
      return {
        success: false,
        executives: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // ================================
  // PRIVATE HELPER METHODS  
  // ================================

  /**
   * Rate limiting 적용
   */
  private static async rateLimitDelay(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const delayTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, delayTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  /**
   * DART API 호출 (retry 로직 포함) - JSON만 지원
   */
  private static async makeAPICall<T>(
    endpoint: string,
    params: Record<string, any>
  ): Promise<T> {
    // Rate limiting 적용
    await this.rateLimitDelay()

    const operation = async (): Promise<T> => {
      try {
        const url = `${this.BASE_URL}/${endpoint}.json`
        
        // Log the final URL with params for debugging
        const finalUrl = new URL(url)
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            finalUrl.searchParams.append(key, String(value))
          }
        })
        logger.info(`[DART API] Final URL: ${finalUrl.toString()}`)
        
        const response = await axios.get(url, {
          params,
          timeout: this.TIMEOUT,
          responseType: 'json',
          validateStatus: (status) => status === 200
        })

        // JSON 응답 처리
        const data = response.data
        
        // DART API 에러 응답 체크
        if (data?.status === '000') {
          return data as T
        } else if (data?.status) {
          throw new Error(`DART API Error: ${data.message || 'Unknown error'}`)
        }

        return data as T

      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED') {
            throw new Error(`API call timeout: ${endpoint}`)
          } else if (error.response?.status === 429) {
            throw new Error(`Rate limit exceeded: ${endpoint}`)
          } else {
            throw new Error(`HTTP ${error.response?.status}: ${error.message}`)
          }
        }
        throw error
      }
    }

    return retryWithBackoff(operation, this.MAX_RETRIES)
  }

  // ================================
  // VALIDATION & ERROR HANDLING
  // ================================

  /**
   * API 키 유효성 검증
   */
  static validateApiKey(): boolean {
    if (!this.API_KEY || this.API_KEY.length === 0) {
      logger.error('[DART API] API 키가 설정되지 않았습니다')
      return false
    }
    return true
  }

  /**
   * 날짜 형식 검증
   */
  static validateDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    return dateRegex.test(date)
  }

  /**
   * 기업 코드 형식 검증
   */
  static validateCorpCode(corpCode: string): boolean {
    const corpCodeRegex = /^[0-9]{8}$/
    return corpCodeRegex.test(corpCode)
  }
}