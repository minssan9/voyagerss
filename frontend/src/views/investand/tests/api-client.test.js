import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, ApiClientError } from '@/services/apiClient'
import { api } from '@/api/axios-voyagerss'

// Mock axios
vi.mock('@/boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      api.get.mockRejectedValue({
        request: {},
        message: 'Network Error'
      })

      await expect(apiClient.getFearGreedLatest()).rejects.toThrow(ApiClientError)
      await expect(apiClient.getFearGreedLatest()).rejects.toThrow('Network error - no response received')
    })

    it('should handle HTTP errors with response', async () => {
      api.get.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Not Found' }
        }
      })

      await expect(apiClient.getFearGreedLatest()).rejects.toThrow(ApiClientError)
      await expect(apiClient.getFearGreedLatest()).rejects.toThrow('Not Found')
    })

    it('should handle unknown errors', async () => {
      api.get.mockRejectedValue(new Error('Unknown error'))

      await expect(apiClient.getFearGreedLatest()).rejects.toThrow(ApiClientError)
      await expect(apiClient.getFearGreedLatest()).rejects.toThrow('Unknown error')
    })
  })

  describe('Fear & Greed API', () => {
    it('should fetch latest Fear & Greed index', async () => {
      const mockData = {
        data: {
          data: {
            date: '2024-01-15',
            value: 42,
            level: 'Fear',
            confidence: 85,
            components: {
              priceMomentum: 40,
              investorSentiment: 35,
              putCallRatio: 50,
              volatilityIndex: 45,
              safeHavenDemand: 48
            },
            updatedAt: '2024-01-15T09:00:00Z'
          }
        }
      }

      api.get.mockResolvedValue(mockData)

      const result = await apiClient.getFearGreedLatest()

      expect(api.get).toHaveBeenCalledWith('/api/fear-greed/latest')
      expect(result).toEqual(mockData.data.data)
      expect(result.value).toBe(42)
      expect(result.level).toBe('Fear')
    })

    it('should fetch Fear & Greed history', async () => {
      const mockData = {
        data: {
          data: [
            {
              date: '2024-01-15',
              value: 42,
              level: 'Fear',
              components: {
                priceMomentum: 40,
                investorSentiment: 35,
                putCallRatio: 50,
                volatilityIndex: 45,
                safeHavenDemand: 48
              }
            },
            {
              date: '2024-01-14',
              value: 38,
              level: 'Fear',
              components: {
                priceMomentum: 35,
                investorSentiment: 32,
                putCallRatio: 45,
                volatilityIndex: 40,
                safeHavenDemand: 43
              }
            }
          ]
        }
      }

      api.get.mockResolvedValue(mockData)

      const result = await apiClient.getFearGreedHistory(7)

      expect(api.get).toHaveBeenCalledWith('/api/fear-greed/history?days=7')
      expect(result).toEqual(mockData.data.data)
      expect(result).toHaveLength(2)
      expect(result[0].date).toBe('2024-01-15')
    })

    it('should use default days parameter', async () => {
      const mockData = { data: { data: [] } }
      api.get.mockResolvedValue(mockData)

      await apiClient.getFearGreedHistory()

      expect(api.get).toHaveBeenCalledWith('/api/fear-greed/history?days=30')
    })
  })

  describe('Market Data API', () => {
    it('should fetch latest KOSPI data', async () => {
      const mockData = {
        data: {
          data: {
            date: '2024-01-15',
            change: -12.45,
            changePercent: -0.50,
            volume: '450000000',
            updatedAt: '2024-01-15T15:30:00Z'
          }
        }
      }

      api.get.mockResolvedValue(mockData)

      const result = await apiClient.getKospiLatest()

      expect(api.get).toHaveBeenCalledWith('/api/market/kospi/latest')
      expect(result).toEqual(mockData.data.data)
      expect(result.change).toBe(-12.45)
      expect(result.changePercent).toBe(-0.50)
    })
  })

  describe('System API', () => {
    it('should fetch system status', async () => {
      const mockData = {
        data: {
          data: {
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
        }
      }

      api.get.mockResolvedValue(mockData)

      const result = await apiClient.getSystemStatus()

      expect(api.get).toHaveBeenCalledWith('/api/system/status')
      expect(result).toEqual(mockData.data.data)
      expect(result.system.status).toBe('HEALTHY')
      expect(result.recentCollections).toBe(5)
    })

    it('should fetch collection status', async () => {
      const mockData = {
        data: {
          data: [
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
        }
      }

      api.get.mockResolvedValue(mockData)

      const result = await apiClient.getCollectionStatus(7)

      expect(api.get).toHaveBeenCalledWith('/api/system/collection-status?days=7')
      expect(result).toEqual(mockData.data.data)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('KRX')
    })

    it('should use default days parameter for collection status', async () => {
      const mockData = { data: { data: [] } }
      api.get.mockResolvedValue(mockData)

      await apiClient.getCollectionStatus()

      expect(api.get).toHaveBeenCalledWith('/api/system/collection-status?days=7')
    })
  })

  describe('Admin API', () => {
    it('should handle login request', async () => {
      const mockResponse = {
        data: {
          success: true,
          token: 'jwt-token-123',
          user: {
            id: '1',
            username: 'admin',
            role: 'admin',
            permissions: ['read', 'write'],
            lastLogin: '2024-01-15T08:00:00Z'
          },
          expiresIn: 3600
        }
      }

      api.post.mockResolvedValue(mockResponse)

      const credentials = { username: 'admin', password: 'password' }
      const result = await apiClient.login(credentials)

      expect(api.post).toHaveBeenCalledWith('/api/admin/login', credentials)
      expect(result).toEqual(mockResponse.data)
      expect(result.token).toBe('jwt-token-123')
    })

    it('should handle data collection request', async () => {
      const mockResponse = {
        data: {
          data: {
            results: [
              {
                source: 'KRX',
                status: 'SUCCESS',
                message: 'Data collected successfully',
                duration: 1250,
                recordCount: 3
              }
            ]
          }
        }
      }

      api.post.mockResolvedValue(mockResponse)

      const params = { date: '2024-01-15', sources: ['KRX'] }
      const result = await apiClient.collectData(params)

      expect(api.post).toHaveBeenCalledWith('/api/admin/collect-data', params)
      expect(result).toEqual(mockResponse.data.data)
      expect(result.results).toHaveLength(1)
      expect(result.results[0].source).toBe('KRX')
    })

    it('should handle Fear & Greed calculation request', async () => {
      const mockResponse = {
        data: {
          data: {
            date: '2024-01-15',
            value: 42,
            level: 'Fear',
            confidence: 85,
            components: {
              priceMomentum: 40,
              investorSentiment: 35,
              putCallRatio: 50,
              volatilityIndex: 45,
              safeHavenDemand: 48
            }
          }
        }
      }

      api.post.mockResolvedValue(mockResponse)

      const result = await apiClient.calculateFearGreed('2024-01-15')

      expect(api.post).toHaveBeenCalledWith('/api/admin/recalculate-range', {
        startDate: '2024-01-15',
        endDate: '2024-01-15'
      })
      expect(result).toEqual(mockResponse.data.data)
      expect(result.value).toBe(42)
      expect(result.level).toBe('Fear')
    })
  })

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          timestamp: '2024-01-15T12:00:00Z'
        }
      }

      api.get.mockResolvedValue(mockResponse)

      const result = await apiClient.healthCheck()

      expect(api.get).toHaveBeenCalledWith('/health')
      expect(result).toEqual(mockResponse.data)
      expect(result.status).toBe('healthy')
    })
  })
})

describe('ApiClientError', () => {
  it('should create error with message only', () => {
    const error = new ApiClientError('Test error')

    expect(error.message).toBe('Test error')
    expect(error.name).toBe('ApiClientError')
    expect(error.statusCode).toBeUndefined()
    expect(error.response).toBeUndefined()
  })

  it('should create error with status code and response', () => {
    const mockResponse = { message: 'Server error' }
    const error = new ApiClientError('Test error', 500, mockResponse)

    expect(error.message).toBe('Test error')
    expect(error.name).toBe('ApiClientError')
    expect(error.statusCode).toBe(500)
    expect(error.response).toEqual(mockResponse)
  })
})

