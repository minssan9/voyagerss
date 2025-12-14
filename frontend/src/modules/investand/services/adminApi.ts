import { api } from '@/boot/axios'

// Admin API 응답 타입 정의
export interface DataCollectionRequest {
  date: string
  sources: string[]
}

export interface DataCollectionResult {
  source: string
  status: 'SUCCESS' | 'FAILED'
  message: string
}

export interface DataCollectionResponse {
  date: string
  results: DataCollectionResult[]
}

export interface CalculateIndexRequest {
  date: string
}

export interface CalculateIndexResponse {
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

export interface AdminUser {
  id: string
  username: string
  role: 'admin' | 'viewer'
  lastLogin: string
  permissions: string[]
}

export interface SignupRequest {
  username: string
  password: string
  email: string
  firstName?: string
  lastName?: string
  role?: 'VIEWER' | 'ANALYST' | 'ADMIN' | 'SUPER_ADMIN'
}

export interface SignupResponse {
  user: {
    id: string
    username: string
    email: string
    role: string
    firstName?: string
    lastName?: string
    isActive: boolean
    createdAt: string
  }
}

// DART Admin Types
export interface DartBatchRequest {
  date: string
  options?: {
    sentimentOnly?: boolean
  }
}

export interface DartFinancialBatchRequest {
  businessYear: string
}

export interface DartBatchResponse {
  jobId: string
  message: string
}

// Fear & Greed Admin Types
export interface FearGreedCalculationRequest {
  date: string
}

export interface FearGreedRangeRequest {
  startDate: string
  endDate: string
}

export interface FearGreedRangeResponse {
  date: string
  value: number
  level: string
  status: 'success' | 'failed'
  message?: string
}

// Admin API 서비스
export const adminApi = {
  // 인증 관련
  async login(username: string, password: string): Promise<{ token: string; user: AdminUser }> {
    try {
      const response = await api.post<{
        success: boolean;
        data: { token: string; user: AdminUser };
        message: string;
        code?: string;
      }>('/admin/login', { username, password })

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '로그인에 실패했습니다.')
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('로그인에 실패했습니다.')
    }
  },

  async validateToken(token: string): Promise<AdminUser> {
    try {
      const response = await api.post<{
        success: boolean;
        data: { user: AdminUser };
        message: string;
        code?: string;
      }>('/admin/validate-token', { token })

      if (response.data.success) {
        return response.data.data.user
      } else {
        throw new Error(response.data.message || '토큰 검증에 실패했습니다.')
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('토큰 검증에 실패했습니다.')
    }
  },

  async signup(request: SignupRequest): Promise<SignupResponse> {
    try {
      const response = await api.post<{
        success: boolean;
        data: SignupResponse;
        message: string;
        code?: string;
      }>('/admin/signup', request)

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '계정 생성에 실패했습니다.')
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('계정 생성에 실패했습니다.')
    }
  },

  // 데이터 수집 관리
  async collectData(request: DataCollectionRequest): Promise<DataCollectionResponse> {
    try {
      const response = await api.post<{ success: boolean; data: DataCollectionResponse }>(
        '/admin/collect-data', 
        request
      )
      return response.data.data
    } catch (error) {
      console.error('Data collection failed:', error)
      throw new Error('데이터 수집에 실패했습니다.')
    }
  },

  // Fear & Greed 계산 관리
  async calculateIndex(request: CalculateIndexRequest): Promise<CalculateIndexResponse> {
    try {
      const response = await api.post<{ success: boolean; data: CalculateIndexResponse }>(
        '/admin/calculate-index',
        request
      )
      return response.data.data
    } catch (error) {
      console.error('Index calculation failed:', error)
      throw new Error('Fear & Greed Index 계산에 실패했습니다.')
    }
  },

  async recalculateRange(startDate: string, endDate: string): Promise<any[]> {
    try {
      const response = await api.post<{ success: boolean; data: any[] }>(
        '/admin/recalculate-range',
        { startDate, endDate }
      )
      return response.data.data
    } catch (error) {
      console.error('Range recalculation failed:', error)
      throw new Error('범위 재계산에 실패했습니다.')
    }
  },

