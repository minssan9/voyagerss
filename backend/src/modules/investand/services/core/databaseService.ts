import { PrismaClient } from '@prisma/client'
// 이 서비스는 DART 관련 로깅 및 기본 데이터베이스 작업만 담당
// 다른 데이터 타입들은 각각의 전용 Repository로 이동됨

const prisma = new PrismaClient()

/**
 * 데이터베이스 서비스 클래스
 */
export class DatabaseService {
  

  /**
   * 국채 수익률 커브 데이터 저장
   */
  static async saveBondYieldCurveData(date: string, yields: {
    yield1Y: number | null
    yield3Y: number | null
    yield5Y: number | null
    yield10Y: number | null
    yield20Y: number | null
  }): Promise<void> {
    try {
      await prisma.bondYieldCurveData.upsert({
        where: { date: new Date(date) },
        update: {
          yield1Y: yields.yield1Y,
          yield3Y: yields.yield3Y,
          yield5Y: yields.yield5Y,
          yield10Y: yields.yield10Y,
          yield20Y: yields.yield20Y,
          updatedAt: new Date()
        },
        create: {
          date: new Date(date),
          yield1Y: yields.yield1Y,
          yield3Y: yields.yield3Y,
          yield5Y: yields.yield5Y,
          yield10Y: yields.yield10Y,
          yield20Y: yields.yield20Y
        }
      })
      
      console.log(`[DB] 국채 수익률 커브 저장 완료: ${date}`)
    } catch (error) {
      console.error(`[DB] 국채 수익률 커브 저장 실패 (${date}):`, error)
      throw error
    }
  }

  /**
   * 데이터 수집 로그 저장
   */
  static async saveDataCollectionLog(
    date: string,
    source: string,
    dataType: string,
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL',
    recordCount?: number,
    errorMessage?: string,
    duration?: number
  ): Promise<void> {
    try {
      await prisma.dataCollectionLog.create({
        data: {
          date: new Date(date),
          source,
          dataType,
          status,
          recordCount: recordCount ?? null,
          errorMessage: errorMessage ?? null,
          duration: duration ?? null
        }
      })
      
      console.log(`[DB] 데이터 수집 로그 저장: ${source}/${dataType} - ${status}`)
    } catch (error) {
      console.error(`[DB] 데이터 수집 로그 저장 실패:`, error)
      // 로그 저장 실패는 전체 프로세스를 중단시키지 않음
    }
  }




  /**
   * DART 배치 로그 저장
   */
  static async saveDartBatchLog(data: {
    jobId: string
    jobType: string
    status: string
    startTime: Date
    endTime?: Date
    processedCount: number
    successCount: number
    failedCount: number
    errors?: string[]
    parameters?: any
    resultSummary?: any
  }): Promise<void> {
    try {
      await prisma.dartBatchLog.upsert({
        where: { jobId: data.jobId },
        update: {
          status: data.status,
          endTime: data.endTime || null,
          processedCount: data.processedCount,
          successCount: data.successCount,
          failedCount: data.failedCount,
          errors: data.errors ? JSON.stringify(data.errors) : null,
          parameters: data.parameters ? JSON.stringify(data.parameters) : null,
          resultSummary: data.resultSummary ? JSON.stringify(data.resultSummary) : null
        },
        create: {
          jobId: data.jobId,
          jobType: data.jobType,
          status: data.status,
          startTime: data.startTime,
          endTime: data.endTime || null,
          processedCount: data.processedCount,
          successCount: data.successCount,
          failedCount: data.failedCount,
          errors: data.errors ? JSON.stringify(data.errors) : null,
          parameters: data.parameters ? JSON.stringify(data.parameters) : null,
          resultSummary: data.resultSummary ? JSON.stringify(data.resultSummary) : null
        }
      })
      console.log(`[DB] DART 배치 로그 저장 완료: ${data.jobId}`)
    } catch (error) {
      console.error(`[DB] DART 배치 로그 저장 실패 (${data.jobId}):`, error)
      throw error
    }
  }

