import { BaseRepository } from '@/repositories/core/BaseRepository'
import type { FearGreedResult } from '@/services/core/fearGreedCalculator'

/**
 * Fear & Greed Index 리포지토리
 * 공포탐욕지수 데이터 관리 전담
 */
export class FearGreedIndexRepository extends BaseRepository {

  // ================================
  // CREATE OPERATIONS
  // ================================

  /**
   * Fear & Greed Index 저장
   */
  static async saveFearGreedIndex(data: FearGreedResult): Promise<void> {
    this.validateRequired(data, ['date', 'value', 'level', 'confidence', 'components'])

    try {
      await this.prisma.fearGreedIndex.upsert({
        where: { date: this.validateAndFormatDate(data.date) },
        update: {
          value: data.value,
          level: data.level,
          confidence: data.confidence,
          priceMomentum: data.components.priceMomentum,
          investorSentiment: data.components.investorSentiment,
          putCallRatio: data.components.putCallRatio,
          volatilityIndex: data.components.volatilityIndex,
          safeHavenDemand: data.components.safeHavenDemand,
          updatedAt: new Date()
        },
        create: {
          date: this.validateAndFormatDate(data.date),
          value: data.value,
          level: data.level,
          confidence: data.confidence,
          priceMomentum: data.components.priceMomentum,
          investorSentiment: data.components.investorSentiment,
          putCallRatio: data.components.putCallRatio,
          volatilityIndex: data.components.volatilityIndex,
          safeHavenDemand: data.components.safeHavenDemand
        }
      })

      this.logSuccess('Fear & Greed Index 저장', data.date)
    } catch (error) {
      this.logError('Fear & Greed Index 저장', data.date, error)
      throw error
    }
  }

  /**
   * Fear & Greed Index 배치 저장
   */
  static async saveFearGreedIndexBatch(dataArray: FearGreedResult[]): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    const results = { success: 0, failed: 0, errors: [] as string[] }

