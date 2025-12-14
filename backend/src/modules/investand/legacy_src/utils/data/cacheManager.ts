import { logger } from '@/utils/common/logger'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
}

export interface CacheOptions {
  defaultTTL: number
  maxSize: number
  cleanupInterval: number
}

export class CacheManager {
  private static instance: CacheManager
  private cache = new Map<string, CacheEntry<any>>()
  private cleanupTimer?: NodeJS.Timeout
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
  }

  constructor(private options: CacheOptions) {
    this.startCleanupTimer()
  }

  static getInstance(options?: CacheOptions): CacheManager {
    if (!CacheManager.instance) {
      const defaultOptions: CacheOptions = {
        defaultTTL: 300000, // 5 minutes
        maxSize: 1000,
        cleanupInterval: 60000 // 1 minute
      }
      CacheManager.instance = new CacheManager(options || defaultOptions)
    }
    return CacheManager.instance
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.options.defaultTTL,
      accessCount: 0,
      lastAccessed: now
    }

    // Check if we need to evict entries
    if (this.cache.size >= this.options.maxSize) {
      this.evictLeastRecentlyUsed()
    }

    this.cache.set(key, entry)
    this.stats.sets++

    logger.debug(`Cache set: ${key}`, {
      ttl: entry.ttl,
      size: this.cache.size
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }

    const now = Date.now()
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      logger.debug(`Cache expired: ${key}`)
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = now
    
    this.stats.hits++
    
    logger.debug(`Cache hit: ${key}`, {
      accessCount: entry.accessCount,
      age: now - entry.timestamp
    })

    return entry.data
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.stats.deletes++
      logger.debug(`Cache deleted: ${key}`)
    }
    return deleted
  }

  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    logger.info(`Cache cleared: ${size} entries removed`)
  }

  // Cache with automatic data fetching
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    try {
      const data = await fetcher()
      this.set(key, data, ttl)
      return data
    } catch (error) {
      logger.error(`Failed to fetch data for cache key: ${key}`, error)
      throw error
    }
  }

  // Prefetch data to warm the cache
  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    try {
      const data = await fetcher()
      this.set(key, data, ttl)
      logger.debug(`Cache prefetched: ${key}`)
    } catch (error) {
      logger.error(`Failed to prefetch data for cache key: ${key}`, error)
    }
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null
    let oldestAccess = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
      this.stats.evictions++
      logger.debug(`Cache evicted LRU: ${lruKey}`)
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.options.cleanupInterval)
  }

  private cleanup(): void {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }

    if (removedCount > 0) {
      logger.debug(`Cache cleanup: ${removedCount} expired entries removed`)
    }
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : '0.00'

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.options.maxSize
    }
  }

  // Generate cache keys with consistent formatting
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.cache.clear()
    logger.info('Cache manager destroyed')
  }
}