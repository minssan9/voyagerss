import service from '@/api/common/axios-voyagerss'

// Market Data Types
export interface MarketData {
  kospi: {
    current: number
    change: number
    changePercent: number
    volume: number
    marketCap: number
  }
  kosdaq: {
    current: number
    change: number
    changePercent: number
    volume: number
    marketCap: number | null
  }
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

// 시장 데이터 API
export const marketApi = {
  // KOSPI 데이터 가져오기
  async getKospiData() {
    try {
      const response = await service.get<{ success: boolean; data: MarketData['kospi'] }>('/investand/data/kospi')
      return response.data.data
    } catch (error) {
      console.warn('Failed to fetch KOSPI data, using fallback')
      return {
        current: 2485.67,
        change: -12.45,
        changePercent: -0.50,
        volume: 450000000,
        marketCap: 2000000000000
      }
    }
  },

  // KOSDAQ 데이터 가져오기
  async getKosdaqData() {
    try {
      const response = await service.get<{ success: boolean; data: MarketData['kosdaq'] }>('/investand/data/kosdaq')
      return response.data.data
    } catch (error) {
      console.warn('Failed to fetch KOSDAQ data, using fallback')
      return {
        current: 742.89,
        change: 5.23,
        changePercent: 0.71,
        volume: 350000000,
        marketCap: 500000000000
      }
    }
  },

  // 전체 시장 데이터 가져오기
  async getAllMarketData(): Promise<MarketData> {
    try {
      const [kospi, kosdaq] = await Promise.all([
        this.getKospiData(),
        this.getKosdaqData()
      ])
      return { kospi, kosdaq }
    } catch (error) {
      return {
        kospi: {
          current: 2485.67,
          change: -12.45,
          changePercent: -0.50,
          volume: 450000000,
          marketCap: 2000000000000
        },
        kosdaq: {
          current: 742.89,
          change: 5.23,
          changePercent: 0.71,
          volume: 350000000,
          marketCap: 500000000000
        }
      }
    }
  }
}

// 시스템 API
export const systemApi = {
  // 시스템 상태 조회
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const response = await service.get<{ success: boolean; data: SystemStatus }>('/investand/system/status')
      return response.data.data
    } catch (error) {
      console.warn('Failed to fetch system status, using fallback')
      return {
        system: {
          status: 'UNKNOWN',
          timestamp: new Date().toISOString()
        },
        latestData: {
          fearGreedIndex: null,
          kospiIndex: null
        },
        recentCollections: 0
      }
    }
  },

  // 데이터 수집 상태 조회
  async getCollectionStatus(days: number = 7): Promise<CollectionStatus[]> {
    try {
      const response = await service.get<{ success: boolean; data: CollectionStatus[] }>(`/investand/system/collection-status?days=${days}`)
      return response.data.data
    } catch (error) {
      console.warn('Failed to fetch collection status, using fallback')
      return []
    }
  },

  // Health check
  async healthCheck() {
    try {
      const response = await service.get<{ status: string; timestamp: string }>('/health')
      return response.data
    } catch (error) {
      console.warn('Health check failed')
      throw error
    }
  }
}

// Re-export other APIs for centralized access if needed
export * from './fearGreedApi'
export * from './dartApi'
export * from './adminApi'

export default service


