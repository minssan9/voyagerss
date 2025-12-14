import { api } from '@/boot/axios'

// DART API Types
export interface DartDisclosure {
  corpCode: string
  corpName: string
  stockCode: string
  reportName: string
  receiptNumber: string
  flrName: string
  receiptDate: string
  remarks: string
  disclosureDate: string
  reportCode: string
}

export interface DartDisclosuresResponse {
  disclosures: DartDisclosure[]
  total: number
  params: {
    startDate: string
    endDate: string
    corpCode: string | null
    reportCode: string | null
    sentimentOnly: boolean
    page: number
    limit: number
  }
}

export interface DartCompanyInfo {
  corpCode: string
  corpName: string
  stockCode: string
  modifyDate: string
}

export interface DartFinancialInfo {
  corpCode: string
  corpName: string
  businessYear: string
  reportCode: string
  fsDiv: string
  data: any[]
}

export interface DartHealthStatus {
  isOperational: boolean
  rateLimit: string
  timestamp: string
  lastError: string | null
}

export interface DartBatchStatus {
  isRunning: boolean
  jobCount: number
  lastJobId: string
  lastUpdate: string
}

export interface DartStats {
  date: string
  totalDisclosures: number
  sentimentRelevant: number
  apiCalls: number
  successRate: number
  averageResponseTime: number
}

export interface DartBatchResult {
  jobId: string
  message: string
}

export interface DartTestResult {
  testType: string
  testDate: string
  data: any
}

export interface DartStockHolding {
  id: number
  receiptNumber?: string
  receiptDate?: string
  corpCode: string
  corpName: string
  stockCode?: string
  reportType?: string
  reporterName: string
  holdingShares?: string
  changeShares?: string
  holdingRatio?: string
  changeRatio?: string
  majorTransactionShares?: string
  majorTransactionRatio?: string
  reportReason?: string
  changeReason?: string
  reportDate?: string
  createdAt: string
}

export interface DartStockHoldingsResponse {
  holdings: DartStockHolding[]
  total: number
  page: number
  limit: number
  totalPages: number
  params: {
    corpCode?: string | null
    corpName?: string | null
    startDate: string
    endDate: string
    reporterName?: string | null
    changeReason?: string | null
    reportReason?: string | null
    page: number
    limit: number
  }
}

