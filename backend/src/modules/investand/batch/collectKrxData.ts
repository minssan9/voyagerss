#!/usr/bin/env ts-node

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables immediately
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { KrxCollectionService } from '@investand/collectors/krxCollectionService'
import { formatDate } from '@investand/utils/common/dateUtils'
import { logger } from '@investand/utils/common/logger'

/**
 * KRX 데이터 수집 CLI 스크립트
 * 사용법: npm run collect:krx [YYYY-MM-DD]
 */

const dateOptions = {
    today: () => formatDate(new Date()),
    yesterday: () => {
        const date = new Date()
        date.setDate(date.getDate() - 1)
        return formatDate(date)
    },
    'last-business': () => KrxCollectionService.getLastBusinessDay(1)
} as const

async function main(): Promise<void> {
    try {
        const args = process.argv.slice(2)
        const dateInput = args.find(arg => !arg.startsWith('--'))

        let targetDate = dateInput || dateOptions.today()
        if (targetDate in dateOptions) {
            targetDate = dateOptions[targetDate as keyof typeof dateOptions]()
        }

        const dryRun = args.includes('--dry-run')
        const noSave = args.includes('--no-save') || dryRun

        console.log('\n=== KRX 시장데이터 수집 ===')
        console.log(`수집 날짜: ${targetDate}`)
        console.log(`저장 모드: ${noSave ? '미리보기' : '저장'}`)

        const result = await KrxCollectionService.collectDailyMarketData(targetDate, !noSave)

        console.log('\n=== 수집 결과 ===')
        console.log(`KOSPI 성공: ${result.kospiSuccess}`)
        console.log(`KOSDAQ 성공: ${result.kosdaqSuccess}`)
        console.log(`투자자데이터 성공: ${result.investorDataSuccess}`)

        if (result.summary.errors.length > 0) {
            console.log('\n⚠️  발생한 오류:')
            result.summary.errors.forEach(err => console.log(`   - ${err}`))
        }

        console.log('\n✅ 수집 완료')

    } catch (error) {
        logger.error('[KRX CLI] 수집 실패:', error)
        console.error(`\n❌ 수집 실패: ${error instanceof Error ? error.message : error}`)
        process.exit(1)
    }
}

if (require.main === module) {
    main()
}

export { main }