  /**
   * DART 수집 통계 저장
   */
  static async saveDartCollectionStat(data: {
    date: string
    totalApiCalls: number
    successfulCalls: number
    failedCalls: number
    dataPoints: number
    averageResponseTime: number
    rateLimitRemaining: number
  }): Promise<void> {
    try {
      await prisma.dartCollectionStat.upsert({
        where: { date: new Date(data.date) },
        update: {
          totalApiCalls: data.totalApiCalls,
          successfulCalls: data.successfulCalls,
          failedCalls: data.failedCalls,
          dataPoints: data.dataPoints,
          averageResponseTime: data.averageResponseTime,
          rateLimitRemaining: data.rateLimitRemaining,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          totalApiCalls: data.totalApiCalls,
          successfulCalls: data.successfulCalls,
          failedCalls: data.failedCalls,
          dataPoints: data.dataPoints,
          averageResponseTime: data.averageResponseTime,
          rateLimitRemaining: data.rateLimitRemaining
        }
      })
      console.log(`[DB] DART 수집 통계 저장 완료: ${data.date}`)
    } catch (error) {
      console.error(`[DB] DART 수집 통계 저장 실패 (${data.date}):`, error)
      throw error
    }
  }


  /**
   * 데이터베이스 연결 종료
   */
  static async disconnect(): Promise<void> {
    await prisma.$disconnect()
  }

  /**
   * 최신 Fear & Greed Index 조회
   */
  static async getLatestFearGreedIndex() {
    return await prisma.fearGreedIndex.findFirst({
      orderBy: { date: 'desc' }
    })
  }

  /**
   * Fear & Greed Index 히스토리 조회
   */
  static async getFearGreedIndexHistory(days: number = 30) {
    return await prisma.fearGreedIndex.findMany({
      orderBy: { date: 'desc' },
      take: days
    })
  }

  /**
   * 최신 KOSPI 데이터 조회
   */
  static async getLatestKOSPIData() {
    return await prisma.kospiData.findFirst({
      orderBy: { date: 'desc' }
    })
  }

  /**
   * 최신 KOSDAQ 데이터 조회
   */
  static async getLatestKOSDAQData() {
    return await prisma.kosdaqData.findFirst({
      orderBy: { date: 'desc' }
    });
  }

  /**
   * 데이터 수집 상태 조회
   */
  static async getDataCollectionStatus(days: number = 7) {
    return await prisma.dataCollectionLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Upbit Index 데이터 저장
   */
  static async saveUpbitIndexData(data: { date: string, value: number }): Promise<void> {
    try {
      await prisma.upbitIndexData.upsert({
        where: { date: new Date(data.date) },
        update: {
          value: data.value,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          value: data.value
        }
      })
      console.log(`[DB] Upbit Index 데이터 저장 완료: ${data.date} (${data.value})`)
    } catch (error) {
      console.error(`[DB] Upbit Index 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * CNN Fear & Greed Index 데이터 저장
   */
  static async saveCnnFearGreedIndexData(data: { date: string, value: number }): Promise<void> {
    try {
      await prisma.cnnFearGreedIndexData.upsert({
        where: { date: new Date(data.date) },
        update: {
          value: data.value,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          value: data.value
        }
      })
      console.log(`[DB] CNN Fear & Greed Index 데이터 저장 완료: ${data.date} (${data.value})`)
    } catch (error) {
      console.error(`[DB] CNN Fear & Greed Index 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * Korea FG Index 데이터 저장
   */
  static async saveKoreaFGIndexData(data: { date: string, value: number }): Promise<void> {
    try {
      await prisma.koreaFGIndexData.upsert({
        where: { date: new Date(data.date) },
        update: {
          value: data.value,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          value: data.value
        }
      })
      console.log(`[DB] Korea FG Index 데이터 저장 완료: ${data.date} (${data.value})`)
    } catch (error) {
      console.error(`[DB] Korea FG Index 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }





} 