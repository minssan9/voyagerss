import { PrismaClient } from '@prisma/client'

/**
 * 기본 리포지토리 클래스
 * 공통 데이터베이스 작업과 연결 관리
 */
export class BaseRepository {
  protected static prisma: PrismaClient = new PrismaClient()

  // ================================
  // CONNECTION MANAGEMENT
  // ================================

  /**
   * 데이터베이스 연결 확인
   */
  static async checkConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('[DB] 연결 확인 실패:', error)
      return false
    }
  }

  /**
   * 연결 종료
   */
  static async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }

  // ================================
  // TRANSACTION HELPERS
  // ================================

  /**
   * 트랜잭션 실행
   */
  static async executeTransaction<T>(
    operations: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(operations)
  }

  /**
   * 배치 작업 실행 (트랜잭션 내)
   */
  static async executeBatch<T>(
    operations: Array<(prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>>
  ): Promise<T[]> {
    return this.prisma.$transaction(async (prisma) => {
      return Promise.all(operations.map(op => op(prisma)))
    })
  }

  // ================================
  // LOGGING HELPERS
  // ================================

  /**
   * 작업 성공 로그
   */
  protected static logSuccess(operation: string, identifier: string): void {
    console.log(`[DB] ${operation} 완료: ${identifier}`)
  }

  /**
   * 작업 실패 로그
   */
  protected static logError(operation: string, identifier: string, error: any): void {
    console.error(`[DB] ${operation} 실패 (${identifier}):`, error)
  }

  /**
   * 배치 작업 로그
   */
  protected static logBatchResult(operation: string, success: number, total: number): void {
    console.log(`[DB] ${operation} 일괄 작업 완료: ${success}/${total}개 성공`)
  }

  // ================================
  // VALIDATION HELPERS
  // ================================

  /**
   * 필수 필드 검증
   */
  protected static validateRequired(data: Record<string, any>, requiredFields: string[]): void {
    const missing = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    )
    
    if (missing.length > 0) {
      throw new Error(`필수 필드 누락: ${missing.join(', ')}`)
    }
  }

  /**
   * 날짜 형식 검증 및 변환
   */
  protected static validateAndFormatDate(dateStr: string): Date {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      throw new Error(`잘못된 날짜 형식: ${dateStr}`)
    }
    return date
  }

  // ================================
  // PERFORMANCE HELPERS
  // ================================

  /**
   * 작업 시간 측정
   */
  protected static async measureTime<T>(
    operation: () => Promise<T>, 
    operationName: string
  ): Promise<T> {
    const startTime = Date.now()
    try {
      const result = await operation()
      const duration = Date.now() - startTime
      console.log(`[DB] ${operationName} 실행 시간: ${duration}ms`)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[DB] ${operationName} 실행 실패 (${duration}ms):`, error)
      throw error
    }
  }
}