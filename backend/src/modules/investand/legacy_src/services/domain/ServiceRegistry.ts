import { DataCollectionService } from '@/services/domain/DataCollectionService'
import { BatchProcessingService } from '@/services/domain/BatchProcessingService'
import { MarketAnalysisService } from '@/services/domain/MarketAnalysisService'
import { logger } from '@/utils/common/logger'

/**
 * 서비스 레지스트리
 * 모든 도메인 서비스를 통합 관리하는 중앙 레지스트리
 */
export class ServiceRegistry {
  
  private static services: Map<string, any> = new Map()
  private static isInitialized = false

  // ================================
  // SERVICE REGISTRATION
  // ================================

  /**
   * 모든 도메인 서비스 초기화
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('[ServiceRegistry] 이미 초기화된 레지스트리')
      return
    }

    logger.info('[ServiceRegistry] 도메인 서비스 레지스트리 초기화 시작')

    try {
      // 서비스 등록
      this.registerService('dataCollection', DataCollectionService)
      this.registerService('batchProcessing', BatchProcessingService)
      this.registerService('marketAnalysis', MarketAnalysisService)

      // 배치 처리 서비스 초기화 (스케줄러 포함)
      await this.getService('batchProcessing').initialize()

      this.isInitialized = true
      logger.info('[ServiceRegistry] 도메인 서비스 레지스트리 초기화 완료')

    } catch (error) {
      logger.error('[ServiceRegistry] 서비스 레지스트리 초기화 실패:', error)
      throw error
    }
  }

  /**
   * 서비스 등록
   */
  static registerService(name: string, serviceClass: any): void {
    this.services.set(name, serviceClass)
    logger.info(`[ServiceRegistry] 서비스 등록: ${name}`)
  }

  /**
   * 서비스 조회
   */
  static getService(name: string): any {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`등록되지 않은 서비스: ${name}`)
    }
    return service
  }

  /**
   * 등록된 서비스 목록 조회
   */
  static getRegisteredServices(): string[] {
    return Array.from(this.services.keys())
  }

  // ================================
  // CONVENIENCE METHODS
  // ================================

  /**
   * 데이터 수집 서비스
   */
  static get dataCollection() {
    return this.getService('dataCollection')
  }

  /**
   * 배치 처리 서비스
   */
  static get batchProcessing() {
    return this.getService('batchProcessing')
  }

  /**
   * 시장 분석 서비스
   */
  static get marketAnalysis() {
    return this.getService('marketAnalysis')
  }

  // ================================
  // STATUS & CONTROL
  // ================================

  /**
   * 레지스트리 상태 조회
   */
  static getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      registeredServices: this.getRegisteredServices(),
      serviceCount: this.services.size
    }
  }

  /**
   * 모든 서비스 종료
   */
  static async shutdown(): Promise<void> {
    logger.info('[ServiceRegistry] 서비스 레지스트리 종료 시작')

    try {
      // 배치 처리 서비스 종료
      if (this.services.has('batchProcessing')) {
        await this.getService('batchProcessing').shutdown()
      }

      this.services.clear()
      this.isInitialized = false

      logger.info('[ServiceRegistry] 서비스 레지스트리 종료 완료')

    } catch (error) {
      logger.error('[ServiceRegistry] 서비스 레지스트리 종료 실패:', error)
      throw error
    }
  }
}
