import { DartApiClient } from '@/clients/dart/DartApiClient'
import { DartCollectionService } from '@/collectors/dartCollectionService'
import { DartDisclosureRepository } from '@/repositories/dart/DartDisclosureRepository'
import { ErrorRecoverySystem } from '@/services/infrastructure/ErrorRecoverySystem'
import { RateLimitingService } from '@/services/infrastructure/RateLimitingService'
import { TransactionalDatabaseService } from '@/services/infrastructure/TransactionalDatabaseService'
import { logger } from '@/utils/common/logger'
import { 
  DartBatchResult, 
  DartBatchQueueItem, 
  DartFilterOptions, 
  SentimentRelevantDisclosure,
  DartCollectionStats 
} from '@/types/collectors/dartTypes'
import cron from 'node-cron'

/**
 * DART 배치 처리 서비스
 * 공시 데이터 수집, 처리, 저장을 관리하는 메인 서비스
 */
export class DartBatchService {
  private static batchQueue: DartBatchQueueItem[] = []
  private static isProcessing = false
  private static stats: DartCollectionStats = {
    date: new Date().toISOString().split('T')[0] as string,
    totalApiCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    dataPoints: 0,
    averageResponseTime: 0,
    rateLimit: {
      limit: 10000, // DART API 일일 한도
      remaining: 10000,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  }

  /**
   * 배치 서비스 초기화 (Enhanced with 8-hour batch processing)
   */
  static async initialize(): Promise<void> {
    logger.info('[DART Batch] Enhanced 배치 서비스 초기화 시작')

    try {
      // 인프라 서비스들 초기화
      ErrorRecoverySystem.initialize()
      await TransactionalDatabaseService.initialize()
      
      // 기존 실행 중인 작업 상태 복구
      await this.recoverPendingJobs()

      // 강화된 스케줄러 시작 (8시간 간격)
      this.startEnhancedScheduler()

      // 큐 프로세서 시작
      this.startQueueProcessor()

      logger.info('[DART Batch] Enhanced 서비스 초기화 완료')

    } catch (error) {
      logger.error('[DART Batch] 서비스 초기화 실패:', error)
      throw error
    }
  }

  /**
   * 강화된 배치 수집 작업 생성 (8시간 간격 지원)
   */
  static async scheduleEnhancedBatchCollection(
    date: string,
    sessionType: 'morning' | 'afternoon' | 'evening',
    options?: DartFilterOptions & {
      maxPages?: number
      pageSize?: number
      priority?: 'high' | 'medium' | 'low'
    }
  ): Promise<string> {
    const jobId = `enhanced-${sessionType}-${date}-${Date.now()}`

    const queueItem: DartBatchQueueItem = {
      id: jobId,
      type: 'disclosure',
      priority: options?.priority || 'medium',
      payload: { 
        date, 
        sessionType,
        options: {
          ...options,
          maxPages: options?.maxPages || 50,
          pageSize: options?.pageSize || 100
        }
      },
      status: 'pending',
      attempts: 0,
      maxAttempts: 5, // 더 많은 재시도 허용
      createdAt: new Date(),
      scheduledAt: new Date()
    }

    // 배치 작업 실행
    logger.info(`[DART Batch] 배치 작업 시작: ${jobId}`)

    this.batchQueue.push(queueItem)
    logger.info(`[DART Batch] Enhanced ${sessionType} 배치 수집 작업 생성: ${jobId}`)

    // 데이터베이스에 작업 상태 저장
    await this.saveBatchStatus(jobId, 'pending')

    return jobId
  }

  /**
   * 기존 호환성을 위한 래퍼 메서드
   */
  static async scheduleDailyDisclosureCollection(
    date: string, 
    options?: DartFilterOptions
  ): Promise<string> {
    return this.scheduleEnhancedBatchCollection(date, 'evening', {
      ...options,
      priority: 'high'
    })
  }

  /**
   * KOSPI 200 기업 재무 데이터 배치 수집
   */
  static async scheduleFinancialDataCollection(
    businessYear: string
  ): Promise<string> {
    const jobId = `financial-${businessYear}-${Date.now()}`
    // TODO: Implement getKOSPI200CorpCodes in DartCollectionService
    const kospi200Corps: string[] = [] // Placeholder until implemented

    const queueItem: DartBatchQueueItem = {
      id: jobId,
      type: 'financial',
      priority: 'medium',
      payload: { businessYear, corpCodes: kospi200Corps },
      status: 'pending',
      attempts: 0,
      maxAttempts: 2,
      createdAt: new Date(),
      scheduledAt: new Date()
    }

    this.batchQueue.push(queueItem)
    logger.info(`[DART Batch] 재무 데이터 수집 작업 생성: ${jobId}`)

    await this.saveBatchStatus(jobId, 'pending')
    return jobId
  }

  /**
   * 큐 프로세서 시작
   */
  private static startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.batchQueue.length === 0) return

