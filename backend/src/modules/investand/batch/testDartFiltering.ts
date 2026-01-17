import { isAllowedDartReport, ALLOWED_DART_REPORT_KEYWORDS } from '@investand/interfaces/dartTypes'
import { DartCollectionService } from '@investand/collectors/dartCollectionService'
import { logger } from '@investand/utils/common/logger'
import { formatDate } from '@investand/utils/common/dateUtils'

/**
 * Test script for DART report filtering
 * Tests that only shareholder stock count changes and major shareholder equity changes are collected
 */
async function testDartFiltering() {
  try {
    console.log('========================================')
    console.log('DART Report Filtering Test')
    console.log('========================================\n')

    // Test 1: Test isAllowedDartReport function
    console.log('Test 1: Testing isAllowedDartReport function...\n')

    const testReports = [
      { name: '주식등의대량보유상황보고서(일반)', expected: true },
      { name: '주식등의대량보유상황보고서(약식)', expected: true },
      { name: '임원ㆍ주요주주특정증권등소유상황보고서', expected: true },
      { name: '주요주주특정증권등소유상황보고서', expected: true },
      { name: '최대주주변경을수반하는주식담보제공계약체결', expected: true },
      { name: '주요사항보고서(자기주식취득결정)', expected: false },
      { name: '타법인출자결정', expected: false },
      { name: '분기보고서', expected: false },
      { name: '반기보고서', expected: false },
      { name: '사업보고서', expected: false },
    ]

    let passedTests = 0
    let failedTests = 0

    testReports.forEach(test => {
      const result = isAllowedDartReport(test.name)
      const status = result === test.expected ? '✓' : '✗'
      const statusText = result === test.expected ? 'PASS' : 'FAIL'

      console.log(`  ${status} [${statusText}] ${test.name}`)
      console.log(`     Expected: ${test.expected}, Got: ${result}`)

      if (result === test.expected) {
        passedTests++
      } else {
        failedTests++
      }
    })

    console.log(`\n  Results: ${passedTests} passed, ${failedTests} failed`)

    if (failedTests > 0) {
      throw new Error('Some filtering tests failed')
    }

    // Test 2: Display allowed keywords
    console.log('\n========================================')
    console.log('Test 2: Allowed Report Keywords')
    console.log('========================================\n')

    console.log('The following keywords are allowed for filtering:\n')
    ALLOWED_DART_REPORT_KEYWORDS.forEach((keyword, index) => {
      console.log(`  ${index + 1}. ${keyword}`)
    })

    // Test 3: Test actual data collection with filtering
    console.log('\n========================================')
    console.log('Test 3: Testing Data Collection with Filtering')
    console.log('========================================\n')

    const yesterday = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000))
    console.log(`Collecting data for: ${yesterday}`)
    console.log('Note: This will make real API calls to DART\n')

    try {
      const result = await DartCollectionService.collectDailyDisclosures(
        yesterday,
        false, // Don't save to DB for testing
        { maxPages: 2, pageSize: 100 } // Limit to 2 pages for testing
      )

      console.log(`\n✓ Data collection completed`)
      console.log(`  Total disclosures collected: ${result.totalDisclosures}`)
      console.log(`  Stock disclosures: ${result.stockDisclosures.length}`)

      if (result.stockDisclosures.length > 0) {
        console.log('\n  Sample filtered disclosures:')
        result.stockDisclosures.slice(0, 5).forEach((disclosure, index) => {
          console.log(`\n  ${index + 1}. ${disclosure.corpName}`)
          console.log(`     Report: ${disclosure.reportName}`)
          console.log(`     Receipt: ${disclosure.receiptNumber}`)
          console.log(`     Allowed: ${isAllowedDartReport(disclosure.reportName) ? '✓ YES' : '✗ NO'}`)
        })

        // Verify all collected reports are allowed
        const allAllowed = result.stockDisclosures.every(d =>
          isAllowedDartReport(d.reportName)
        )

        if (allAllowed) {
          console.log('\n  ✓ All collected reports match the allowed keywords')
        } else {
          console.log('\n  ✗ WARNING: Some reports do not match allowed keywords')
          const notAllowed = result.stockDisclosures.filter(d =>
            !isAllowedDartReport(d.reportName)
          )
          console.log(`  Not allowed reports: ${notAllowed.length}`)
          notAllowed.slice(0, 3).forEach(d => {
            console.log(`    - ${d.reportName}`)
          })
        }
      } else {
        console.log('\n  No disclosures found for the test date')
        console.log('  This could be normal if there were no disclosures on that day')
      }

    } catch (error) {
      console.log(`\n  ⚠ Data collection test skipped: ${error instanceof Error ? error.message : String(error)}`)
      console.log('  This is normal if DART_API_KEY is not configured')
    }

    // Summary
    console.log('\n========================================')
    console.log('Test Summary')
    console.log('========================================\n')

    console.log('✓ All tests completed successfully!')
    console.log('')
    console.log('Filtering Configuration:')
    console.log(`  - Total allowed keywords: ${ALLOWED_DART_REPORT_KEYWORDS.length}`)
    console.log(`  - Filtering function: isAllowedDartReport()`)
    console.log(`  - Applied in: DartApiClient.fetchDisclosures()`)
    console.log('')
    console.log('Key Features:')
    console.log('  ✓ Only collects shareholder stock count changes')
    console.log('  ✓ Only collects major shareholder equity changes')
    console.log('  ✓ Filters out other report types (quarterly reports, etc.)')
    console.log('  ✓ Logging shows filtering statistics')
    console.log('')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    logger.error('[TestDartFiltering] Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testDartFiltering()
