import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '@/utils/common/logger'

export interface DatabaseOperation {
  id: string
  type: 'insert' | 'update' | 'delete' | 'upsert'
  table: string
  data: any
  where?: any
  options?: any
}

export interface TransactionOptions {
  timeout?: number
  isolationLevel?: Prisma.TransactionIsolationLevel
  maxRetries?: number
}

export interface BatchTransactionResult<T> {
  success: boolean
  results: T[]
  transactionId: string
  operationsCompleted: number
  operationsFailed: number
  errors: Array<{ operationId: string; error: string }>
}

export interface PersistenceResult {
  inserted: number
  updated: number
  skipped: number
  errors: Array<{
    batch: number
    error: string
    affectedRecords: number
  }>
  totalProcessed: number
}

class TransactionCheckpoint {
  private savepoints: Map<string, string> = new Map()

  async createSavepoint(name: string): Promise<void> {
    this.savepoints.set(name, name)
    logger.debug(`[Transaction] Savepoint created: ${name}`)
  }

  async rollbackToSavepoint(name?: string): Promise<void> {
    const savepointName = name || Array.from(this.savepoints.keys()).pop()
    if (savepointName) {
      logger.info(`[Transaction] Rolling back to savepoint: ${savepointName}`)
      // Prisma doesn't support named savepoints, so we rely on transaction rollback
      throw new Error(`Rollback to savepoint: ${savepointName}`)
    }
  }

  getSavepoints(): string[] {
    return Array.from(this.savepoints.keys())
  }
}

export class TransactionalDatabaseService {
  private static connectionPool: PrismaClient[] = []
  private static readonly MAX_CONNECTIONS = 10
  private static initialized = false

  static async initialize(): Promise<void> {
    if (this.initialized) return

    // Create connection pool
    for (let i = 0; i < this.MAX_CONNECTIONS; i++) {
      const prisma = new PrismaClient({
        log: ['warn', 'error']
      })
      this.connectionPool.push(prisma)
    }

    this.initialized = true
    logger.info(`[TransactionalDB] Connection pool initialized with ${this.MAX_CONNECTIONS} connections`)
  }

