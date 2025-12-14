import { DataCollectionService } from '@/services/domain/DataCollectionService'
import { DartBatchService } from '@/services/core/dartBatchService'
import { DatabaseService } from '@/services/core/databaseService'
import { logger } from '@/utils/common/logger'
import { formatDate } from '@/utils/common/dateUtils'
import cron from 'node-cron'

/**
 * 배치 처리 도메인 서비스
 * 스케줄링, 큐 관리, 배치 작업 통합 관리
 */
export class BatchProcessingService {
  
  private static isInitialized = false
  private static scheduledJobs: Map<string, any> = new Map()

  // ================================
  // PUBLIC BATCH METHODS
  // ================================

  /**
   * 배치 서비스 초기화
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('[BatchProcessing] 이미 초기화된 서비스')
      return
    }

    logger.info('[BatchProcessing] 배치 서비스 초기화 시작')

    try {
      // DART 배치 서비스 초기화
      await DartBatchService.initialize()
      
      // 스케줄러 시작
      this.startSchedulers()
      
      this.isInitialized = true
      logger.info('[BatchProcessing] 배치 서비스 초기화 완료')

    } catch (error) {
      logger.error('[BatchProcessing] 배치 서비스 초기화 실패:', error)
      throw error
    }
  }

  /**
   * 일별 데이터 수집 배치 작업 스케줄링
   */
  static async scheduleDailyCollection(
    date: string,
    options: {
      includeDart?: boolean
      includeKrx?: boolean
      includeFearGreed?: boolean
      priority?: 'high' | 'medium' | 'low'
    } = {}
  ): Promise<string> {
    const jobId = `daily-${date}-${Date.now()}`
    
    logger.info(`[BatchProcessing] 일별 수집 작업 스케줄링: ${jobId}`)

    try {
      // DART 배치 작업 생성
      if (options.includeDart !== false) {
        await DartBatchService.scheduleEnhancedBatchCollection(date, 'evening', {
          priority: options.priority || 'high'
        })
      }

      // 통합 데이터 수집 실행
      const result = await DataCollectionService.collectDailyData(date, {
        includeDart: options.includeDart !== false,
        includeKrx: options.includeKrx !== false,
        includeFearGreed: options.includeFearGreed !== false
      })

      // 배치 로그 저장
      await DatabaseService.saveDartBatchLog({
        jobId,
        jobType: 'daily_collection',
        status: result.summary.totalFailed === 0 ? 'SUCCESS' : 'PARTIAL',
        startTime: new Date(),
        endTime: new Date(),
        processedCount: result.summary.totalSuccess + result.summary.totalFailed,
        successCount: result.summary.totalSuccess,
        failedCount: result.summary.totalFailed,
        errors: result.summary.errors,
        parameters: { date, options },
        resultSummary: result
      })

      logger.info(`[BatchProcessing] 일별 수집 작업 완료: ${jobId}`)
      return jobId

    } catch (error) {
      logger.error(`[BatchProcessing] 일별 수집 작업 실패: ${jobId}`, error)
      throw error
    }
  }

  /**
   * 이력 데이터 수집 배치 작업
   */
  static async scheduleHistoricalCollection(
    startDate: string,
    endDate: string,
    sources: ('dart' | 'krx' | 'fearGreed')[] = ['dart', 'krx', 'fearGreed']
  ): Promise<string> {
    const jobId = `historical-${startDate}-${endDate}-${Date.now()}`
    
    logger.info(`[BatchProcessing] 이력 수집 작업 스케줄링: ${jobId}`)

    try {
      const result = await DataCollectionService.collectHistoricalData(
        startDate,
        endDate,
        sources
      )

      // 배치 로그 저장
      await DatabaseService.saveDartBatchLog({
        jobId,
        jobType: 'historical_collection',
        status: result.failedDays === 0 ? 'SUCCESS' : 'PARTIAL',
        startTime: new Date(),
        endTime: new Date(),
        processedCount: result.totalDays,
        successCount: result.successDays,
        failedCount: result.failedDays,
        parameters: { startDate, endDate, sources },
        resultSummary: result
      })

      logger.info(`[BatchProcessing] 이력 수집 작업 완료: ${jobId}`)
      return jobId

    } catch (error) {
      logger.error(`[BatchProcessing] 이력 수집 작업 실패: ${jobId}`, error)
      throw error
    }
  }

  /**
   * 주간 리포트 생성 배치 작업
   */
  static async scheduleWeeklyReport(): Promise<string> {
    const jobId = `weekly-report-${Date.now()}`
    
    logger.info(`[BatchProcessing] 주간 리포트 생성 작업: ${jobId}`)

    try {
      // 최근 7일간의 데이터 분석
      const endDate = formatDate(new Date())
      const startDate = formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      
      const weeklyData = await this.generateWeeklyReport(startDate, endDate)

      // 배치 로그 저장
      await DatabaseService.saveDartBatchLog({
        jobId,
        jobType: 'weekly_report',
        status: 'SUCCESS',
        startTime: new Date(),
        endTime: new Date(),
        processedCount: 1,
        successCount: 1,
        failedCount: 0,
        parameters: { startDate, endDate },
        resultSummary: weeklyData
      })

      logger.info(`[BatchProcessing] 주간 리포트 생성 완료: ${jobId}`)
      return jobId

    } catch (error) {
      logger.error(`[BatchProcessing] 주간 리포트 생성 실패: ${jobId}`, error)
      throw error
    }
  }

