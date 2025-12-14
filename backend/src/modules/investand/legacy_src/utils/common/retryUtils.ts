import { logger } from '@/utils/common/logger'

export interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryCondition?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

export interface CircuitBreakerOptions {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failures = 0
  private lastFailureTime = 0
  private successCount = 0
  
  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.options.resetTimeout) {
        throw new Error('Circuit breaker is OPEN - operation blocked')
      }
      this.state = CircuitBreakerState.HALF_OPEN
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
    this.failures = 0
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++
      if (this.successCount >= 3) {
        this.state = CircuitBreakerState.CLOSED
        this.successCount = 0
      }
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN
    }
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  getMetrics() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    }
  }
}

/**
 * Simple retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  const retryManager = RetryManager.getInstance()
  return retryManager.executeWithRetry(operation, { maxAttempts })
}

export class RetryManager {
  private static instance: RetryManager
  private circuitBreakers = new Map<string, CircuitBreaker>()

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager()
    }
    return RetryManager.instance
  }

  getCircuitBreaker(key: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      const defaultOptions: CircuitBreakerOptions = {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 300000 // 5 minutes
      }
      this.circuitBreakers.set(key, new CircuitBreaker(options || defaultOptions))
    }
    return this.circuitBreakers.get(key)!
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    circuitBreakerKey?: string
  ): Promise<T> {
    const config: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      retryCondition: (error) => this.isRetryableError(error),
      ...options
    }

    const executeWithCircuitBreaker = async () => {
      if (circuitBreakerKey) {
        const circuitBreaker = this.getCircuitBreaker(circuitBreakerKey)
        return await circuitBreaker.execute(operation)
      }
      return await operation()
    }

    let lastError: any
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await executeWithCircuitBreaker()
      } catch (error) {
        lastError = error
        
        if (attempt === config.maxAttempts || !config.retryCondition!(error)) {
          logger.error(`Operation failed after ${attempt} attempts`, {
            error: (error as Error).message,
            stack: (error as Error).stack,
            circuitBreakerKey
          })
          throw error
        }

        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        )

        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: (error as Error).message,
          circuitBreakerKey
        })

        if (config.onRetry) {
          config.onRetry(attempt, error)
        }

        await this.sleep(delay)
      }
    }

    throw lastError
  }

  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true
    }

    // HTTP status codes that are retryable
    if (error.response?.status) {
      const status = error.response.status
      return status === 429 || status === 502 || status === 503 || status === 504
    }

    // API-specific errors
    if ((error as Error).message?.includes('timeout') || (error as Error).message?.includes('rate limit')) {
      return true
    }

    return false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getCircuitBreakerMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {}
    this.circuitBreakers.forEach((breaker, key) => {
      metrics[key] = breaker.getMetrics()
    })
    return metrics
  }
}