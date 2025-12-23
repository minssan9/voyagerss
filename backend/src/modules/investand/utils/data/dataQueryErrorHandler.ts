import { PrismaClient } from '@prisma/client'

// ============================================================================
// DATA QUERY ERROR HANDLER UTILITY
// ============================================================================

export interface QueryResult<T> {
  success: boolean
  data?: T
  error?: string
  fallbackUsed: boolean
  retryCount?: number
}

export interface FallbackOptions<T> {
  fallbackValue?: T
  enableRetry?: boolean
  maxRetries?: number
  retryDelay?: number
  cacheKey?: string
  cacheTtl?: number
}

export class DataQueryErrorHandler {
  private static cache = new Map<string, { data: any; expiry: number }>()
  private static readonly DEFAULT_RETRY_COUNT = 3
  private static readonly DEFAULT_RETRY_DELAY = 1000 // 1 second
  private static readonly DEFAULT_CACHE_TTL = 300000 // 5 minutes

  /**
   * Execute a database query with comprehensive error handling and fallbacks
   */
  static async executeQuery<T>(
    queryFn: () => Promise<T>,
    options: FallbackOptions<T> = {}
  ): Promise<QueryResult<T>> {
    const {
      fallbackValue,
      enableRetry = true,
      maxRetries = this.DEFAULT_RETRY_COUNT,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      cacheKey,
      cacheTtl = this.DEFAULT_CACHE_TTL
    } = options

    // Check cache first if cacheKey provided
    if (cacheKey) {
      const cached = this.getCachedData<T>(cacheKey)
      if (cached) {
        return {
          success: true,
          data: cached,
          fallbackUsed: false
        }
      }
    }

    let lastError: any
    let retryCount = 0

    while (retryCount <= maxRetries) {
      try {
        const result = await queryFn()
        
        // Cache successful result if cacheKey provided
        if (cacheKey && result !== undefined) {
          this.setCachedData(cacheKey, result, cacheTtl)
        }

        return {
          success: true,
          data: result,
          fallbackUsed: false,
          retryCount
        }
      } catch (error) {
        lastError = error
        console.warn(`[DataQuery] Attempt ${retryCount + 1} failed:`, error)

        if (!enableRetry || retryCount >= maxRetries) {
          break
        }

        retryCount++
        if (retryCount <= maxRetries) {
          await this.delay(retryDelay * Math.pow(2, retryCount - 1)) // Exponential backoff
        }
      }
    }

    // All retries failed, use fallback or cached data
    const cachedFallback = cacheKey ? this.getCachedData<T>(cacheKey, true) : undefined
    
    if (cachedFallback) {
      console.warn('[DataQuery] Using stale cached data as fallback')
      return {
        success: false,
        data: cachedFallback,
        error: lastError?.message || 'Query failed',
        fallbackUsed: true,
        retryCount
      }
    }

    if (fallbackValue !== undefined) {
      console.warn('[DataQuery] Using provided fallback value')
      return {
        success: false,
        data: fallbackValue,
        error: lastError?.message || 'Query failed',
        fallbackUsed: true,
        retryCount
      }
    }

    // No fallback available
    console.error('[DataQuery] Query failed with no fallback available:', lastError)
    return {
      success: false,
      error: lastError?.message || 'Query failed',
      fallbackUsed: false,
      retryCount
    }
  }

  /**
   * Execute multiple queries with partial failure tolerance
   */
  static async executeParallelQueries<T>(
    queries: Array<{
      name: string
      queryFn: () => Promise<T>
      options?: FallbackOptions<T>
    }>,
    toleratePartialFailure: boolean = true
  ): Promise<{
    success: boolean
    results: Map<string, QueryResult<T>>
    successCount: number
    failureCount: number
  }> {
    const results = new Map<string, QueryResult<T>>()
    
    const promises = queries.map(async (query) => {
      const result = await this.executeQuery(query.queryFn, query.options)
      results.set(query.name, result)
      return result
    })

    await Promise.all(promises)

    const successCount = Array.from(results.values()).filter(r => r.success).length
    const failureCount = results.size - successCount

    const overallSuccess = toleratePartialFailure ? 
      successCount > 0 : 
      failureCount === 0

    return {
      success: overallSuccess,
      results,
      successCount,
      failureCount
    }
  }

  /**
   * Get cached data with optional stale data tolerance
   */
  private static getCachedData<T>(key: string, allowStale: boolean = false): T | undefined {
    const cached = this.cache.get(key)
    if (!cached) return undefined

    const now = Date.now()
    if (now <= cached.expiry || allowStale) {
      return cached.data as T
    }

    // Expired, remove from cache
    this.cache.delete(key)
    return undefined
  }

  /**
   * Set cached data with TTL
   */
  private static setCachedData<T>(key: string, data: T, ttl: number): void {
    const expiry = Date.now() + ttl
    this.cache.set(key, { data, expiry })
  }

  /**
   * Clear expired cache entries
   */
  static cleanupCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiry) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    totalEntries: number
    expiredEntries: number
    hitRate?: number
  } {
    const totalEntries = this.cache.size
    const now = Date.now()
    let expiredEntries = 0

    for (const cached of this.cache.values()) {
      if (now > cached.expiry) {
        expiredEntries++
      }
    }

    return {
      totalEntries,
      expiredEntries
    }
  }

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    this.cache.clear()
  }

  /**
   * Delay utility for retry backoff
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Check database connection health
   */
  static async checkDatabaseHealth(prisma: PrismaClient): Promise<{
    healthy: boolean
    responseTime: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      await prisma.$queryRaw`SELECT 1 as health_check`
      const responseTime = Date.now() - startTime
      
      return {
        healthy: true,
        responseTime
      }
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Common fallback values for different metric types
   */
  static readonly FALLBACK_VALUES = {
    PERCENTAGE: 0,
    COUNT: 0,
    SUCCESS_RATE: 0,
    RESPONSE_TIME: 0,
    TIMESTAMP: null,
    BOOLEAN: false,
    STRING: '',
    ARRAY: [],
    OBJECT: {},
    HEALTH_STATUS: 'UNKNOWN' as const,
    TREND: 'STABLE' as const,
    RELIABILITY: 'LOW' as const
  }

  /**
   * Create a resilient data collection function
   */
  static createResilientCollector<T>(
    collectorName: string,
    queryFn: () => Promise<T>,
    fallbackValue: T,
    cacheTtl: number = 300000 // 5 minutes
  ) {
    return async (): Promise<T> => {
      const result = await this.executeQuery(queryFn, {
        fallbackValue,
        enableRetry: true,
        maxRetries: 3,
        cacheKey: `collector_${collectorName}`,
        cacheTtl
      })

      if (!result.success && !result.fallbackUsed) {
        console.error(`[${collectorName}] Data collection failed with no fallback`)
      }

      return result.data!
    }
  }
}

// Export for convenience
export const { executeQuery, executeParallelQueries, FALLBACK_VALUES, createResilientCollector } = DataQueryErrorHandler

export default DataQueryErrorHandler