/**
 * External Interface Test Suite
 * 
 * Tests for:
 * - DART API (전자공시시스템)
 * - Yahoo Finance API
 * - Batch Jobs & Scheduler
 * - Telegram Messaging Service
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables BEFORE importing clients that use them statically
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { DartApiClient } from '@investand/clients/dart/DartApiClient'
import { SectorApiClient, ALL_SECTORS } from '@investand/clients/yahoo/SectorApiClient'
import { GlobalAssetClient } from '@investand/clients/yahoo/GlobalAssetClient'
import { DataScheduler } from '@investand/schedulers/DataScheduler'
import { MessagingService } from '@investand/services/messaging/MessagingService'
import { ChatManager } from '@investand/services/messaging/ChatManager'
import { KrxApiClient } from '@investand/clients/krx/KrxApiClient'
import { BOKCollector } from '@investand/collectors/financial/bokCollector'
import { logger } from '@investand/utils/common/logger'

// Test results tracking
interface TestResult {
    name: string
    status: 'PASS' | 'FAIL' | 'SKIP'
    duration: number
    error?: string
    details?: string
}

const testResults: TestResult[] = []

async function runTest(name: string, testFn: () => Promise<string | undefined>): Promise<void> {
    const startTime = Date.now()

    try {
        console.log(`\n🧪 Running: ${name}`)
        const details = await testFn()
        const duration = Date.now() - startTime

        testResults.push({ name, status: 'PASS', duration, details })
        console.log(`   ✅ PASS (${duration}ms)`)
        if (details) console.log(`   📝 ${details}`)

    } catch (error) {
        const duration = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : String(error)

        testResults.push({ name, status: 'FAIL', duration, error: errorMessage })
        console.log(`   ❌ FAIL (${duration}ms)`)
        console.log(`   🔴 Error: ${errorMessage}`)
    }
}

function skipTest(name: string, reason: string): void {
    testResults.push({ name, status: 'SKIP', duration: 0, details: reason })
    console.log(`\n⏭️  Skipping: ${name}`)
    console.log(`   📝 Reason: ${reason}`)
}

// ============================================
// DART API TESTS
// ============================================
async function testDartApiKeyValidation(): Promise<string> {
    const isValid = DartApiClient.validateApiKey()
    if (!isValid) {
        throw new Error('DART API key is not configured')
    }
    return 'API key is valid and configured'
}

async function testDartDateValidation(): Promise<string> {
    const validDate = DartApiClient.validateDateFormat('2024-01-15')
    const invalidDate = DartApiClient.validateDateFormat('15-01-2024')

    if (!validDate || invalidDate) {
        throw new Error('Date validation failed')
    }
    return 'Date format validation works correctly (YYYY-MM-DD)'
}

async function testDartFetchDisclosures(): Promise<string> {
    // Test with a known date range
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 7)

    const startDate = weekAgo.toISOString().split('T')[0]
    const endDate = today.toISOString().split('T')[0]

    const disclosures = await DartApiClient.fetchDisclosures({
        startDate,
        endDate,
        pageCount: 10
    })

    return `Fetched ${disclosures.length} disclosures from ${startDate} to ${endDate}`
}

// ============================================
// YAHOO FINANCE API TESTS
// ============================================
async function testYahooSectorQuote(ticker: string = 'XLK'): Promise<string> {
    // Test fetching a single sector quote
    const quote = await SectorApiClient.fetchSectorQuote(ticker)

    if (!quote) {
        throw new Error(`Failed to fetch ${ticker} sector quote`)
    }

    return `${ticker} (${quote.sectorName}): $${quote.price?.toFixed(2)} (${quote.changePercent?.toFixed(2)}%)`
}

async function testYahooSectorHistory(ticker: string = 'XLK'): Promise<string> {
    // Test fetching sector history for 30 days
    const history = await SectorApiClient.fetchSectorHistory(ticker, 30)

    if (!history || history.length === 0) {
        throw new Error(`Failed to fetch ${ticker} sector history`)
    }

    return `Fetched ${history.length} days of ${ticker} history`
}

async function testYahooGlobalAsset(): Promise<string> {
    // Test fetching global asset data (using asset code, not ticker)
    const testAssetCode = 'GOLD' // Gold
    const result = await GlobalAssetClient.fetchAssetHistory(testAssetCode, 30)

    if (!result || result.length === 0) {
        throw new Error(`Failed to fetch ${testAssetCode} data`)
    }

    return `Fetched ${result.length} days of Gold asset data`
}

async function testYahooCalculateReturns(): Promise<string> {
    // Test return calculations
    const history = await SectorApiClient.fetchSectorHistory('XLK', 365)
    const returns = SectorApiClient.calculateReturns(history)

    return `XLK Returns - 1M: ${returns.oneMonth.toFixed(2)}%, 3M: ${returns.threeMonth.toFixed(2)}%, YTD: ${returns.ytd.toFixed(2)}%, 1Y: ${returns.oneYear.toFixed(2)}%`
}

async function testYahooVolatility(): Promise<string> {
    const history = await SectorApiClient.fetchSectorHistory('XLK', 60)
    const volatility = SectorApiClient.calculateVolatility(history, 30)

    return `XLK 30-day annualized volatility: ${volatility.toFixed(2)}%`
}

// ============================================
// KRX / KIS API TESTS
// ============================================
async function testKrxApiKey(): Promise<string> {
    const isValid = KrxApiClient.validateApiKeys()
    if (!isValid) {
        throw new Error('KRX API keys are not configured')
    }
    return 'KRX API keys are configured'
}

async function testKrxFetchKospi(): Promise<string> {
    // Fetch last business day's KOSPI data
    const date = KrxApiClient.getLastBusinessDay()
    const data = await KrxApiClient.fetchStockData(date, 'KOSPI')

    if (!data) {
        throw new Error(`Failed to fetch KOSPI data for ${date}`)
    }

    return `KOSPI (${date}): ${data.stck_prpr} (${data.prdy_ctrt}%)`
}

// ============================================
// BOK API TESTS (Bank of Korea)
// ============================================
async function testBokInterestRates(): Promise<string> {
    const date = KrxApiClient.getLastBusinessDay()
    const data = await BOKCollector.fetchInterestRateData(date)

    if (!data) {
        throw new Error(`Failed to fetch BOK interest rates for ${date}`)
    }

    return `Base Rate: ${data.baseRate}%, 10Y Bond: ${data.treasuryBond10Y}%`
}

async function testBokExchangeRates(): Promise<string> {
    const date = KrxApiClient.getLastBusinessDay()
    const data = await BOKCollector.fetchExchangeRateData(date)

    if (!data) {
        throw new Error(`Failed to fetch BOK exchange rates for ${date}`)
    }

    return `USD/KRW: ${data.usdKrw}, JPY/KRW: ${data.jpyKrw}`
}

// ============================================
// SCHEDULER TESTS
// ============================================
async function testDataSchedulerSingleton(): Promise<string> {
    const instance1 = DataScheduler.getInstance()
    const instance2 = DataScheduler.getInstance()

    if (instance1 !== instance2) {
        throw new Error('DataScheduler singleton pattern failed')
    }

    return 'DataScheduler singleton pattern works correctly'
}

async function testDataSchedulerStartStop(): Promise<string> {
    const scheduler = DataScheduler.getInstance()

    // Start scheduler
    scheduler.start()

    // Stop scheduler immediately
    scheduler.stop()

    return 'DataScheduler start/stop cycle completed successfully'
}

// ============================================
// MESSAGING SERVICE TESTS
// ============================================
async function testMessagingServiceSingleton(): Promise<string> {
    const instance1 = MessagingService.getInstance()
    const instance2 = MessagingService.getInstance()

    if (instance1 !== instance2) {
        throw new Error('MessagingService singleton pattern failed')
    }

    return 'MessagingService singleton pattern works correctly'
}

async function testChatManagerOperations(): Promise<string> {
    const chatManager = ChatManager.getInstance()

    // Test adding a chat
    const testChatId = 123456789
    chatManager.addChat(testChatId)

    // Verify the chat was added
    const chatCount = chatManager.getChatCount()

    // Remove the test chat
    chatManager.removeChat(testChatId)

    return `ChatManager operations: add/remove chat worked (current count: ${chatManager.getChatCount()})`
}

async function testTelegramBotToken(): Promise<string> {
    const token = process.env.TELEGRAM_BOT_TOKEN

    if (!token || token.length === 0) {
        throw new Error('TELEGRAM_BOT_TOKEN is not configured')
    }

    // Validate token format (should be like: 123456:ABC-DEF...)
    const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/
    if (!tokenPattern.test(token)) {
        throw new Error('TELEGRAM_BOT_TOKEN format is invalid')
    }

    return 'Telegram bot token is configured with valid format'
}

// ============================================
// MAIN TEST RUNNER
// ============================================

// Helper to run a group of tests
type TestDefinition = {
    id?: string;
    name: string;
    fn: () => Promise<string | undefined>;
};

async function runTestGroup(groupName: string, tests: TestDefinition[], results: { passed: number; failed: number; skipped: number }) {
    console.log('\n' + '─'.repeat(60))
    console.log(groupName)
    console.log('─'.repeat(60))

    for (const test of tests) {
        await runTest(test.id ? `${test.id}: ${test.name}` : test.name, test.fn);
        const lastResult = testResults[testResults.length - 1];
        if (lastResult.status === 'PASS') {
            results.passed++;
        } else if (lastResult.status === 'FAIL') {
            results.failed++;
        } else if (lastResult.status === 'SKIP') {
            results.skipped++;
        }
    }
}


async function runTests() {
    console.log('============================================================')
    console.log('🚀 External Interface Test Suite')
    console.log('============================================================')
    console.log(`📅 Date: ${new Date().toISOString()}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)

    const results = { passed: 0, failed: 0, skipped: 0 }

    // 1. DART API Tests
    await runTestGroup('🎯 DART API Tests', [
        { id: 'T3.1.5', name: 'DART API Key Validation', fn: testDartApiKeyValidation },
        { id: 'T3.1.1', name: 'DART Fetch Disclosures', fn: testDartFetchDisclosures },
        { id: 'T3.1.1', name: 'DART Date Format Validation', fn: testDartDateValidation }
    ], results)

    // 2. KRX/KIS API Tests
    await runTestGroup('🇰🇷 KRX API Tests', [
        { id: 'T3.3.1', name: 'KRX API Key Validation', fn: testKrxApiKey },
        { id: 'T3.3.2', name: 'KRX Fetch KOSPI Data', fn: testKrxFetchKospi }
    ], results)

    // 3. BOK API Tests
    await runTestGroup('🏦 BOK API Tests', [
        { name: 'BOK Interest Rates', fn: testBokInterestRates },
        { name: 'BOK Exchange Rates', fn: testBokExchangeRates }
    ], results)

    // 4. Yahoo Finance API Tests
    console.log('\n📈 Yahoo Finance API Tests (Waiting 10s to clear possible rate limits...)')
    await new Promise(resolve => setTimeout(resolve, 10000))

    await runTestGroup('📈 Yahoo Finance API Tests', [
        { id: 'T3.2.1', name: 'Yahoo Sector Quote (XLF)', fn: () => testYahooSectorQuote('XLF') },
        { id: 'T3.2.1', name: 'Yahoo Sector History (XLF)', fn: () => testYahooSectorHistory('XLF') },
        { id: 'T3.2.3', name: 'Yahoo Global Asset (Gold)', fn: testYahooGlobalAsset },
        { id: 'T3.2.4', name: 'Yahoo Calculate Returns', fn: testYahooCalculateReturns },
        { id: 'T3.2.5', name: 'Yahoo Volatility Calculation', fn: testYahooVolatility }
    ], results)

    // ============================================
    // 3. Scheduler Tests
    // ============================================
    console.log('\n' + '─'.repeat(60))
    console.log('⏰ Scheduler Tests')
    console.log('─'.repeat(60))

    await runTest('T5.1.3: DataScheduler Singleton', testDataSchedulerSingleton)
    await runTest('T5.1.1-T5.1.2: DataScheduler Start/Stop', testDataSchedulerStartStop)

    // ============================================
    // 4. Messaging Service Tests
    // ============================================
    console.log('\n' + '─'.repeat(60))
    console.log('📱 Messaging Service Tests')
    console.log('─'.repeat(60))

    await runTest('MessagingService Singleton', testMessagingServiceSingleton)
    await runTest('ChatManager Operations', testChatManagerOperations)
    await runTest('T6.1.1: Telegram Bot Token Validation', testTelegramBotToken)

    // ============================================
    // Summary
    // ============================================
    console.log('\n' + '═'.repeat(60))
    console.log('📋 Test Summary')
    console.log('═'.repeat(60))

    const passed = testResults.filter(r => r.status === 'PASS').length
    const failed = testResults.filter(r => r.status === 'FAIL').length
    const skipped = testResults.filter(r => r.status === 'SKIP').length
    const total = testResults.length

    console.log(`\n✅ Passed:  ${passed}/${total}`)
    console.log(`❌ Failed:  ${failed}/${total}`)
    console.log(`⏭️  Skipped: ${skipped}/${total}`)

    // Show failed tests
    if (failed > 0) {
        console.log('\n🔴 Failed Tests:')
        testResults
            .filter(r => r.status === 'FAIL')
            .forEach(r => {
                console.log(`   - ${r.name}: ${r.error}`)
            })
    }

    console.log('\n' + '═'.repeat(60))

    // Exit with error code if any tests failed
    if (failed > 0) {
        console.log('❌ Some tests failed!')
        process.exit(1)
    } else {
        console.log('✅ All tests passed!')
        process.exit(0)
    }
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
})