      this.isProcessing = true

      try {
        // 우선순위 순으로 정렬
        this.batchQueue.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        })

        const job = this.batchQueue.shift()
        if (job) {
          await this.processQueueItem(job)
        }

      } catch (error) {
        logger.error('[DART Batch] 큐 처리 중 오류:', error)
      } finally {
        this.isProcessing = false
      }
    }, 5000) // 5초마다 큐 체크
  }

  /**
   * 개별 큐 아이템 처리
   */
  private static async processQueueItem(item: DartBatchQueueItem): Promise<void> {
    logger.info(`[DART Batch] 작업 처리 시작: ${item.id}`)
    
    item.status = 'processing'
    item.startedAt = new Date()
    item.attempts++

    await this.saveBatchStatus(item.id, 'processing')

    try {
      let result: any

      switch (item.type) {
        case 'disclosure':
          result = await this.processDailyDisclosures(item.payload.date, item.payload.options)
          break
          
        case 'financial':
          result = await this.processFinancialData(item.payload.businessYear, item.payload.corpCodes)
          break
          
        case 'company_info':
          result = await this.processCompanyInfo(item.payload.corpCodes)
          break
          
        default:
          throw new Error(`알 수 없는 작업 유형: ${item.type}`)
      }

      item.status = 'completed'
      item.completedAt = new Date()

      await this.saveBatchResult(item.id, result)
      logger.info(`[DART Batch] 작업 완료: ${item.id}`)

    } catch (error) {
      item.error = (error as Error).message
      
      if (item.attempts < item.maxAttempts) {
        item.status = 'pending'
        // 재시도를 위해 큐에 다시 추가 (5분 후)
        setTimeout(() => {
          this.batchQueue.push(item)
        }, 5 * 60 * 1000)
        
        logger.warn(`[DART Batch] 작업 재시도 예약: ${item.id} (${item.attempts}/${item.maxAttempts})`)
      } else {
        item.status = 'failed'
        await this.saveBatchStatus(item.id, 'failed', item.error)
        logger.error(`[DART Batch] 작업 최종 실패: ${item.id}`, error)
      }
    }
  }

  /**
   * 강화된 일별 공시 데이터 처리 (에러 복구 및 트랜잭션 지원)
   */
  private static async processDailyDisclosures(
    date: string, 
    options?: DartFilterOptions & { sessionType?: string; maxPages?: number; pageSize?: number }
  ): Promise<any> {
    const startTime = Date.now()
    const sessionType = options?.sessionType || 'default'
    
    logger.info(`[DART Batch] Enhanced processing started: ${date} (${sessionType})`)
    
    try {
      // Rate limiting과 circuit breaker를 적용한 데이터 수집
      const disclosures = await RateLimitingService.executeWithRateLimit(
        'dart_collection',
        async () => {
          return await DartCollectionService.collectDailyDisclosures(date, false, {
            maxPages: options?.maxPages || 50,
            pageSize: options?.pageSize || 100
          })
        },
        {
          requestsPerSecond: 8,
          burstAllowance: 15,
          adaptiveScaling: true,
          maxBackoffDelay: 60000
        }
      )
      
      // Fear & Greed 지수 관련 공시 필터링
      const allDisclosures = [
        ...disclosures.stockDisclosures // 업데이트된 구조에 맞춤
      ]
      const sentimentRelevant = DartCollectionService.filterSentimentRelevantDisclosures(allDisclosures)

      // 트랜잭션을 통한 안전한 데이터베이스 저장
      if (sentimentRelevant.length > 0) {
        const persistResult = await TransactionalDatabaseService.persistWithOverlapDetection(
          sentimentRelevant.map(d => ({
            receiptNumber: d.receiptNumber,
            corpCode: d.corpCode,
            corpName: d.corpName,
            reportName: d.reportName,
            receiptDate: new Date(d.receiptDate),
            flrName: d.flrName,
            remarks: d.remarks,
            stockCode: d.stockCode,
            disclosureDate: new Date(d.disclosureDate),
            reportCode: d.reportCode
          })),
          'dartDisclosure',
          ['receiptNumber'], // 고유 키
          1000 // 배치 크기
        )
        
        logger.info(`[DART Batch] Database persistence completed:`, {
          inserted: persistResult.inserted,
          updated: persistResult.updated,
          errors: persistResult.errors.length
        })
      }

      // 통계 업데이트
      this.updateStats(1, Date.now() - startTime, sentimentRelevant.length)

      const result = {
        date,
        sessionType,
        totalDisclosures: disclosures.totalDisclosures,
        sentimentRelevantCount: sentimentRelevant.length,
        processingTime: Date.now() - startTime,
        success: true
      }
      
      logger.info(`[DART Batch] Enhanced processing completed:`, result)
      return result
      
    } catch (error) {
      logger.error(`[DART Batch] Enhanced processing failed: ${date} (${sessionType})`, error)
      
      // 에러 복구 시스템을 통한 복구 시도
      const recovery = await ErrorRecoverySystem.handleFailure(
        { id: `dart_${date}_${sessionType}`, type: 'data_collection' },
        error as Error,
        { attempts: 1, sessionId: sessionType }
      )
      
      if (recovery.action === 'retry') {
        logger.info(`[DART Batch] Scheduling retry with ${recovery.delay}ms delay`)
        // 여기서는 에러를 다시 throw해서 상위 레벨에서 재시도 처리
      }
      
      throw error
    }
  }

  /**
   * 재무 데이터 처리
   */
  private static async processFinancialData(
    businessYear: string, 
    corpCodes: string[]
  ): Promise<any> {
    const startTime = Date.now()
    
    // TODO: Implement collectFinancialDataBatch in DartCollectionService
    const results: any[] = [] // Placeholder until implemented
    
    // 성공적으로 수집된 재무 데이터만 저장
    const successResults = results.filter(r => !r.error)
    await this.saveFinancialData(successResults)

    this.updateStats(corpCodes.length, Date.now() - startTime, successResults.length)

    return {
      businessYear,
      totalCorps: corpCodes.length,
      successCount: successResults.length,
      failureCount: results.length - successResults.length,
      processingTime: Date.now() - startTime
    }
  }

  /**
   * 기업정보 처리 (현재 지원되지 않음 - 지분공시 전용)
   */
  private static async processCompanyInfo(corpCodes: string[]): Promise<any> {
    logger.warn('[DART Batch] 기업정보 조회는 현재 지원되지 않습니다 (지분공시 전용 시스템)')
    
    return {
      totalCorps: corpCodes.length,
      successCount: 0,
      results: corpCodes.map(corpCode => ({ 
        corpCode, 
        error: '기업정보 조회는 지원되지 않습니다' 
      })),
      processingTime: 0
    }
  }

  /**
   * 강화된 8시간 간격 스케줄러 시작
   */
  private static startEnhancedScheduler(): void {
    // 오전 6시 - 전일 공시 데이터 수집
    cron.schedule('0 6 * * *', async () => {
      try {
        const yesterday = DartCollectionService.getLastBusinessDay(1)
        await this.scheduleEnhancedBatchCollection(yesterday, 'morning', {
          maxPages: 50,
          pageSize: 100,
          priority: 'high'
        })
      } catch (error) {
        logger.error('[DART Batch] Morning batch scheduling failed:', error)
      }
    })

    // 오후 2시 - 당일 장중 공시 수집
    cron.schedule('0 14 * * 1-5', async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        await this.scheduleEnhancedBatchCollection(today!, 'afternoon', {
          maxPages: 20,
          pageSize: 50,
          priority: 'high'
        })
      } catch (error) {
        logger.error('[DART Batch] Afternoon batch scheduling failed:', error)
      }
    })

    // 오후 10시 - 일일 종합 공시 수집
    cron.schedule('0 22 * * *', async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        await this.scheduleEnhancedBatchCollection(today!, 'evening', {
          maxPages: 100,
          pageSize: 100,
          priority: 'medium'
        })
      } catch (error) {
        logger.error('[DART Batch] Evening batch scheduling failed:', error)
      }
    })

    // 매주 월요일 오전 2시에 주간 통계 생성
    cron.schedule('0 2 * * 1', async () => {
      await this.generateWeeklyReport()
    })

    logger.info('[DART Batch] Enhanced 8시간 간격 스케줄러 시작됨')
  }

  /**
   * 데이터베이스 저장 메서드들 - 새로운 Repository 사용
   */
  private static async saveDartDisclosures(
    disclosures: SentimentRelevantDisclosure[], 
    date: string
  ): Promise<void> {
    try {
      if (disclosures.length === 0) {
        logger.info(`[DART Batch] No disclosures to save for ${date}`)
        return
      }
      
      // Enhanced 트랜잭션 저장 사용
      const persistResult = await TransactionalDatabaseService.persistWithOverlapDetection(
        disclosures.map(d => ({
          receiptNumber: d.receiptNumber,
          corpCode: d.corpCode,
          corpName: d.corpName,
          reportName: d.reportName,
          receiptDate: new Date(d.receiptDate),
          flrName: d.flrName,
          remarks: d.remarks,
          stockCode: d.stockCode,
          disclosureDate: new Date(d.disclosureDate),
          reportCode: d.reportCode
        })),
        'dartDisclosure',
        ['receiptNumber'],
        1000 // 1000개씩 배치 처리
      )
      
      logger.info(`[DART Batch] Enhanced 공시 데이터 저장 완료: ${date}`, {
        inserted: persistResult.inserted,
        updated: persistResult.updated,
        skipped: persistResult.skipped,
        errors: persistResult.errors.length,
        totalProcessed: persistResult.totalProcessed
      })
      
      if (persistResult.errors.length > 0) {
        logger.warn(`[DART Batch] 저장 중 일부 오류 발생:`, persistResult.errors)
      }
      
    } catch (error) {
      logger.error('[DART Batch] Enhanced 공시 데이터 저장 실패:', error)
      throw error
    }
  }

  private static async saveFinancialData(results: any[]): Promise<void> {
    try {
      // TODO: 재무 데이터용 Repository 추가 시 구현
      logger.info(`[DART Batch] 재무 데이터 저장: ${results.length}건 (Repository 구현 필요)`)
    } catch (error) {
      logger.error('[DART Batch] 재무 데이터 저장 실패:', error)
      throw error
    }
  }

  private static async saveCompanyInfo(results: any[]): Promise<void> {
    try {
      // TODO: 기업 정보용 Repository 추가 시 구현
      logger.info(`[DART Batch] 기업 정보 저장: ${results.length}건 (Repository 구현 필요)`)
    } catch (error) {
      logger.error('[DART Batch] 기업 정보 저장 실패:', error)
      throw error
    }
  }

  private static async saveBatchStatus(
    jobId: string, 
    status: string, 
    error?: string
  ): Promise<void> {
    // 배치 작업 상태를 데이터베이스에 저장
    logger.info(`[DART Batch] 상태 업데이트: ${jobId} -> ${status}`)
  }

  private static async saveBatchResult(jobId: string, result: any): Promise<void> {
    logger.info(`[DART Batch] 결과 저장: ${jobId}`, result)
  }

  /**
   * 통계 업데이트
   */
  private static updateStats(
    apiCalls: number, 
    responseTime: number, 
    dataPoints: number
  ): void {
    this.stats.totalApiCalls += apiCalls
    this.stats.successfulCalls += apiCalls
    this.stats.dataPoints += dataPoints
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime + responseTime) / 2
  }

  /**
   * 주간 리포트 생성
   */
  private static async generateWeeklyReport(): Promise<void> {
    logger.info('[DART Batch] 주간 리포트 생성 시작')
    // 주간 통계 및 리포트 생성 로직
  }

  /**
   * 미완료 작업 복구
   */
  private static async recoverPendingJobs(): Promise<void> {
    logger.info('[DART Batch] 미완료 작업 복구 중')
    // 시스템 재시작 시 미완료 작업들을 큐에 다시 추가
  }

  /**
   * 서비스 상태 조회
   */
  static getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.batchQueue.length,
      stats: this.stats,
      uptime: process.uptime()
    }
  }

  /**
   * 서비스 종료 (Enhanced)
   */
  static async shutdown(): Promise<void> {
    logger.info('[DART Batch] Enhanced 서비스 종료 시작')
    
    // 진행 중인 작업 완료까지 대기
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 인프라 서비스들 종료
    await TransactionalDatabaseService.shutdown()

    logger.info('[DART Batch] Enhanced 서비스 종료 완료')
  }
  
  /**
   * 시스템 상태 조회 (Enhanced)
   */
  static getEnhancedStatus() {
    const basicStatus = this.getStatus()
    
    return {
      ...basicStatus,
      infrastructure: {
        errorRecovery: ErrorRecoverySystem.getSystemStatus(),
        rateLimiting: RateLimitingService.getStats('dart'),
        database: TransactionalDatabaseService.getConnectionStats()
      },
      performance: {
        averageProcessingTime: this.stats.averageResponseTime,
        successRate: this.stats.totalApiCalls > 0 ? 
          (this.stats.successfulCalls / this.stats.totalApiCalls) * 100 : 0,
        throughput: {
          callsPerHour: this.stats.totalApiCalls,
          dataPointsPerHour: this.stats.dataPoints
        }
      }
    }
  }
}