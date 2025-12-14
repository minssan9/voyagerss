import { logger } from '@/utils/common/logger'

export interface BatchOperation {
  id: string
  type: string
  params?: any
}

export interface ErrorContext {
  attempts?: number
  sessionId?: string
  lastError?: Error
  timestamp?: Date
}

export interface RecoveryAction {
  action: 'retry' | 'circuit_break' | 'dead_letter'
  delay?: number
  modifiedOperation?: BatchOperation
  reason?: string
}

interface FailurePattern {
  type: string
  frequency: number
  lastOccurrence: Date
  consecutiveFailures: number
  isAnomalous: boolean
}

interface RetryStrategy {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  multiplier: number
  circuitBreakThreshold: number
  circuitBreakDelay: number
}

export class ErrorRecoverySystem {
  private static failurePatterns: Map<string, FailurePattern> = new Map()
  private static retryStrategies: Map<string, RetryStrategy> = new Map()
  private static circuitBreakers: Map<string, { isOpen: boolean; failures: number; lastFailure: Date }> = new Map()
  private static isInitialized = false

  static initialize(): void {
    if (this.isInitialized) {
      return
    }

    // 기본 재시도 전략 설정
    this.setupDefaultStrategies()
    
    this.isInitialized = true
    logger.info('[ErrorRecovery] 에러 복구 시스템 초기화 완료')
  }

  private static setupDefaultStrategies(): void {
    const defaultStrategies = {
      'data_collection': {
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 60000,
        multiplier: 2,
        circuitBreakThreshold: 10,
        circuitBreakDelay: 300000 // 5분
      },
      'api_call': {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        multiplier: 2,
        circuitBreakThreshold: 5,
        circuitBreakDelay: 180000 // 3분
      },
      'database_operation': {
        maxAttempts: 3,
        baseDelay: 500,
        maxDelay: 10000,
        multiplier: 1.5,
        circuitBreakThreshold: 8,
        circuitBreakDelay: 120000 // 2분
      }
    }

    Object.entries(defaultStrategies).forEach(([type, strategy]) => {
      this.retryStrategies.set(type, strategy)
    })
  }

  static async handleFailure(
    operation: BatchOperation,
    error: Error,
    context: ErrorContext
  ): Promise<RecoveryAction> {
    const patternKey = `${operation.type}_${operation.id}`
    
    // 실패 패턴 분석
    const pattern = this.analyzeFailurePattern(patternKey, error, context)
    const strategy = this.getRetryStrategy(operation.type)
    
    // 서킷 브레이커 확인
    if (this.shouldTriggerCircuitBreaker(patternKey, pattern, strategy)) {
      this.openCircuitBreaker(patternKey, strategy.circuitBreakDelay)
      return {
        action: 'circuit_break',
        delay: strategy.circuitBreakDelay,
        reason: 'circuit_breaker_open'
      }
    }

    // 재시도 가능 여부 확인
    const attempt = context.attempts || 0
    if (attempt >= strategy.maxAttempts) {
      return {
        action: 'dead_letter',
        reason: 'max_attempts_exceeded'
      }
    }

    // 지수 백오프 계산
    const delay = this.calculateExponentialBackoff(
      attempt,
      strategy.baseDelay,
      strategy.maxDelay,
      strategy.multiplier
    )

    return {
      action: 'retry',
      delay,
      modifiedOperation: this.optimizeOperation(operation, pattern)
    }
  }

  private static analyzeFailurePattern(
    patternKey: string,
    error: Error,
    context: ErrorContext
  ): FailurePattern {
    let pattern = this.failurePatterns.get(patternKey)
    
    if (!pattern) {
      pattern = {
        type: this.categorizeError(error),
        frequency: 0,
        lastOccurrence: new Date(),
        consecutiveFailures: 0,
        isAnomalous: false
      }
    }

    pattern.frequency++
    pattern.lastOccurrence = new Date()
    pattern.consecutiveFailures++

    // 이상 패턴 감지
    pattern.isAnomalous = this.detectAnomalousPattern(pattern, error)

    this.failurePatterns.set(patternKey, pattern)
    
    logger.warn(`[ErrorRecovery] 실패 패턴 분석: ${patternKey}`, {
      type: pattern.type,
      frequency: pattern.frequency,
      consecutive: pattern.consecutiveFailures,
      anomalous: pattern.isAnomalous
    })

    return pattern
  }