  // ================================
  // PRIVATE SCHEDULER METHODS
  // ================================

  /**
   * 스케줄러 시작
   */
  private static startSchedulers(): void {
    // 매일 오전 6시 - 전일 데이터 수집
    const morningJob = cron.schedule('0 6 * * *', async () => {
      try {
        const yesterday = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000))
        await this.scheduleDailyCollection(yesterday, {
          priority: 'high'
        })
      } catch (error) {
        logger.error('[BatchProcessing] 오전 배치 실행 실패:', error)
      }
    })

    // 매일 오후 2시 - 당일 장중 데이터 수집
    const afternoonJob = cron.schedule('0 14 * * 1-5', async () => {
      try {
        const today = formatDate(new Date())
        await this.scheduleDailyCollection(today, {
          priority: 'high'
        })
      } catch (error) {
        logger.error('[BatchProcessing] 오후 배치 실행 실패:', error)
      }
    })

    // 매일 오후 10시 - 일일 종합 데이터 수집
    const eveningJob = cron.schedule('0 22 * * *', async () => {
      try {
        const today = formatDate(new Date())
        await this.scheduleDailyCollection(today, {
          priority: 'medium'
        })
      } catch (error) {
        logger.error('[BatchProcessing] 저녁 배치 실행 실패:', error)
      }
    })

    // 매주 월요일 오전 2시 - 주간 리포트 생성
    const weeklyJob = cron.schedule('0 2 * * 1', async () => {
      try {
        await this.scheduleWeeklyReport()
      } catch (error) {
        logger.error('[BatchProcessing] 주간 리포트 생성 실패:', error)
      }
    })

    // 스케줄된 작업들 저장
    this.scheduledJobs.set('morning', morningJob)
    this.scheduledJobs.set('afternoon', afternoonJob)
    this.scheduledJobs.set('evening', eveningJob)
    this.scheduledJobs.set('weekly', weeklyJob)

    logger.info('[BatchProcessing] 모든 스케줄러 시작됨')
  }

  /**
   * 주간 리포트 생성
   */
  private static async generateWeeklyReport(startDate: string, endDate: string): Promise<any> {
    logger.info(`[BatchProcessing] 주간 리포트 생성: ${startDate} ~ ${endDate}`)

    // 수집 상태 조회
    const collectionStatus = await DatabaseService.getDataCollectionStatus(7)
    
    // Fear & Greed Index 히스토리 조회
    const fearGreedHistory = await DatabaseService.getFearGreedIndexHistory(7)
    
    // 최신 시장 데이터 조회
    const latestKospi = await DatabaseService.getLatestKOSPIData()
    const latestKosdaq = await DatabaseService.getLatestKOSDAQData()

    const report = {
      period: { startDate, endDate },
      collectionStatus: {
        totalJobs: collectionStatus.length,
        successJobs: collectionStatus.filter(job => job.status === 'SUCCESS').length,
        failedJobs: collectionStatus.filter(job => job.status === 'FAILED').length
      },
      fearGreedTrend: fearGreedHistory.map(item => ({
        date: item.date,
        value: item.value,
        level: item.level
      })),
      marketSummary: {
        kospi: latestKospi ? {
          price: latestKospi.stck_prpr,
          change: latestKospi.prdy_vrss,
          changeRate: latestKospi.prdy_ctrt
        } : null,
        kosdaq: latestKosdaq ? {
          price: latestKosdaq.stck_prpr,
          change: latestKosdaq.prdy_vrss,
          changeRate: latestKosdaq.prdy_ctrt
        } : null
      },
      generatedAt: new Date()
    }

    logger.info('[BatchProcessing] 주간 리포트 생성 완료')
    return report
  }

  // ================================
  // STATUS & CONTROL METHODS
  // ================================

  /**
   * 배치 서비스 상태 조회
   */
  static getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      scheduledJobs: Array.from(this.scheduledJobs.keys()),
      dartBatchStatus: DartBatchService.getStatus()
    }
  }

  /**
   * 특정 스케줄러 중지
   */
  static stopScheduler(schedulerName: string): void {
    const job = this.scheduledJobs.get(schedulerName)
    if (job) {
      job.stop()
      this.scheduledJobs.delete(schedulerName)
      logger.info(`[BatchProcessing] 스케줄러 중지: ${schedulerName}`)
    }
  }

  /**
   * 모든 스케줄러 중지
   */
  static stopAllSchedulers(): void {
    for (const [name, job] of this.scheduledJobs) {
      job.stop()
      logger.info(`[BatchProcessing] 스케줄러 중지: ${name}`)
    }
    this.scheduledJobs.clear()
  }

  /**
   * 배치 서비스 종료
   */
  static async shutdown(): Promise<void> {
    logger.info('[BatchProcessing] 배치 서비스 종료 시작')
    
    // 모든 스케줄러 중지
    this.stopAllSchedulers()
    
    // DART 배치 서비스 종료
    await DartBatchService.shutdown()
    
    this.isInitialized = false
    logger.info('[BatchProcessing] 배치 서비스 종료 완료')
  }
}
