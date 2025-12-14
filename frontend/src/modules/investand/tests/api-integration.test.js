import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fearGreedApi, marketApi, systemApi } from '@/services/api'
import { apiClient } from '@/services/apiClient'

// Mock the apiClient
vi.mock('@/services/apiClient', () => ({
  apiClient: {
    getFearGreedLatest: vi.fn(),
    getFearGreedHistory: vi.fn(),
    getKospiLatest: vi.fn(),
    getSystemStatus: vi.fn(),
    getCollectionStatus: vi.fn(),
    healthCheck: vi.fn()
  }
}))

// Mock the api instance for fallback scenarios
vi.mock('@/boot/axios', () => ({
  api: {
    get: vi.fn()
  }
}))

describe('Frontend API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    console.warn = vi.fn()
  })

  describe('Fear & Greed API Integration', () => {
    it('should get current index from backend', async () => {
      const mockData = {
        value: 42,
        level: 'Fear',
        date: '2024-01-15',
        components: {
          priceMomentum: 40,
          investorSentiment: 35,
          putCallRatio: 50,
          volatilityIndex: 45,
          safeHavenDemand: 48
        }
      }

      apiClient.getFearGreedLatest.mockResolvedValue(mockData)

      const result = await fearGreedApi.getCurrentIndex()

      expect(apiClient.getFearGreedLatest).toHaveBeenCalled()
      expect(result).toEqual(mockData)
      expect(result.value).toBe(42)
      expect(result.level).toBe('Fear')
    })

    it('should fallback to mock data when backend fails', async () => {
      apiClient.getFearGreedLatest.mockRejectedValue(new Error('Network error'))

      const result = await fearGreedApi.getCurrentIndex()

      expect(apiClient.getFearGreedLatest).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith('Failed to fetch current index, using fallback:', expect.any(Error))
      expect(result).toHaveProperty('value', 45)
      expect(result).toHaveProperty('level', 'Fear')
      expect(result).toHaveProperty('components')
    })

    it('should get history data from backend', async () => {
      const mockData = [
        {
          date: '2024-01-15',
          value: 42,
          level: 'Fear'
        },
        {
          date: '2024-01-14',
          value: 38,
          level: 'Fear'
        }
      ]

      apiClient.getFearGreedHistory.mockResolvedValue(mockData)

      const result = await fearGreedApi.getHistoryData(7)

      expect(apiClient.getFearGreedHistory).toHaveBeenCalledWith(7)
      expect(result).toEqual(mockData.map(item => ({
        date: item.date,
        value: item.value,
        level: item.level
      })))
      expect(result).toHaveLength(2)
    })

    it('should fallback to sample data when history fetch fails', async () => {
      apiClient.getFearGreedHistory.mockRejectedValue(new Error('Backend error'))

      const result = await fearGreedApi.getHistoryData(5)

      expect(apiClient.getFearGreedHistory).toHaveBeenCalledWith(5)
      expect(console.warn).toHaveBeenCalledWith('Failed to fetch history data, using fallback:', expect.any(Error))
      expect(result).toHaveLength(5)
      expect(result[0]).toHaveProperty('date')
      expect(result[0]).toHaveProperty('value')
      expect(result[0]).toHaveProperty('level', 'Fear')
    })

    it('should use default days parameter', async () => {
      apiClient.getFearGreedHistory.mockResolvedValue([])

      await fearGreedApi.getHistoryData()

      expect(apiClient.getFearGreedHistory).toHaveBeenCalledWith(30)
    })
  })

  describe('Market API Integration', () => {
    it('should get KOSPI data with fallback', async () => {
      const result = await marketApi.getKospiData()

      expect(result).toHaveProperty('current')
      expect(result).toHaveProperty('change')
      expect(result).toHaveProperty('changePercent')
      expect(result).toHaveProperty('volume')
      expect(result).toHaveProperty('marketCap')
      expect(typeof result.current).toBe('number')
    })

    it('should get KOSDAQ data with fallback', async () => {
      const result = await marketApi.getKosdaqData()

      expect(result).toHaveProperty('current')
      expect(result).toHaveProperty('change')
      expect(result).toHaveProperty('changePercent')
      expect(result).toHaveProperty('volume')
      expect(result).toHaveProperty('marketCap')
      expect(typeof result.current).toBe('number')
    })

    it('should get all market data with fallback', async () => {
      const result = await marketApi.getAllMarketData()

      expect(result).toHaveProperty('kospi')
      expect(result).toHaveProperty('kosdaq')
      expect(result.kospi).toHaveProperty('current')
      expect(result.kosdaq).toHaveProperty('current')
    })
  })

  describe('System API Integration', () => {
    it('should get system status from backend', async () => {
      const mockData = {
        system: {
          status: 'HEALTHY',
          timestamp: '2024-01-15T12:00:00Z'
        },
        latestData: {
          fearGreedIndex: {
            date: '2024-01-15',
            value: 42,
            level: 'Fear'
          },
          kospiIndex: {
            date: '2024-01-15',
            change: -12.45
          }
        },
        recentCollections: 5
      }

      apiClient.getSystemStatus.mockResolvedValue(mockData)

      const result = await systemApi.getSystemStatus()

      expect(apiClient.getSystemStatus).toHaveBeenCalled()
      expect(result).toEqual(mockData)
      expect(result.system.status).toBe('HEALTHY')
      expect(result.recentCollections).toBe(5)
    })

    it('should fallback when system status fails', async () => {
      apiClient.getSystemStatus.mockRejectedValue(new Error('Backend error'))

      const result = await systemApi.getSystemStatus()

      expect(console.warn).toHaveBeenCalledWith('Failed to fetch system status, using fallback:', expect.any(Error))
      expect(result.system.status).toBe('UNKNOWN')
      expect(result.latestData.fearGreedIndex).toBeNull()
      expect(result.recentCollections).toBe(0)
    })

    it('should get collection status from backend', async () => {
      const mockData = [
        {
          date: '2024-01-15',
          source: 'KRX',
          dataType: 'KOSPI',
          status: 'SUCCESS',
          recordCount: 1,
          errorMessage: null,
          createdAt: '2024-01-15T09:00:00Z'
        }
      ]

      apiClient.getCollectionStatus.mockResolvedValue(mockData)

      const result = await systemApi.getCollectionStatus(7)

      expect(apiClient.getCollectionStatus).toHaveBeenCalledWith(7)
      expect(result).toEqual(mockData)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('KRX')
    })

    it('should fallback when collection status fails', async () => {
      apiClient.getCollectionStatus.mockRejectedValue(new Error('Backend error'))

      const result = await systemApi.getCollectionStatus(7)

      expect(console.warn).toHaveBeenCalledWith('Failed to fetch collection status, using fallback:', expect.any(Error))
      expect(result).toEqual([])
    })

    it('should perform health check', async () => {
      const mockData = {
        status: 'healthy',
        timestamp: '2024-01-15T12:00:00Z'
      }

      apiClient.healthCheck.mockResolvedValue(mockData)

      const result = await systemApi.healthCheck()

      expect(apiClient.healthCheck).toHaveBeenCalled()
      expect(result).toEqual(mockData)
      expect(result.status).toBe('healthy')
    })

    it('should propagate health check errors', async () => {
      const error = new Error('Health check failed')
      apiClient.healthCheck.mockRejectedValue(error)

      await expect(systemApi.healthCheck()).rejects.toThrow('Health check failed')
      expect(console.warn).toHaveBeenCalledWith('Health check failed:', error)
    })

    it('should use default days parameter for collection status', async () => {
      apiClient.getCollectionStatus.mockResolvedValue([])

      await systemApi.getCollectionStatus()

      expect(apiClient.getCollectionStatus).toHaveBeenCalledWith(7)
    })
  })

  describe('Error Resilience', () => {
    it('should handle network errors gracefully', async () => {
      apiClient.getFearGreedLatest.mockRejectedValue(new Error('Network Error'))

      const result = await fearGreedApi.getCurrentIndex()

      expect(result).toHaveProperty('value')
      expect(result).toHaveProperty('level')
      expect(result).toHaveProperty('components')
      expect(console.warn).toHaveBeenCalled()
    })

    it('should handle timeout errors gracefully', async () => {
      apiClient.getSystemStatus.mockRejectedValue(new Error('Request timeout'))

      const result = await systemApi.getSystemStatus()

      expect(result.system.status).toBe('UNKNOWN')
      expect(console.warn).toHaveBeenCalled()
    })

    it('should handle invalid response data gracefully', async () => {
      apiClient.getFearGreedHistory.mockResolvedValue(null)

      const result = await fearGreedApi.getHistoryData(7)

      // Should handle null response and provide fallback
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('API Response Format Validation', () => {
    it('should validate Fear & Greed response structure', async () => {
      const mockData = {
        value: 42,
        level: 'Fear',
        date: '2024-01-15',
        components: {
          priceMomentum: 40,
          investorSentiment: 35,
          putCallRatio: 50,
          volatilityIndex: 45,
          safeHavenDemand: 48
        }
      }

      apiClient.getFearGreedLatest.mockResolvedValue(mockData)

      const result = await fearGreedApi.getCurrentIndex()

      // Validate all required fields are present
      expect(result).toHaveProperty('value')
      expect(result).toHaveProperty('level')
      expect(result).toHaveProperty('date')
      expect(result).toHaveProperty('components')
      expect(result.components).toHaveProperty('priceMomentum')
      expect(result.components).toHaveProperty('investorSentiment')
      expect(result.components).toHaveProperty('putCallRatio')
      expect(result.components).toHaveProperty('volatilityIndex')
      expect(result.components).toHaveProperty('safeHavenDemand')
    })

    it('should validate system status response structure', async () => {
      const mockData = {
        system: {
          status: 'HEALTHY',
          timestamp: '2024-01-15T12:00:00Z'
        },
        latestData: {
          fearGreedIndex: {
            date: '2024-01-15',
            value: 42,
            level: 'Fear'
          },
          kospiIndex: {
            date: '2024-01-15',
            change: -12.45
          }
        },
        recentCollections: 5
      }

      apiClient.getSystemStatus.mockResolvedValue(mockData)

      const result = await systemApi.getSystemStatus()

      expect(result).toHaveProperty('system')
      expect(result).toHaveProperty('latestData')
      expect(result).toHaveProperty('recentCollections')
      expect(result.system).toHaveProperty('status')
      expect(result.system).toHaveProperty('timestamp')
      expect(result.latestData).toHaveProperty('fearGreedIndex')
      expect(result.latestData).toHaveProperty('kospiIndex')
    })
  })
})