    return this.measureTime(async () => {
      return this.executeTransaction(async (prisma) => {
        for (const data of dataArray) {
          try {
            await prisma.fearGreedIndex.upsert({
              where: { date: this.validateAndFormatDate(data.date) },
              update: {
                value: data.value,
                level: data.level,
                confidence: data.confidence,
                priceMomentum: data.components.priceMomentum,
                investorSentiment: data.components.investorSentiment,
                putCallRatio: data.components.putCallRatio,
                volatilityIndex: data.components.volatilityIndex,
                safeHavenDemand: data.components.safeHavenDemand,
                updatedAt: new Date()
              },
              create: {
                date: this.validateAndFormatDate(data.date),
                value: data.value,
                level: data.level,
                confidence: data.confidence,
                priceMomentum: data.components.priceMomentum,
                investorSentiment: data.components.investorSentiment,
                putCallRatio: data.components.putCallRatio,
                volatilityIndex: data.components.volatilityIndex,
                safeHavenDemand: data.components.safeHavenDemand
              }
            })
            results.success++
          } catch (error) {
            results.failed++
            results.errors.push(`${data.date}: ${error}`)
          }
        }

        this.logBatchResult('Fear & Greed Index 저장', results.success, dataArray.length)
        return results
      })
    }, `Fear & Greed Index 배치 저장 (${dataArray.length}건)`)
  }

  // ================================
  // READ OPERATIONS
  // ================================

  /**
   * 특정 날짜의 Fear & Greed Index 조회
   */
  static async findByDate(date: string) {
    try {
      return await this.prisma.fearGreedIndex.findUnique({
        where: { date: this.validateAndFormatDate(date) }
      })
    } catch (error) {
      this.logError('Fear & Greed Index 조회', date, error)
      throw error
    }
  }

  /**
   * 날짜 범위별 Fear & Greed Index 조회
   */
  static async findByDateRange(startDate: string, endDate: string) {
    try {
      return await this.prisma.fearGreedIndex.findMany({
        where: {
          date: {
            gte: this.validateAndFormatDate(startDate),
            lte: this.validateAndFormatDate(endDate)
          }
        },
        orderBy: { date: 'asc' }
      })
    } catch (error) {
      this.logError('Fear & Greed Index 범위 조회', `${startDate}~${endDate}`, error)
      throw error
    }
  }

  /**
   * 최신 Fear & Greed Index 조회
   */
  static async findLatest() {
    try {
      return await this.prisma.fearGreedIndex.findFirst({
        orderBy: { date: 'desc' }
      })
    } catch (error) {
      this.logError('최신 Fear & Greed Index 조회', '', error)
      throw error
    }
  }

  /**
   * 레벨별 Fear & Greed Index 조회
   */
  static async findByLevel(level: string, limit: number = 50) {
    try {
      return await this.prisma.fearGreedIndex.findMany({
        where: { level },
        orderBy: { date: 'desc' },
        take: limit
      })
    } catch (error) {
      this.logError('레벨별 Fear & Greed Index 조회', level, error)
      throw error
    }
  }

  // ================================
  // ANALYTICS OPERATIONS
  // ================================

  /**
   * Fear & Greed Index 통계 조회
   */
  static async getStatistics(startDate: string, endDate: string) {
    try {
      const [basic, levelDistribution, components] = await Promise.all([
        // 기본 통계
        this.prisma.fearGreedIndex.aggregate({
          where: {
            date: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          },
          _avg: { 
            value: true, 
            confidence: true,
            priceMomentum: true,
            investorSentiment: true,
            putCallRatio: true,
            volatilityIndex: true,
            safeHavenDemand: true
          },
          _min: { value: true, confidence: true },
          _max: { value: true, confidence: true },
          _count: true
        }),
        // 레벨별 분포
        this.prisma.fearGreedIndex.groupBy({
          by: ['level'],
          where: {
            date: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          },
          _count: true,
          _avg: { value: true }
        }),
        // 구성요소 상관관계
        this.prisma.fearGreedIndex.findMany({
          where: {
            date: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          },
          select: {
            date: true,
            value: true,
            priceMomentum: true,
            investorSentiment: true,
            putCallRatio: true,
            volatilityIndex: true,
            safeHavenDemand: true
          }
        })
      ])

      return {
        basic: {
          count: basic._count,
          average: basic._avg.value || 0,
          min: basic._min.value || 0,
          max: basic._max.value || 0,
          avgConfidence: basic._avg.confidence || 0,
          components: {
            avgPriceMomentum: basic._avg.priceMomentum || 0,
            avgInvestorSentiment: basic._avg.investorSentiment || 0,
            avgPutCallRatio: basic._avg.putCallRatio || 0,
            avgVolatilityIndex: basic._avg.volatilityIndex || 0,
            avgSafeHavenDemand: basic._avg.safeHavenDemand || 0
          }
        },
        levelDistribution: levelDistribution.reduce((acc, item) => {
          acc[item.level] = {
            count: item._count,
            avgValue: item._avg.value || 0
          }
          return acc
        }, {} as Record<string, { count: number, avgValue: number }>),
        timeSeries: components
      }
    } catch (error) {
      this.logError('Fear & Greed Index 통계 조회', `${startDate}~${endDate}`, error)
      throw error
    }
  }

  /**
   * 이동평균 계산
   */
  static async getMovingAverages(days: number = 20, limit: number = 100) {
    try {
      const data = await this.prisma.fearGreedIndex.findMany({
        orderBy: { date: 'desc' },
        take: limit + days - 1,
        select: {
          date: true,
          value: true
        }
      })

      const movingAverages = []
      
      for (let i = 0; i < Math.min(data.length - days + 1, limit); i++) {
        const slice = data.slice(i, i + days)
        const average = slice.reduce((sum, item) => sum + item.value, 0) / days
        
        movingAverages.push({
          date: data[i]?.date!,
          value: data[i]?.value!,
          movingAverage: Math.round(average * 100) / 100
        })
      }

      return movingAverages.reverse() // 오래된 날짜부터 정렬
    } catch (error) {
      this.logError('Fear & Greed Index 이동평균 계산', `${days}일`, error)
      throw error
    }
  }

  /**
   * 변동성 분석
   */
  static async getVolatilityAnalysis(startDate: string, endDate: string) {
    try {
      const data = await this.prisma.fearGreedIndex.findMany({
        where: {
          date: {
            gte: this.validateAndFormatDate(startDate),
            lte: this.validateAndFormatDate(endDate)
          }
        },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          value: true,
          level: true
        }
      })

      if (data.length < 2) {
        return { standardDeviation: 0, dailyChanges: [], levelChanges: 0 }
      }

      // 일간 변화량 계산
      const dailyChanges = []
      for (let i = 1; i < data.length; i++) {
        const change = data[i]?.value! - data[i-1]?.value!
        dailyChanges.push({
          date: data[i]?.date!,
          change,
          previousValue: data[i-1]?.value!,
          currentValue: data[i]?.value!
        })
      }

      // 표준편차 계산
      const changes = dailyChanges.map(d => d.change)
      const meanChange = changes.reduce((sum, change) => sum + change, 0) / changes.length
      const variance = changes.reduce((sum, change) => sum + Math.pow(change - meanChange, 2), 0) / changes.length
      const standardDeviation = Math.sqrt(variance)

      // 레벨 변화 횟수
      const levelChanges = data.slice(1).reduce((count, current, index) => {
        return current.level !== data[index]?.level ? count + 1 : count
      }, 0)

      return {
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        dailyChanges,
        levelChanges,
        avgDailyChange: Math.round(meanChange * 100) / 100
      }
    } catch (error) {
      this.logError('Fear & Greed Index 변동성 분석', `${startDate}~${endDate}`, error)
      throw error
    }
  }

  // ================================
  // MAINTENANCE OPERATIONS
  // ================================

  /**
   * 오래된 Fear & Greed Index 데이터 정리
   */
  static async cleanupOldData(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    try {
      const result = await this.prisma.fearGreedIndex.deleteMany({
        where: {
          date: {
            lt: cutoffDate
          }
        }
      })

      this.logSuccess('오래된 Fear & Greed Index 정리', `${result.count}건 삭제`)
      return result.count
    } catch (error) {
      this.logError('오래된 Fear & Greed Index 정리', `${retentionDays}일 이전`, error)
      throw error
    }
  }
}