import { logger } from '@/utils/common/logger'

export interface RateLimitConfig {
  requestsPerSecond: number
  burstAllowance: number
  adaptiveScaling: boolean
  maxBackoffDelay: number
  minRate?: number
  maxRate?: number
}

interface CircuitBreakerConfig {
  failureThreshold: number
  successThreshold: number
  timeout: number
}

class AdaptiveRateLimiter {
  private currentRate: number
  private successCount = 0
  private failureCount = 0
  private lastAdjustment = Date.now()
  private tokenBucket: number
  private lastRefill = Date.now()

  constructor(private config: RateLimitConfig) {
    this.currentRate = config.requestsPerSecond
    this.tokenBucket = config.burstAllowance
  }

  async acquire(): Promise<void> {
    this.refillTokens()
    
    if (this.tokenBucket >= 1) {
      this.tokenBucket -= 1
      return
    }

    // 토큰이 없으면 대기
    const delay = this.calculateDelay()
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  private refillTokens(): void {
    const now = Date.now()
    const timeSinceLastRefill = now - this.lastRefill
    const tokensToAdd = (timeSinceLastRefill / 1000) * this.currentRate

    this.tokenBucket = Math.min(
      this.config.burstAllowance,
      this.tokenBucket + tokensToAdd
    )
    this.lastRefill = now
  }

  private calculateDelay(): number {
    if (this.tokenBucket >= 1) return 0
    
    return Math.max(0, (1 - this.tokenBucket) * (1000 / this.currentRate))
  }

  onSuccess(): void {
    this.successCount++
    
    // 성공률이 높으면 점진적으로 속도 증가
    if (this.successCount % 10 === 0 && this.failureCount === 0) {
      this.adjustRate(1.1)
    }
    
    // 최근 실패 카운트 리셋
    if (this.successCount % 50 === 0) {
      this.failureCount = 0
    }
  }

  onFailure(error: Error): void {
    this.failureCount++
    
    // 즉시 속도 감소
    if (this.isRateLimitError(error)) {
      this.adjustRate(0.5)
    } else if (this.isServerError(error)) {
      this.adjustRate(0.8)
    }
  }

  private adjustRate(factor: number): void {
    const oldRate = this.currentRate
    this.currentRate = Math.max(
      this.config.minRate || 1,
      Math.min(
        this.config.maxRate || this.config.requestsPerSecond * 2,
        this.currentRate * factor
      )
    )
    
    if (Math.abs(this.currentRate - oldRate) > 0.1) {
      logger.info(`[RateLimit] 속도 조정: ${oldRate.toFixed(2)} → ${this.currentRate.toFixed(2)} req/s`)
    }
    
    this.lastAdjustment = Date.now()
  }

  private isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return message.includes('rate limit') || 
           message.includes('429') ||
           message.includes('too many requests')
  }

  private isServerError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return message.includes('500') ||
           message.includes('502') ||
           message.includes('503') ||
           message.includes('timeout')
  }

  backoff(): void {
    this.adjustRate(0.3) // 대폭 감소
    this.tokenBucket = 0 // 토큰 버킷 비우기
  }

  getCurrentRate(): number {
    return this.currentRate
  }

  getStats(): {
    currentRate: number
    tokenBucket: number
    successCount: number
    failureCount: number
  } {
    return {
      currentRate: this.currentRate,
      tokenBucket: this.tokenBucket,
      successCount: this.successCount,
      failureCount: this.failureCount
    }
  }
}

class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime = 0
  private nextAttemptTime = 0

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN')
      }
      this.state = 'half-open'
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    
    if (this.state === 'half-open') {
      this.successCount++
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'closed'
        this.successCount = 0
        logger.info('[CircuitBreaker] 상태 변경: CLOSED')
      }
    }
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open'
      this.nextAttemptTime = Date.now() + this.config.timeout
      this.successCount = 0
      logger.warn(`[CircuitBreaker] 상태 변경: OPEN (${this.config.timeout}ms 대기)`)
    }
  }

  getState(): string {
    return this.state
  }
}

