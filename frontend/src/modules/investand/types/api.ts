// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  timestamp?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// Fear & Greed Index Types
export interface FearGreedIndex {
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
  updatedAt: string
}

export interface FearGreedHistory {
  date: string
  value: number
  level: string
  components: {
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }
}

// Market Data Types
export interface KospiData {
  date: string
  change: number
  changePercent: number
  volume: string
  updatedAt: string
}

export interface SystemStatus {
  system: {
    status: string
    timestamp: string
  }
  latestData: {
    fearGreedIndex: {
      date: string
      value: number
      level: string
    } | null
    kospiIndex: {
      date: string
      change: number
    } | null
  }
  recentCollections: number
}

export interface CollectionStatus {
  date: string
  source: string
  dataType: string
  status: string
  recordCount: number
  errorMessage: string | null
  createdAt: string
}

// Data Collection Types
export interface CollectionResult {
  source: string
  status: 'SUCCESS' | 'FAILED'
  message: string
  duration?: number
  recordCount?: number
}

export interface FearGreedCalculationResult {
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

// Admin API Types
export interface AdminUser {
  id: string
  username: string
  role: string
  permissions: string[]
  lastLogin: string
  createdAt: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  token: string
  user: AdminUser
  expiresIn: number
}

// Error Types
export interface ApiError {
  success: false
  message: string
  code?: string
  details?: any
  timestamp: string
}

// DART Types
export interface DartDisclosure {
  id: string
  corpCls: string
  corpName: string
  corpCode: string
  stockCode: string
  reportNm: string
  rcpNo: string
  flrNm: string
  rcpDt: string
  rmk: string
  pblntfTy: string
  pblntfDt: string
  sentimentScore: number
  relevanceScore: number
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  keywords: string[]
  summary: string
  createdAt: string
  updatedAt: string
}

export interface DartBatchResult {
  totalDisclosures: number
  processedCount: number
  successCount: number
  failedCount: number
  stockDisclosures: DartDisclosure[]
  errors: string[]
}

// Utility Types
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RequestConfig {
  method: ApiMethod
  url: string
  data?: any
  params?: Record<string, any>
  headers?: Record<string, string>
}