  // DART 관리 기능
  async scheduleDartDailyBatch(request: DartBatchRequest): Promise<DartBatchResponse> {
    try {
      const response = await api.post<{ success: boolean; data: DartBatchResponse }>(
        '/admin/dart/batch/daily',
        request
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('DART 일별 배치 예약에 실패했습니다.')
    }
  },

  async scheduleDartFinancialBatch(request: DartFinancialBatchRequest): Promise<DartBatchResponse> {
    try {
      const response = await api.post<{ success: boolean; data: DartBatchResponse }>(
        '/admin/dart/batch/financial',
        request
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('DART 재무 배치 예약에 실패했습니다.')
    }
  },

  async getDartBatchStatus(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/admin/dart/batch/status'
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('DART 배치 상태 조회에 실패했습니다.')
    }
  },

  async getDartHealth(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/admin/dart/health'
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('DART 헬스 체크에 실패했습니다.')
    }
  },

  async getDartStats(date?: string): Promise<any> {
    try {
      const queryParams = date ? `?date=${date}` : ''
      const response = await api.get<{ success: boolean; data: any }>(
        `/admin/dart/stats${queryParams}`
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('DART 통계 조회에 실패했습니다.')
    }
  },

  // Fear & Greed 관리 기능
  async calculateFearGreedIndex(request: FearGreedCalculationRequest): Promise<CalculateIndexResponse> {
    try {
      const response = await api.post<{ success: boolean; data: CalculateIndexResponse }>(
        '/admin/calculate-index',
        request
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('Fear & Greed Index 계산에 실패했습니다.')
    }
  },

  async recalculateFearGreedRange(request: FearGreedRangeRequest): Promise<FearGreedRangeResponse[]> {
    try {
      const response = await api.post<{ success: boolean; data: { results: FearGreedRangeResponse[] } }>(
        '/admin/recalculate-range',
        request
      )
      return response.data.data.results
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('Fear & Greed Index 범위 재계산에 실패했습니다.')
    }
  },

  async getFearGreedCurrent(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/fear-greed/current'
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('현재 Fear & Greed Index 조회에 실패했습니다.')
    }
  },

  async getFearGreedHistory(days: number = 30): Promise<any[]> {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>(
        `/fear-greed/history?days=${days}`
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('Fear & Greed Index 히스토리 조회에 실패했습니다.')
    }
  },

  async getFearGreedStats(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/fear-greed/stats'
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('Fear & Greed Index 통계 조회에 실패했습니다.')
    }
  },

  // 시스템 모니터링 기능
  async getSystemHealth(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/admin/system-health'
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('시스템 상태 조회에 실패했습니다.')
    }
  },

  async getPerformanceMetrics(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/admin/performance-metrics'
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('성능 지표 조회에 실패했습니다.')
    }
  },

  async getSystemInfo(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/admin/system-info'
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('시스템 정보 조회에 실패했습니다.')
    }
  },

  async getLogs(limit: number = 50, level: string = 'all'): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        `/admin/logs?limit=${limit}&level=${level}`
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('로그 조회에 실패했습니다.')
    }
  },

  // 시스템 관리 기능
  async restartService(service: string): Promise<any> {
    try {
      const response = await api.post<{ success: boolean; data: any }>(
        '/admin/restart-service',
        { service }
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('서비스 재시작에 실패했습니다.')
    }
  },

  async clearCache(): Promise<any> {
    try {
      const response = await api.post<{ success: boolean; data: any }>(
        '/admin/clear-cache'
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('캐시 삭제에 실패했습니다.')
    }
  },

  async getSystemConfig(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/admin/system-config'
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('시스템 설정 조회에 실패했습니다.')
    }
  },

  async updateSystemConfig(config: any): Promise<any> {
    try {
      const response = await api.put<{ success: boolean; data: any }>(
        '/admin/system-config',
        { config }
      )
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw new Error('시스템 설정 업데이트에 실패했습니다.')
    }
  }
}

export default adminApi