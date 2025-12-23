import { DatabaseService } from '@investand/services/core/databaseService'
import { PrismaClient } from '@prisma/client'

// Mock Prisma
jest.mock('@prisma/client')
const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('saveKRXStockData', () => {
    it('should save KOSPI data successfully', async () => {
      const testData = {
        date: '2024-01-01',
        close: '2500.00',
        volume: '1000000',
        change: '10.50',
        changePercent: '0.42'
      }

      const mockUpsert = jest.fn().mockResolvedValue(testData)
      ;(mockPrisma.kOSPI as any) = { upsert: mockUpsert }

      await DatabaseService.saveKRXStockData(testData, 'KOSPI')

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { date: testData.date },
        update: {
          close: testData.close,
          volume: testData.volume,
          change: testData.change,
          changePercent: testData.changePercent,
          updatedAt: expect.any(Date)
        },
        create: {
          date: testData.date,
          close: testData.close,
          volume: testData.volume,
          change: testData.change,
          changePercent: testData.changePercent
        }
      })
    })

    it('should save KOSDAQ data successfully', async () => {
      const testData = {
        date: '2024-01-01',
        close: '800.00',
        volume: '500000',
        change: '-5.20',
        changePercent: '-0.65'
      }

      const mockUpsert = jest.fn().mockResolvedValue(testData)
      ;(mockPrisma.kOSDAQ as any) = { upsert: mockUpsert }

      await DatabaseService.saveKRXStockData(testData, 'KOSDAQ')

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { date: testData.date }
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      const testData = {
        date: '2024-01-01',
        close: '2500.00',
        volume: '1000000',
        change: '10.50',
        changePercent: '0.42'
      }

      const mockUpsert = jest.fn().mockRejectedValue(new Error('Database error'))
      ;(mockPrisma.kOSPI as any) = { upsert: mockUpsert }

      await expect(
        DatabaseService.saveKRXStockData(testData, 'KOSPI')
      ).rejects.toThrow('Database error')
    })
  })

  describe('saveFearGreedIndex', () => {
    it('should save fear greed index with all components', async () => {
      const testResult = {
        date: '2024-01-01',
        value: 75,
        level: 'Greed',
        confidence: 0.85,
        components: {
          priceMomentum: 80,
          investorSentiment: 70,
          putCallRatio: 60,
          volatilityIndex: 75,
          safeHavenDemand: 85
        }
      }

      const mockUpsert = jest.fn().mockResolvedValue(testResult)
      ;(mockPrisma.fearGreedIndex as any) = { upsert: mockUpsert }

      await DatabaseService.saveFearGreedIndex(testResult)

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { date: testResult.date },
        update: expect.objectContaining({
          value: testResult.value,
          level: testResult.level,
          confidence: testResult.confidence
        }),
        create: expect.objectContaining({
          date: testResult.date,
          value: testResult.value,
          level: testResult.level
        })
      })
    })
  })

  describe('data retrieval', () => {
    it('should fetch fear greed history', async () => {
      const mockData = [
        { date: '2024-01-01', value: 75, level: 'Greed' },
        { date: '2024-01-02', value: 45, level: 'Fear' }
      ]

      const mockFindMany = jest.fn().mockResolvedValue(mockData)
      ;(mockPrisma.fearGreedIndex as any) = { findMany: mockFindMany }

      const result = await DatabaseService.getFearGreedHistory(7)

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { date: 'desc' },
        take: 7
      })
      expect(result).toEqual(mockData)
    })
  })
})