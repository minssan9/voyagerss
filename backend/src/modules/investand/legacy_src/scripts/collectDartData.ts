#!/usr/bin/env ts-node

import { DartCollectionService } from '@/collectors/dartCollectionService'
import { formatDate } from '@/utils/common/dateUtils'
import { logger } from '@/utils/common/logger'

/**
 * DART 데이터 수집 CLI 스크립트
 * 사용법: npm run collect:dart [YYYY-MM-DD]
 * 
 * 예시:
 * npm run collect:dart               # 오늘 날짜
 * npm run collect:dart 2024-01-15    # 특정 날짜
 * npm run collect:dart yesterday     # 어제
 * npm run collect:dart last-business # 마지막 영업일
 */

// 미리 정의된 날짜 옵션
const dateOptions = {
  today: () => formatDate(new Date()),
  yesterday: () => {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    return formatDate(date)
  },
  'last-business': () => DartCollectionService.getLastBusinessDay(1),
  'last-week': () => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return formatDate(date)
  }
} as const

type DateOptionKey = keyof typeof dateOptions

/**
 * 날짜 입력 파싱 및 검증
 */
function parseAndValidateDate(input?: string): string {
  // 1. 입력값이 없으면 오늘 날짜
  if (!input) {
    return dateOptions.today()
  }

  // 2. 미리 정의된 옵션 확인
  if (input in dateOptions) {
    return dateOptions[input as DateOptionKey]()
  }

  // 3. YYYY-MM-DD 형식 검증
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(input)) {
    throw new Error(`
잘못된 날짜 형식입니다: ${input}

사용 가능한 형식:
  YYYY-MM-DD     예: 2024-01-15
  today          오늘
  yesterday      어제  
  last-business  마지막 영업일
  last-week      일주일 전

사용법: npm run collect:dart [날짜]
    `)
  }

  // 4. 날짜 유효성 검증
  const date = new Date(input)
  if (isNaN(date.getTime())) {
    throw new Error(`유효하지 않은 날짜입니다: ${input}`)
  }

  // 5. 미래 날짜 체크
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  
  if (date > today) {
    throw new Error(`미래 날짜는 수집할 수 없습니다: ${input}`)
  }

  return input
}

/**
 * 보고서 코드 이름 반환
 */
function getReportTypeName(code: string): string {
  const types: Record<string, string> = {
    'A': '정기공시',
    'B': '주요사항보고',
    'C': '발행공시',
    'D': '지분공시'
  }
  return types[code] || '기타'
}

/**
 * 사용법 도움말 출력
 */
function printUsage(): void {
  console.log(`
DART 지분공시 수집 도구 (D 타입 전용)

사용법:
  npm run collect:dart [날짜옵션]

날짜 옵션:
  없음                  오늘 날짜로 수집
  YYYY-MM-DD           특정 날짜 (예: 2024-01-15)
  today                오늘
  yesterday            어제
  last-business        마지막 영업일
  last-week            일주일 전

예시:
  npm run collect:dart
  npm run collect:dart 2024-01-15
  npm run collect:dart yesterday
  npm run collect:dart last-business

옵션:
  --help, -h           이 도움말 출력
  --dry-run            실제 저장 없이 미리보기
  --no-save            데이터베이스에 저장하지 않음

고급 옵션:
  --max-pages=N        최대 수집 페이지 수 (기본: 50, 범위: 1-100)
  --page-size=N        페이지당 건수 (기본: 100, 범위: 1-100)

주의: 이 시스템은 지분공시(D) 타입만 수집하도록 최적화되었습니다.
`)
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2)
    
    // 도움말 옵션 확인
    if (args.includes('--help') || args.includes('-h')) {
      printUsage()
      return
    }

    // 날짜 파싱
    const dateInput = args.find(arg => !arg.startsWith('--'))
    const targetDate = parseAndValidateDate(dateInput)
    
    // 옵션 파싱
    const dryRun = args.includes('--dry-run')
    const noSave = args.includes('--no-save') || dryRun
    
    // 고급 옵션 파싱 (reportCode 제거됨)
    const maxPagesArg = args.find(arg => arg.startsWith('--max-pages='))
    const pageSizeArg = args.find(arg => arg.startsWith('--page-size='))
    
    const maxPages = maxPagesArg ? parseInt(maxPagesArg.split('=')[1] || '0') : undefined
    const pageSize = pageSizeArg ? parseInt(pageSizeArg.split('=')[1] || '0') : undefined
    
    // 옵션 검증
    if (maxPages && (maxPages < 1 || maxPages > 100)) {
      throw new Error('--max-pages는 1-100 사이의 값이어야 합니다')
    }
    if (pageSize && (pageSize < 1 || pageSize > 100)) {
      throw new Error('--page-size는 1-100 사이의 값이어야 합니다')
    }
    
    // 실행 정보 출력 (지분공시 전용)
    console.log('\n=== DART 지분공시 수집 ===')
    console.log(`수집 날짜: ${targetDate}`)
    console.log(`저장 모드: ${noSave ? '미리보기' : '저장'}`)
    console.log(`보고서 유형: D (지분공시 전용)`)
    if (maxPages) console.log(`최대 페이지: ${maxPages}`)
    if (pageSize) console.log(`페이지 크기: ${pageSize}`)
    
    // 영업일 확인
    if (!DartCollectionService.isBusinessDay(targetDate)) {
      console.log(`⚠️  ${targetDate}은(는) 영업일이 아닙니다.`)
      console.log(`마지막 영업일: ${DartCollectionService.getLastBusinessDay(1)}`)
      console.log('')
    }

    // 수집 시작
    const startTime = Date.now()
    const collectionOptions = {
      ...(maxPages && { maxPages }),
      ...(pageSize && { pageSize })
      // reportCode 제거됨 - D 타입으로 고정
    }
    const result = await DartCollectionService.collectDailyDisclosures(targetDate, !noSave, collectionOptions)
    const duration = Date.now() - startTime

    // 결과 출력 (지분공시 전용)
    console.log('\n=== 수집 결과 ===')
    console.log(`총 공시 건수: ${result.totalDisclosures}`)
    console.log(`지분 공시: ${result.stockDisclosures.length}건 (D 타입 전용)`)
    console.log(`실행 시간: ${(duration / 1000).toFixed(2)}초`)
    
    if (dryRun) {
      console.log('\n💡 --dry-run 모드: 데이터가 저장되지 않았습니다')
    } else if (noSave) {
      console.log('\n💡 --no-save 모드: 데이터가 저장되지 않았습니다')
    }

    // 지분공시 샘플 출력 (D 타입 전용)
    if (result.totalDisclosures > 0) {
      console.log('\n=== 지분공시 샘플 ===')
      result.stockDisclosures.slice(0, 5).forEach((disclosure, index) => {
        console.log(`${index + 1}. ${disclosure.corpName} - ${disclosure.reportName}`)
        console.log(`   접수번호: ${disclosure.receiptNumber}`)
        console.log(`   공시일자: ${disclosure.receiptDate}`)
      })
      
      if (result.stockDisclosures.length > 5) {
        console.log(`   ... 외 ${result.stockDisclosures.length - 5}건`)
      }
    }

    console.log('\n✅ 수집 완료')

  } catch (error) {
    logger.error('[DART CLI] 수집 실패:', error)
    console.error(`\n❌ 수집 실패: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}

// 스크립트 직접 실행 시에만 main 함수 호출
if (require.main === module) {
  main()
}

export { main, parseAndValidateDate, dateOptions }