  private static async getConnection(): Promise<PrismaClient> {
    if (!this.initialized) {
      await this.initialize()
    }

    // Simple round-robin connection selection
    const connection = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)]
    if (!connection) {
      throw new Error('No database connections available')
    }
    return connection
  }

  static async executeBatchTransaction<T = any>(
    operations: DatabaseOperation[],
    options: TransactionOptions = {}
  ): Promise<BatchTransactionResult<T>> {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const prisma = await this.getConnection()
    
    const result: BatchTransactionResult<T> = {
      success: false,
      results: [],
      transactionId,
      operationsCompleted: 0,
      operationsFailed: 0,
      errors: []
    }

    try {
      logger.info(`[TransactionalDB] Starting batch transaction: ${transactionId} (${operations.length} operations)`)

      await prisma.$transaction(
        async (tx) => {
          const checkpoint = new TransactionCheckpoint()
          
          for (let i = 0; i < operations.length; i++) {
            const operation = operations[i]
            if (!operation) {
              logger.warn(`[TransactionalDB] Skipping undefined operation at index ${i}`)
              continue
            }
            
            try {
              // Create savepoint for each operation
              await checkpoint.createSavepoint(`sp_${operation.id}`)
              
              const operationResult = await this.executeOperation(tx, operation)
              result.results.push(operationResult)
              result.operationsCompleted++
              
              // Memory pressure check
              if (this.isMemoryPressureHigh()) {
                await this.performGarbageCollection()
              }
              
              // Progress logging every 100 operations
              if ((i + 1) % 100 === 0) {
                logger.info(`[TransactionalDB] Progress: ${i + 1}/${operations.length} operations completed`)
              }
              
            } catch (error) {
              result.operationsFailed++
              result.errors.push({
                operationId: operation.id,
                error: (error as Error).message
              })
              
              logger.error(`[TransactionalDB] Operation failed: ${operation.id}`, error)
              
              // Decide whether to continue or rollback entire transaction
              if (this.isCriticalOperation(operation)) {
                throw error // This will rollback the entire transaction
              }
            }
          }
          
          result.success = result.operationsFailed === 0
          return result
        },
        {
          timeout: options.timeout || 30000,
          isolationLevel: options.isolationLevel || Prisma.TransactionIsolationLevel.ReadCommitted
        }
      )

      logger.info(`[TransactionalDB] Batch transaction completed: ${transactionId} (${result.operationsCompleted}/${operations.length})`)
      
    } catch (error) {
      result.success = false
      result.errors.push({
        operationId: 'transaction_error',
        error: (error as Error).message
      })
      
      logger.error(`[TransactionalDB] Batch transaction failed: ${transactionId}`, error)
      
      // Retry mechanism
      const maxRetries = options.maxRetries || 3
      if (result.operationsFailed > 0 && maxRetries > 1) {
        logger.info(`[TransactionalDB] Retrying failed operations: ${result.operationsFailed} operations`)
        
        const failedOperations = operations.filter((operation, index) => 
          operation && result.errors.some(e => e.operationId === operation.id)
        )
        
        if (failedOperations.length > 0) {
          const retryResult = await this.executeBatchTransaction<T>(
            failedOperations, 
            { ...options, maxRetries: maxRetries - 1 }
          )
          
          // Merge results
          result.results.push(...retryResult.results)
          result.operationsCompleted += retryResult.operationsCompleted
          result.operationsFailed = retryResult.operationsFailed
        }
      }
    }

    return result
  }

  private static async executeOperation(tx: any, operation: DatabaseOperation): Promise<any> {
    const { type, table, data, where, options } = operation

    switch (type) {
      case 'insert':
        return await (tx as any)[table].create({ data, ...options })
        
      case 'update':
        return await (tx as any)[table].update({ 
          where: where || { id: data.id }, 
          data, 
          ...options 
        })
        
      case 'upsert':
        return await (tx as any)[table].upsert({
          where: where || { id: data.id },
          update: data,
          create: data,
          ...options
        })
        
      case 'delete':
        return await (tx as any)[table].delete({ 
          where: where || { id: data.id }, 
          ...options 
        })
        
      default:
        throw new Error(`Unsupported operation type: ${type}`)
    }
  }

  private static isCriticalOperation(operation: DatabaseOperation): boolean {
    // Define which operations are critical and should cause transaction rollback
    const criticalTables = ['fearGreedIndex', 'kospiData', 'kosdaqData']
    return criticalTables.includes(operation.table) || operation.options?.critical === true
  }

  static async persistWithOverlapDetection(
    data: any[],
    tableName: string,
    uniqueKeys: string[],
    batchSize: number = 1000
  ): Promise<PersistenceResult> {
    const result: PersistenceResult = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      totalProcessed: 0
    }

    if (data.length === 0) {
      return result
    }

    const prisma = await this.getConnection()
    
    logger.info(`[TransactionalDB] Starting overlap detection persistence: ${data.length} records in batches of ${batchSize}`)

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      const batchIndex = Math.floor(i / batchSize)
      
      try {
        // Check for existing records using unique keys
        const existingRecords = await this.checkExistingRecords(prisma, batch, tableName, uniqueKeys)
        const { newRecords, updateRecords } = this.categorizeRecords(batch, existingRecords, uniqueKeys)
        
        // Create operations for batch transaction
        const operations: DatabaseOperation[] = []
        
        // Add insert operations for new records
        newRecords.forEach((record, index) => {
          operations.push({
            id: `insert_${batchIndex}_${index}`,
            type: 'insert',
            table: tableName,
            data: record
          })
        })
        
        // Add update operations for existing records
        updateRecords.forEach((record, index) => {
          const whereClause = this.buildWhereClause(record, uniqueKeys)
          operations.push({
            id: `update_${batchIndex}_${index}`,
            type: 'update',
            table: tableName,
            data: record,
            where: whereClause
          })
        })
        
        // Execute batch transaction
        if (operations.length > 0) {
          const batchResult = await this.executeBatchTransaction(operations, {
            timeout: 60000 // 1 minute timeout for large batches
          })
          
          result.inserted += newRecords.length - batchResult.operationsFailed
          result.updated += updateRecords.length
          result.totalProcessed += batch.length
          
          if (batchResult.errors.length > 0) {
            result.errors.push({
              batch: batchIndex,
              error: `Batch processing errors: ${batchResult.errors.length}`,
              affectedRecords: batch.length
            })
          }
        } else {
          result.skipped += batch.length
          result.totalProcessed += batch.length
        }
        
        // Progress logging
        if ((batchIndex + 1) % 10 === 0) {
          logger.info(`[TransactionalDB] Batch progress: ${batchIndex + 1} batches processed`)
        }
        
      } catch (error) {
        result.errors.push({
          batch: batchIndex,
          error: (error as Error).message,
          affectedRecords: batch.length
        })
        
        logger.error(`[TransactionalDB] Batch ${batchIndex} processing failed:`, error)
      }
    }
    
    logger.info(`[TransactionalDB] Overlap detection persistence completed:`, {
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.length,
      totalProcessed: result.totalProcessed
    })

    return result
  }

  private static async checkExistingRecords(
    prisma: PrismaClient,
    batch: any[],
    tableName: string,
    uniqueKeys: string[]
  ): Promise<any[]> {
    if (batch.length === 0) return []

    // Build OR conditions for each record in the batch
    const orConditions = batch.map(record => {
      const condition: any = {}
      uniqueKeys.forEach(key => {
        if (record[key] !== undefined) {
          condition[key] = record[key]
        }
      })
      return condition
    })

    try {
      return await (prisma as any)[tableName].findMany({
        where: {
          OR: orConditions
        }
      })
    } catch (error) {
      logger.error(`[TransactionalDB] Error checking existing records in ${tableName}:`, error)
      return []
    }
  }

  private static categorizeRecords(
    batch: any[], 
    existingRecords: any[], 
    uniqueKeys: string[]
  ): { newRecords: any[]; updateRecords: any[] } {
    const newRecords: any[] = []
    const updateRecords: any[] = []

    batch.forEach(record => {
      const exists = existingRecords.some(existing => 
        uniqueKeys.every(key => existing[key] === record[key])
      )

      if (exists) {
        updateRecords.push(record)
      } else {
        newRecords.push(record)
      }
    })

    return { newRecords, updateRecords }
  }

  private static buildWhereClause(record: any, uniqueKeys: string[]): any {
    const whereClause: any = {}
    uniqueKeys.forEach(key => {
      if (record[key] !== undefined) {
        whereClause[key] = record[key]
      }
    })
    return whereClause
  }

  private static isMemoryPressureHigh(): boolean {
    const memUsage = process.memoryUsage()
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024
    
    // Consider memory pressure high if using > 85% of allocated heap
    return (heapUsedMB / heapTotalMB) > 0.85
  }

  private static async performGarbageCollection(): Promise<void> {
    if (global.gc) {
      global.gc()
      logger.debug('[TransactionalDB] Garbage collection performed')
    }
  }

  static async updateBatchProgress(
    transactionId: string, 
    operationId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    // This would typically update a progress tracking table
    logger.debug(`[TransactionalDB] Progress update: ${transactionId}/${operationId} -> ${status}`)
  }

  static async shutdown(): Promise<void> {
    logger.info('[TransactionalDB] Shutting down connection pool...')
    
    await Promise.all(
      this.connectionPool.map(async (prisma) => {
        try {
          await prisma.$disconnect()
        } catch (error) {
          logger.error('[TransactionalDB] Error disconnecting from database:', error)
        }
      })
    )
    
    this.connectionPool = []
    this.initialized = false
    
    logger.info('[TransactionalDB] Connection pool shutdown completed')
  }

  static getConnectionStats(): {
    totalConnections: number
    activeConnections: number
    initialized: boolean
  } {
    return {
      totalConnections: this.connectionPool.length,
      activeConnections: this.connectionPool.length, // Simplified - would need actual tracking
      initialized: this.initialized
    }
  }
}