// DART API Service
export const dartApi = {
  // 공시 데이터 조회
  async getDisclosures(params: {
    startDate: string
    endDate: string
    corpCode?: string
    reportCode?: string
    sentimentOnly?: boolean
    page?: number
    limit?: number
  }): Promise<DartDisclosuresResponse> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('startDate', params.startDate)
      queryParams.append('endDate', params.endDate)
      
      if (params.corpCode) queryParams.append('corpCode', params.corpCode)
      if (params.reportCode) queryParams.append('reportCode', params.reportCode)
      if (params.sentimentOnly) queryParams.append('sentimentOnly', 'true')
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.limit) queryParams.append('limit', params.limit.toString())

      const response = await api.get<{ success: boolean; data: DartDisclosuresResponse }>(
        `/dart/disclosures?${queryParams.toString()}`
      )
      return response.data.data
    } catch (error) {
      console.error('DART disclosures fetch failed:', error)
      throw new Error('공시 데이터 조회에 실패했습니다.')
    }
  },

  // 기업 정보 조회
  async getCompanyInfo(corpCode: string): Promise<DartCompanyInfo> {
    try {
      const response = await api.get<{ success: boolean; data: DartCompanyInfo }>(
        `/dart/companies?corpCode=${corpCode}`
      )
      return response.data.data
    } catch (error) {
      console.error('DART company info fetch failed:', error)
      throw new Error('기업 정보 조회에 실패했습니다.')
    }
  },

  // 재무 정보 조회
  async getFinancialInfo(params: {
    corpCode: string
    businessYear: string
    reportCode?: string
    fsDiv?: string
  }): Promise<DartFinancialInfo> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('corpCode', params.corpCode)
      queryParams.append('businessYear', params.businessYear)
      if (params.reportCode) queryParams.append('reportCode', params.reportCode)
      if (params.fsDiv) queryParams.append('fsDiv', params.fsDiv)

      const response = await api.get<{ success: boolean; data: DartFinancialInfo }>(
        `/dart/financial?${queryParams.toString()}`
      )
      return response.data.data
    } catch (error) {
      console.error('DART financial info fetch failed:', error)
      throw new Error('재무 정보 조회에 실패했습니다.')
    }
  },

  // KOSPI 200 구성 종목 조회
  async getKospi200(): Promise<{ corpCodes: string[]; count: number; description: string }> {
    try {
      const response = await api.get<{ success: boolean; data: { corpCodes: string[]; count: number; description: string } }>(
        '/dart/kospi200'
      )
      return response.data.data
    } catch (error) {
      console.error('DART KOSPI 200 fetch failed:', error)
      throw new Error('KOSPI 200 목록 조회에 실패했습니다.')
    }
  },

  // DART API 헬스 체크
  async checkHealth(): Promise<DartHealthStatus> {
    try {
      const response = await api.get<{ success: boolean; data: DartHealthStatus }>(
        '/dart/health'
      )
      return response.data.data
    } catch (error) {
      console.error('DART health check failed:', error)
      throw new Error('DART API 헬스 체크에 실패했습니다.')
    }
  },

  // DART 수집 통계 조회
  async getStats(date?: string): Promise<DartStats> {
    try {
      const queryParams = date ? `?date=${date}` : ''
      const response = await api.get<{ success: boolean; data: DartStats }>(
        `/dart/stats${queryParams}`
      )
      return response.data.data
    } catch (error) {
      console.error('DART stats fetch failed:', error)
      throw new Error('DART 통계 조회에 실패했습니다.')
    }
  },

  // 배치 서비스 상태 조회
  async getBatchStatus(): Promise<DartBatchStatus> {
    try {
      const response = await api.get<{ success: boolean; data: DartBatchStatus }>(
        '/dart/batch/status'
      )
      return response.data.data
    } catch (error) {
      console.error('DART batch status fetch failed:', error)
      throw new Error('배치 서비스 상태 조회에 실패했습니다.')
    }
  },

  // 일별 공시 배치 수집 예약
  async scheduleDailyBatch(date: string, options: { sentimentOnly?: boolean } = {}): Promise<DartBatchResult> {
    try {
      const response = await api.post<{ success: boolean; data: DartBatchResult }>(
        '/dart/batch/daily',
        { date, options }
      )
      return response.data.data
    } catch (error) {
      console.error('DART daily batch schedule failed:', error)
      throw new Error('일별 공시 배치 예약에 실패했습니다.')
    }
  },

  // 수동 DART 배치 수집 (즉시 실행)
  async runManualBatch(date: string, maxPages: number = 50, pageSize: number = 100): Promise<{
    date: string
    totalDisclosures: number
    savedDisclosures: number
    summary: {
      maxPages: number
      pageSize: number
      timestamp: string
    }
  }> {
    try {
      const response = await api.post<{ success: boolean; message: string; data: any }>(
        '/dart/batch/daily',
        { date, maxPages, pageSize }
      )
      return response.data.data
    } catch (error) {
      console.error('DART manual batch failed:', error)
      throw new Error('수동 DART 배치 수집에 실패했습니다.')
    }
  },

  // 재무 데이터 배치 수집 예약
  async scheduleFinancialBatch(businessYear: string): Promise<DartBatchResult> {
    try {
      const response = await api.post<{ success: boolean; data: DartBatchResult }>(
        '/dart/batch/financial',
        { businessYear }
      )
      return response.data.data
    } catch (error) {
      console.error('DART financial batch schedule failed:', error)
      throw new Error('재무 데이터 배치 예약에 실패했습니다.')
    }
  },

  // DART 수집기 테스트
  async testCollection(testType: 'disclosures' | 'kospi200' | 'filter' | 'basic', date?: string): Promise<DartTestResult> {
    try {
      const testDate = date || new Date().toISOString().split('T')[0]
      const response = await api.post<{ success: boolean; testType: string; testDate: string; data: any }>(
        '/dart/test',
        { testType, date: testDate }
      )
      return {
        testType: response.data.testType,
        testDate: response.data.testDate,
        data: response.data.data
      }
    } catch (error) {
      console.error('DART test failed:', error)
      throw new Error('DART 테스트에 실패했습니다.')
    }
  },

  // 주식 보유현황 데이터 조회
  async getStockHoldings(params: {
    startDate: string
    endDate: string
    corpCode?: string
    corpName?: string
    reporterName?: string
    changeReason?: string
    reportReason?: string
    page?: number
    limit?: number
  }): Promise<DartStockHoldingsResponse> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('startDate', params.startDate)
      queryParams.append('endDate', params.endDate)
      
      if (params.corpCode) queryParams.append('corpCode', params.corpCode)
      if (params.corpName) queryParams.append('corpName', params.corpName)
      if (params.reporterName) queryParams.append('reporterName', params.reporterName)
      if (params.changeReason) queryParams.append('changeReason', params.changeReason)
      if (params.reportReason) queryParams.append('reportReason', params.reportReason)
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.limit) queryParams.append('limit', params.limit.toString())

      const response = await api.get<{ success: boolean; data: DartStockHoldingsResponse }>(
        `/dart/stock-holdings?${queryParams.toString()}`
      )
      return response.data.data
    } catch (error) {
      console.error('DART stock holdings fetch failed:', error)
      throw new Error('주식 보유현황 데이터 조회에 실패했습니다.')
    }
  }
}

export default dartApi
