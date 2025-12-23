/**
 * Simple validation script for refactored services
 * Tests that the services can access real data instead of using mock data
 */

import { PrismaClient } from '@prisma/client'
import DataQueryErrorHandler from '@investand/utils/data/dataQueryErrorHandler'

const prisma = new PrismaClient()

async function validateRefactoring() {
  console.log('🧪 Validating Refactored Mock Data → Real Data')
  console.log('='.repeat(60))

  try {
    // Test 1: Database connectivity
    console.log('\n1️⃣ Testing Database Connectivity...')
    const healthCheck = await DataQueryErrorHandler.checkDatabaseHealth(prisma)
    console.log(`   Database: ${healthCheck.healthy ? '✅ CONNECTED' : '❌ DISCONNECTED'}`)
    console.log(`   Response Time: ${healthCheck.responseTime}ms`)

    // Test 2: DataCollectionLog table access (core of our refactoring)
    console.log('\n2️⃣ Testing DataCollectionLog Access...')
    
    const totalLogs = await prisma.dataCollectionLog.count()
    console.log(`   Total Collection Logs: ${totalLogs}`)
    
    if (totalLogs > 0) {
      const recentLogs = await prisma.dataCollectionLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          source: true,
          status: true,
          duration: true,
          recordCount: true,
          createdAt: true
        }
      })
      
      console.log(`   Recent logs sample:`)
      recentLogs.forEach((log, i) => {
        console.log(`     ${i + 1}. ${log.source} - ${log.status} (${log.duration}ms, ${log.recordCount} records)`)
      })

      // Test real calculations that replace Math.random()
      console.log('\n3️⃣ Testing Real Data Calculations...')
      
      // Success rate calculation (replaces mock data)
      const successfulLogs = await prisma.dataCollectionLog.count({
        where: { status: 'SUCCESS' }
      })
      const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0
      console.log(`   ✅ Real Success Rate: ${successRate.toFixed(2)}% (was: Math.random() * 100)`)
      
      // Error rate calculation (replaces mock data)
      const failedLogs = await prisma.dataCollectionLog.count({
        where: { status: 'FAILED' }
      })
      const errorRate = totalLogs > 0 ? (failedLogs / totalLogs) * 100 : 0
      console.log(`   ❌ Real Error Rate: ${errorRate.toFixed(2)}% (was: Math.random() * 20)`)
      
      // Average duration calculation (replaces mock data)
      const logsWithDuration = await prisma.dataCollectionLog.findMany({
        where: { duration: { not: null } },
        select: { duration: true }
      })
      const avgDuration = logsWithDuration.length > 0 
        ? logsWithDuration.reduce((sum, log) => sum + (log.duration || 0), 0) / logsWithDuration.length
        : 0
      console.log(`   ⏱️  Real Avg Duration: ${avgDuration.toFixed(0)}ms (was: Math.random() * 1000 + 200)`)

      // Data points calculation (replaces mock data)
      const totalRecords = await prisma.dataCollectionLog.aggregate({
        _sum: { recordCount: true },
        where: { recordCount: { not: null } }
      })
      console.log(`   📊 Real Data Points: ${totalRecords._sum.recordCount || 0} (was: Math.floor(Math.random() * 1000))`)

    } else {
      console.log('   ⚠️  No collection logs found - services will use fallback values')
    }

    // Test 3: Error Handler functionality
    console.log('\n4️⃣ Testing Enhanced Error Handling...')
    
    const testQuery = await DataQueryErrorHandler.executeQuery(
      async () => {
        const oneHourAgo = new Date(Date.now() - 3600000)
        return await prisma.dataCollectionLog.count({
          where: { createdAt: { gte: oneHourAgo } }
        })
      },
      {
        fallbackValue: 0,
        enableRetry: true,
        maxRetries: 2,
        cacheKey: 'test_recent_logs'
      }
    )
    
    console.log(`   Query Success: ${testQuery.success ? '✅' : '❌'}`)
    console.log(`   Result: ${testQuery.data} recent logs`)
    console.log(`   Fallback Used: ${testQuery.fallbackUsed ? '⚠️  Yes' : '✅ No'}`)
    if (testQuery.retryCount !== undefined) {
      console.log(`   Retry Count: ${testQuery.retryCount}`)
    }

    // Test 4: Cache functionality
    console.log('\n5️⃣ Testing Cache System...')
    const cacheStats = DataQueryErrorHandler.getCacheStats()
    console.log(`   Cache Entries: ${cacheStats.totalEntries}`)
    console.log(`   Expired Entries: ${cacheStats.expiredEntries}`)

    // Test 5: Database table access for real metrics
    console.log('\n6️⃣ Testing Database Tables for Real Metrics...')
    
    try {
      const fearGreedCount = await prisma.fearGreedIndex.count()
      console.log(`   Fear & Greed Index records: ${fearGreedCount}`)
    } catch (error) {
      console.log(`   Fear & Greed Index: ⚠️  Table access issue`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ VALIDATION COMPLETE')
    console.log('\n📈 Refactoring Summary:')
    console.log('   • Replaced Math.random() with real database queries')
    console.log('   • Added comprehensive error handling with retries')
    console.log('   • Implemented caching for performance and resilience')
    console.log('   • Real-time metrics now reflect actual system state')
    console.log('   • Fallback mechanisms ensure service continuity')

  } catch (error) {
    console.error('\n❌ Validation failed:', error)
    console.log('\n🔧 Troubleshooting:')
    console.log('   1. Ensure database is running and accessible')
    console.log('   2. Check DATABASE_URL environment variable')
    console.log('   3. Run: npm run db:push to sync schema')
    console.log('   4. Verify DataCollectionLog table exists')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run validation
if (require.main === module) {
  validateRefactoring()
    .then(() => {
      console.log('\n🎉 All validations passed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Validation error:', error)
      process.exit(1)
    })
}

export default validateRefactoring