  private static categorizeError(error: Error): string {
    const message = error.message.toLowerCase()
    
    if (message.includes('timeout') || message.includes('econnreset')) {
      return 'network_timeout'
    } else if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limit'
    } else if (message.includes('auth') || message.includes('401') || message.includes('403')) {
      return 'authentication'
    } else if (message.includes('database') || message.includes('connection')) {
      return 'database_error'
    } else if (message.includes('parse') || message.includes('json')) {
      return 'data_format'
    } else {
      return 'unknown'
    }
  }

  private static detectAnomalousPattern(pattern: FailurePattern, error: Error): boolean {
    // 연속 실패가 5회 이상이면 이상
    if (pattern.consecutiveFailures >= 5) {
      return true
    }

    // 1시간 내 빈발한 실패 (10회 이상)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (pattern.lastOccurrence > oneHourAgo && pattern.frequency >= 10) {
      return true
    }

    return false
  }

  private static shouldTriggerCircuitBreaker(
    patternKey: string,
    pattern: FailurePattern,
    strategy: RetryStrategy
  ): boolean {
    const breaker = this.circuitBreakers.get(patternKey)
    
    if (breaker?.isOpen) {
      // 서킷이 열려있으면 복구 시간이 지났는지 확인
      const timeSinceLastFailure = Date.now() - breaker.lastFailure.getTime()
      if (timeSinceLastFailure > strategy.circuitBreakDelay) {
        // 서킷 브레이커 반열림 상태로 전환
        breaker.isOpen = false
        breaker.failures = 0
        logger.info(`[ErrorRecovery] 서킷 브레이커 반열림: ${patternKey}`)
        return false
      }
      return true
    }

    // 연속 실패 횟수가 임계값을 초과하면 서킷 열기
    return pattern.consecutiveFailures >= strategy.circuitBreakThreshold
  }

  private static openCircuitBreaker(patternKey: string, delay: number): void {
    this.circuitBreakers.set(patternKey, {
      isOpen: true,
      failures: 0,
      lastFailure: new Date()
    })

    logger.warn(`[ErrorRecovery] 서킷 브레이커 열림: ${patternKey}, ${delay}ms 대기`)
  }

  private static getRetryStrategy(operationType: string): RetryStrategy {
    return this.retryStrategies.get(operationType) || this.retryStrategies.get('data_collection')!
  }

  private static calculateExponentialBackoff(
    attempt: number,
    baseDelay: number,
    maxDelay: number,
    multiplier: number
  ): number {
    const jitter = Math.random() * 0.1 // 10% 지터
    const delay = baseDelay * Math.pow(multiplier, attempt) * (1 + jitter)
    return Math.min(delay, maxDelay)
  }

  private static optimizeOperation(
    operation: BatchOperation,
    pattern: FailurePattern
  ): BatchOperation {
    const optimized = { ...operation }

    // 실패 패턴에 따른 최적화
    switch (pattern.type) {
      case 'rate_limit':
        // 배치 크기 줄이기
        if (optimized.params?.batchSize) {
          optimized.params.batchSize = Math.max(1, Math.floor(optimized.params.batchSize / 2))
        }
        break
      
      case 'network_timeout':
        // 타임아웃 증가
        if (optimized.params?.timeout) {
          optimized.params.timeout = Math.min(optimized.params.timeout * 1.5, 60000)
        }
        break
    }

    return optimized
  }

  static async handleBatchFailure(sessionId: string, error: Error): Promise<void> {
    logger.error(`[ErrorRecovery] 배치 세션 실패 처리: ${sessionId}`, error)
    
    const operation: BatchOperation = {
      id: sessionId,
      type: 'batch_session'
    }
    
    const context: ErrorContext = {
      attempts: 1,
      sessionId,
      lastError: error,
      timestamp: new Date()
    }
    
    const recoveryAction = await this.handleFailure(operation, error, context)
    
    logger.info(`[ErrorRecovery] 배치 세션 복구 액션: ${recoveryAction.action}`, {
      sessionId,
      delay: recoveryAction.delay,
      reason: recoveryAction.reason
    })
    
    // TODO: 필요시 배치 세션 재실행 로직 추가
    // if (recoveryAction.action === 'retry') {
    //   // 지연 후 재시도 스케줄링
    // }
  }

  static onSuccess(operationKey: string): void {
    const pattern = this.failurePatterns.get(operationKey)
    if (pattern) {
      pattern.consecutiveFailures = 0
      pattern.isAnomalous = false
    }

    const breaker = this.circuitBreakers.get(operationKey)
    if (breaker && !breaker.isOpen) {
      breaker.failures = 0
    }
  }

  static getSystemStatus(): {
    totalPatterns: number
    activeCircuitBreakers: number
    anomalousPatterns: number
  } {
    const anomalousPatterns = Array.from(this.failurePatterns.values())
      .filter(p => p.isAnomalous).length

    const activeBreakers = Array.from(this.circuitBreakers.values())
      .filter(b => b.isOpen).length

    return {
      totalPatterns: this.failurePatterns.size,
      activeCircuitBreakers: activeBreakers,
      anomalousPatterns
    }
  }
}