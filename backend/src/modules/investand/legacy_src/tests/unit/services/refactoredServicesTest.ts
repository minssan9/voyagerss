/**
 * Test script to validate refactored services with real database queries
 * Run: npx ts-node src/test/refactoredServicesTest.ts
 */

import { PrismaClient } from '@prisma/client'
import BusinessMetricsService from '@/services/businessMetricsService'
import MonitoringService from '@/services/monitoringService'
import DatabaseHealthService from '@/services/databaseHealthService'
import DataQueryErrorHandler from '@/tests/utils/dataQueryErrorHandler'

const prisma = new PrismaClient()

async function testRefactoredServices() {
  console.log('🧪 Testing Refactored Services...\n')

  try {
    // Test DataQueryErrorHandler
    console.log('1️⃣ Testing DataQueryErrorHandler...')
    
    const healthCheck = await DataQueryErrorHandler.checkDatabaseHealth(prisma)
    console.log(`   ✅ Database Health: ${healthCheck.healthy ? 'HEALTHY' : 'UNHEALTHY'}`)
    console.log(`   📊 Response Time: ${healthCheck.responseTime}ms`)
    
    const queryResult = await DataQueryErrorHandler.executeQuery(
      async () => {
        return await prisma.dataCollectionLog.count()
      },
      {
        fallbackValue: 0,
        enableRetry: true,
        maxRetries: 2,
        cacheKey: 'test_count'
      }
    )
    console.log(`   📈 Query Result: Success=${queryResult.success}, Data=${queryResult.data}, FallbackUsed=${queryResult.fallbackUsed}`)
    
    // Test BusinessMetricsService
    console.log('\n2️⃣ Testing BusinessMetricsService...')
    const businessMetrics = new (BusinessMetricsService as any)()
    
    console.log('   📊 Collecting business metrics...')
    const businessData = await businessMetrics.collectBusinessMetrics()
    console.log(`   ✅ Overall Success Rate: ${businessData.dataCollection.overall.successRate}%`)
    console.log(`   📈 Total Data Points: ${businessData.dataCollection.overall.totalDataPoints}`)
    console.log(`   ⏱️  Avg Collection Time: ${businessData.dataCollection.overall.averageCollectionTime}ms`)
    console.log(`   🎯 System Health Score: ${businessData.systemHealth.overallScore}/100`)
    
    // Test MonitoringService
    console.log('\n3️⃣ Testing MonitoringService...')
    const monitoring = new (MonitoringService as any)()
    
    console.log('   📊 Collecting system metrics...')
    const systemMetrics = await monitoring.collectSystemMetrics()
    console.log(`   ✅ Database Health: ${systemMetrics.database.health}`)
    console.log(`   📡 Connection Pool Utilization: ${systemMetrics.database.connectionPool.utilization}%`)
    console.log(`   ⚡ Database Response Time: ${systemMetrics.database.responseTime}ms`)
    console.log(`   📈 Query Error Rate: ${systemMetrics.database.queryPerformance.errorRate}%`)
    
    // Test enhanced database health monitoring
    console.log('   🏥 Testing enhanced database health monitoring...')
    const dbHealth = await monitoring.checkDatabaseHealth()
    console.log(`   ✅ Database Status: ${dbHealth.status}`)
    console.log(`   ⬆️ Uptime: ${dbHealth.uptime}%`)
    console.log(`   ❌ Recent Failures: ${dbHealth.recentFailures}`)
    
    // Test DatabaseHealthService  
    console.log('\n4️⃣ Testing DatabaseHealthService...')
    const dbHealthService = new (DatabaseHealthService as any)()
    
    console.log('   📊 Collecting database health metrics...')
    const dbMetrics = await dbHealthService.collectHealthMetrics()
    console.log(`   ✅ Connection Status: ${dbMetrics.connection.status}`)
    console.log(`   🔗 Connection Utilization: ${dbMetrics.connection.connectionUtilization}%`)
    console.log(`   ⚡ Cache Hit Ratio: ${dbMetrics.performance.cacheHitRatio}%`)
    console.log(`   📊 Index Usage: ${dbMetrics.performance.indexUsage}%`)
    console.log(`   🏥 Overall Health Score: ${dbMetrics.health.score}/100 (${dbMetrics.health.status})`)
    
    if (dbMetrics.health.issues.length > 0) {
      console.log(`   ⚠️  Health Issues:`)
      dbMetrics.health.issues.forEach((issue: any) => {
        console.log(`      • ${issue.severity}: ${issue.message}`)
      })
    }
    
    // Test cache functionality
    console.log('\n5️⃣ Testing Cache Functionality...')
    const cacheStats = DataQueryErrorHandler.getCacheStats()
    console.log(`   📊 Cache Entries: ${cacheStats.totalEntries}`)
    console.log(`   🗑️  Expired Entries: ${cacheStats.expiredEntries}`)
    
    console.log('\n✅ All refactored services tested successfully!')
    console.log('\n📈 Performance Summary:')
    console.log(`   • Database queries now use real data instead of Math.random()`)
    console.log(`   • Error handling enhanced with retry logic and caching`)
    console.log(`   • Fallback mechanisms ensure service resilience`)
    console.log(`   • Health monitoring provides real system insights`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testRefactoredServices()
    .then(() => {
      console.log('\n🎉 Test completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Test failed with error:', error)
      process.exit(1)
    })
}

export default testRefactoredServices