import { api } from '@/boot/axios'
import { 
  ApiResponse, 
  FearGreedIndex, 
  FearGreedHistory, 
  KospiData, 
  SystemStatus, 
  CollectionStatus, 
  CollectionResult, 
  FearGreedCalculationResult,
  DartBatchResult,
  LoginRequest,
  LoginResponse,
  ApiError
} from '@/types/api'

// Error handling utility
class ApiClientError extends Error {
  constructor(
    message: string, 
    public statusCode?: number, 
    public response?: any
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

// Base API client with error handling
class ApiClient {
  private async handleRequest<T>(requestFn: () => Promise<any>): Promise<T> {
    try {
      const response = await requestFn()
      return response.data
    } catch (error: any) {
      console.error('API request failed:', error)
      
      if (error.response) {
        const status = error.response.status
        const data = error.response.data
        
        throw new ApiClientError(
          data?.message || `HTTP ${status} Error`,
          status,
          data
        )
      }
      
      if (error.request) {
        throw new ApiClientError('Network error - no response received')
      }
      
      throw new ApiClientError(error.message || 'Unknown API error')
    }
  }

  // Fear & Greed Index endpoints
  async getFearGreedLatest(): Promise<FearGreedIndex> {
    return this.handleRequest<ApiResponse<FearGreedIndex>>(
      () => api.get('/fear-greed/latest')
    ).then(res => res.data)
  }

  async getFearGreedHistory(days: number = 30): Promise<FearGreedHistory[]> {
    return this.handleRequest<ApiResponse<FearGreedHistory[]>>(
      () => api.get(`/fear-greed/history?days=${days}`)
    ).then(res => res.data)
  }

  // Market data endpoints
  async getKospiLatest(): Promise<KospiData> {
    return this.handleRequest<ApiResponse<KospiData>>(
      () => api.get('/data/kospi/latest')
    ).then(res => res.data)
  }

  // System endpoints
  async getSystemStatus(): Promise<SystemStatus> {
    return this.handleRequest<ApiResponse<SystemStatus>>(
      () => api.get('/system/status')
    ).then(res => res.data)
  }

  async getCollectionStatus(days: number = 7): Promise<CollectionStatus[]> {
    return this.handleRequest<ApiResponse<CollectionStatus[]>>(
      () => api.get(`/system/collection-status?days=${days}`)
    ).then(res => res.data)
  }

  // Admin endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.handleRequest<LoginResponse>(
      () => api.post('/admin/login', credentials)
    )
  }

  async collectData(params: { 
    date?: string, 
    sources?: string[] 
  }): Promise<{ results: CollectionResult[] }> {
    return this.handleRequest<ApiResponse<{ results: CollectionResult[] }>>(
      () => api.post('/admin/collect-data', params)
    ).then(res => res.data)
  }

  async calculateFearGreed(date?: string): Promise<FearGreedCalculationResult> {
    return this.handleRequest<ApiResponse<FearGreedCalculationResult>>(
      () => api.post('/admin/recalculate-range', { startDate: date, endDate: date })
    ).then(res => res.data)
  }

  async collectDartData(params: {
    date?: string
    maxPages?: number
    pageSize?: number
    reportCode?: string
    dryRun?: boolean
  }): Promise<DartBatchResult> {
    return this.handleRequest<ApiResponse<DartBatchResult>>(
      () => api.post('/dart/collect', params)
    ).then(res => res.data)
  }

  // Health check
  async healthCheck(): Promise<{ status: string, timestamp: string }> {
    return this.handleRequest<{ status: string, timestamp: string }>(
      () => api.get('/health')
    )
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient()
export { ApiClientError }
export default apiClient