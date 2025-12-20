import service from '@/api/axios-voyagerss'
import { apiClient } from './apiClient'
import type {
  FearGreedIndex as FearGreedIndexType,
  FearGreedHistory,
  KospiData
} from '@/types/investand/api'

// Legacy compatibility - re-export types
export interface FearGreedIndex {
  value: number
  level: string
  date: string
  components: {
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }
}

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

export interface HistoryData {
  date: string
  value: number
  level: string
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

// Enhanced Fear & Greed API with proper backend integration
export const fearGreedApi = {
  // 현재 Fear & Greed Index 가져오기 (new backend integration)
  async getCurrentIndex(): Promise<FearGreedIndex> {
    try {
      const data = await apiClient.getFearGreedLatest()
      return {
        value: data.value,
        level: data.level,
        date: data.date,
        components: data.components
      }
    } catch (error) {
      console.warn('Failed to fetch current index, using fallback:', error)
      return {
        value: 45,
        level: 'Fear',
        date: new Date().toISOString().split('T')[0],
        components: {
          priceMomentum: 42,
          investorSentiment: 38,
          putCallRatio: 55,
          volatilityIndex: 48,
          safeHavenDemand: 52
        }
      }
    }
  },

  // 히스토리 데이터 가져오기 (new backend integration)
  async getHistoryData(days: number = 30): Promise<HistoryData[]> {
    try {
      const data = await apiClient.getFearGreedHistory(days)
      return data.map(item => ({
        date: item.date,
        value: item.value,
        level: item.level
      }))
    } catch (error) {
      console.warn('Failed to fetch history data, using fallback:', error)
      const sampleData: HistoryData[] = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        sampleData.push({
          date: date.toISOString().split('T')[0],
          value: Math.floor(Math.random() * 40) + 30,
          level: 'Fear'
        })
      }
      return sampleData
    }
  },

  // 특정 날짜의 Fear & Greed Index 조회
  async getIndexByDate(date: string): Promise<HistoryData | null> {
    try {
      const response = await service.get<{ success: boolean; data: HistoryData }>(`/fear-greed/date/${date}`)
      return response.data.data
    } catch (error) {
      return null
    }
  }
}

// 시장 데이터 API
export const marketApi = {
  // KOSPI 데이터 가져오기
  async getKospiData() {
    try {
      const response = await service.get<{ success: boolean; data: MarketData['kospi'] }>('/data/kospi')
      return response.data.data
    } catch (error) {
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
      const response = await service.get<{ success: boolean; data: MarketData['kosdaq'] }>('/data/kosdaq')
      return response.data.data
    } catch (error) {
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
      const response = await service.get<{ success: boolean; data: MarketData }>('/data/market')
      return response.data.data
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

// Enhanced System API with proper backend integration
export const systemApi = {
  // 시스템 상태 조회 (new backend integration)
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      return await apiClient.getSystemStatus()
    } catch (error) {
      console.warn('Failed to fetch system status, using fallback:', error)
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

  // 데이터 수집 상태 조회 (new backend integration)
  async getCollectionStatus(days: number = 7): Promise<CollectionStatus[]> {
    try {
      return await apiClient.getCollectionStatus(days)
    } catch (error) {
      console.warn('Failed to fetch collection status, using fallback:', error)
      return []
    }
  },

  // Health check
  async healthCheck() {
    try {
      return await apiClient.healthCheck()
    } catch (error) {
      console.warn('Health check failed:', error)
      throw error
    }
  }
}

// Export enhanced API client for direct usage
export { apiClient }
export default service