export class RateLimitingService {
  private static limiters: Map<string, AdaptiveRateLimiter> = new Map()
  private static circuitBreakers: Map<string, CircuitBreaker> = new Map()
  
  static async executeWithRateLimit<T>(
    apiName: string,
    operation: () => Promise<T>,
    config?: Partial<RateLimitConfig>
  ): Promise<T> {
    const limiter = this.getRateLimiter(apiName, config)
    const circuitBreaker = this.getCircuitBreaker(apiName)
    
    // Rate limiting 적용
    await limiter.acquire()
    
    try {
      // Circuit breaker를 통해 실행
      const result = await circuitBreaker.execute(operation)
      
      // 성공 시 적응형 조정
      limiter.onSuccess()
      
      return result
      
    } catch (error) {
      // 실패 시 적응형 조정
      limiter.onFailure(error as Error)
      
      if (this.isRateLimitError(error as Error)) {
        limiter.backoff()
      }
      
      throw error
    }
  }
  
  private static getRateLimiter(apiName: string, config?: Partial<RateLimitConfig>): AdaptiveRateLimiter {
    if (!this.limiters.has(apiName)) {
      const defaultConfig: RateLimitConfig = {
        requestsPerSecond: 10,
        burstAllowance: 20,
        adaptiveScaling: true,
        maxBackoffDelay: 60000,
        minRate: 1,
        maxRate: 50
      }
      
      // API별 기본 설정
      const apiDefaults = this.getApiDefaults(apiName)
      
      this.limiters.set(apiName, new AdaptiveRateLimiter({
        ...defaultConfig,
        ...apiDefaults,
        ...config
      }))
      
      logger.info(`[RateLimit] ${apiName} 속도 제한기 생성: ${JSON.stringify({...defaultConfig, ...apiDefaults, ...config})}`)
    }
    
    return this.limiters.get(apiName)!
  }
  
  private static getCircuitBreaker(apiName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(apiName)) {
      const config: CircuitBreakerConfig = {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 30000 // 30초
      }
      
      this.circuitBreakers.set(apiName, new CircuitBreaker(config))
      logger.info(`[CircuitBreaker] ${apiName} 서킷 브레이커 생성`)
    }
    
    return this.circuitBreakers.get(apiName)!
  }
  
  private static getApiDefaults(apiName: string): Partial<RateLimitConfig> {
    const defaults: Record<string, Partial<RateLimitConfig>> = {
      dart: {
        requestsPerSecond: 8,
        burstAllowance: 15,
        maxRate: 12
      },
      krx: {
        requestsPerSecond: 12,
        burstAllowance: 25,
        maxRate: 20
      },
      bok: {
        requestsPerSecond: 5,
        burstAllowance: 10,
        maxRate: 8
      },
      external: {
        requestsPerSecond: 3,
        burstAllowance: 5,
        maxRate: 5
      }
    }
    
    return defaults[apiName] || {}
  }
  
  private static isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return message.includes('rate limit') || 
           message.includes('429') ||
           message.includes('too many requests')
  }
  
  static getStats(apiName?: string): any {
    if (apiName) {
      const limiter = this.limiters.get(apiName)
      const breaker = this.circuitBreakers.get(apiName)
      
      return {
        rateLimiter: limiter?.getStats(),
        circuitBreaker: {
          state: breaker?.getState()
        }
      }
    }
    
    const stats: any = {}
    this.limiters.forEach((limiter, name) => {
      stats[name] = {
        rateLimiter: limiter.getStats(),
        circuitBreaker: {
          state: this.circuitBreakers.get(name)?.getState()
        }
      }
    })
    
    return stats
  }
  
  static resetLimiter(apiName: string): void {
    this.limiters.delete(apiName)
    this.circuitBreakers.delete(apiName)
    logger.info(`[RateLimit] ${apiName} 속도 제한기 초기화`)
  }
}