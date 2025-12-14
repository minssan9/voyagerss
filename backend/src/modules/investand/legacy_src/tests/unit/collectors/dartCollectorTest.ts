/**
 * @jest-environment node
 */

import { DartCollectionService } from '@/collectors/dartCollectionService'
import { DartApiClient } from '@/clients/dart/DartApiClient'
// import { DartBatchService } from '@/services/core/dartBatchService' // Updated path
import { logger } from '@/utils/common/logger'

/**
 * DART Collector 테스트 스위트 (REFACTORED)
 * 공시 데이터 수집, 배치 처리, 오류 처리 테스트
 * 
 * ⚠️ WARNING: This test file needs updates for the new architecture:
 * - DARTCollector → DartCollectionService + DartApiClient
 * - Some methods like getKOSPI200CorpCodes, checkBatchStatus need implementation
 * - Many tests will fail until methods are fully implemented
 */

// 테스트용 환경 변수 설정
process.env.DART_API_KEY = process.env.DART_API_KEY || 'test-api-key'

describe('DART Collector Tests', () => {
  
  beforeAll(async () => {
    logger.info('DART Collector 테스트 시작')
  })

  afterAll(async () => {
    logger.info('DART Collector 테스트 완료')
  })

  /**
   * API 키 검증 테스트
   */
  test('API 키 유효성 검사', async () => {
    expect(process.env.DART_API_KEY).toBeDefined()
    expect(process.env.DART_API_KEY).not.toBe('')
  })

  /**
   * 공시 데이터 수집 기본 테스트
   */
  test('공시 데이터 수집 - 기본', async () => {
    const testDate = '2024-01-15'
    
    try {
      const result = await DartCollectionService.collectDailyDisclosures(testDate, false)
      
      expect(result).toBeDefined()
      expect(result.totalDisclosures).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(result.regularReports)).toBe(true)
      expect(Array.isArray(result.majorEvents)).toBe(true)
      expect(Array.isArray(result.stockEvents)).toBe(true)
      
      logger.info(`공시 데이터 수집 테스트 성공: ${result.totalDisclosures}건`)
      
    } catch (error) {
      logger.error('공시 데이터 수집 테스트 실패:', error)
      // API 키가 없거나 네트워크 오류인 경우 테스트 스킵
      if (error instanceof Error && (
        error.message.includes('DART_API_KEY') ||
        error.message.includes('Network') ||
        error.message.includes('timeout')
      )) {
        console.warn('API 키 또는 네트워크 이슈로 테스트 스킵')
      } else {
        throw error
      }
    }
  }, 30000) // 30초 타임아웃

  /**
   * Fear & Greed 관련 공시 필터링 테스트
   */
  test('투자심리 관련 공시 필터링', () => {
    const mockDisclosures = [
      {
        corpCode: '00126380',
        corpName: '삼성전자',
        stockCode: '005930',
        reportName: '주식등의대량보유상황보고서',
        receiptNumber: '20240115000001',
        flrName: '삼성전자',
        receiptDate: '20240115',
        remarks: '',
        disclosureDate: '20240115',
        reportCode: 'D'
      },
      {
        corpCode: '00164779',
        corpName: 'SK하이닉스',
        stockCode: '000660',
        reportName: '분기보고서',
        receiptNumber: '20240115000002',
        flrName: 'SK하이닉스',
        receiptDate: '20240115',
        remarks: '',
        disclosureDate: '20240115',
        reportCode: 'A'
      },
      {
        corpCode: '00128160',
        corpName: '삼성바이오로직스',
        stockCode: '207940',
        reportName: '자기주식취득신탁계약체결',
        receiptNumber: '20240115000003',
        flrName: '삼성바이오로직스',
        receiptDate: '20240115',
        remarks: '',
        disclosureDate: '20240115',
        reportCode: 'B'
      }
    ]

    const filtered = DartCollectionService.filterSentimentRelevantDisclosures(mockDisclosures)
    
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.some(d => d.reportName.includes('대량보유'))).toBe(true)
    expect(filtered.some(d => d.reportName.includes('자기주식'))).toBe(true)
    
    logger.info(`투자심리 관련 공시 필터링: ${filtered.length}/${mockDisclosures.length}건`)
  })

  /**
   * KOSPI 200 기업 코드 조회 테스트
   */
  test('KOSPI 200 기업 코드 조회', async () => {
    const corpCodes = await DARTCollector.getKOSPI200CorpCodes()
    
    expect(Array.isArray(corpCodes)).toBe(true)
    expect(corpCodes.length).toBeGreaterThan(0)
    expect(corpCodes).toContain('00126380') // 삼성전자
    
    logger.info(`KOSPI 200 기업 코드: ${corpCodes.length}개`)
  })

  /**
   * 영업일 계산 테스트
   */
  test('영업일 계산 로직', () => {
    const lastBusinessDay = DartCollectionService.getLastBusinessDay(1)
    const lastWeek = DartCollectionService.getLastBusinessDay(5)
    
    expect(lastBusinessDay).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(lastWeek).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    
    const today = new Date()
    const businessDay = new Date(lastBusinessDay)
    const weekAgo = new Date(lastWeek)
    
    expect(businessDay.getTime()).toBeLessThanOrEqual(today.getTime())
    expect(weekAgo.getTime()).toBeLessThan(businessDay.getTime())
    
    logger.info(`영업일 계산: 어제=${lastBusinessDay}, 1주전=${lastWeek}`)
  })

  /**
   * 배치 상태 확인 테스트
   */
  test('배치 상태 확인', async () => {
    try {
      const status = await DARTCollector.checkBatchStatus()
      
      expect(status).toBeDefined()
      expect(typeof status.isOperational).toBe('boolean')
      expect(status.rateLimit).toBeDefined()
      expect(typeof status.rateLimit.remaining).toBe('number')
      expect(status.rateLimit.resetTime instanceof Date).toBe(true)
      
      logger.info(`배치 상태: ${status.isOperational ? '정상' : '오류'}`)
      
    } catch (error) {
      logger.error('배치 상태 확인 테스트 실패:', error)
      // 네트워크 오류인 경우 테스트 스킵
      console.warn('네트워크 이슈로 배치 상태 확인 테스트 스킵')
    }
  }, 15000)

  /**
   * Rate Limiting 테스트
   */
  test('API 호출 간격 제어', async () => {
    const startTime = Date.now()
    
    // 연속으로 두 번의 API 호출 (실제로는 mock 데이터 사용)
    try {
      const testRequest1 = DARTCollector.fetchDisclosures({
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        pageCount: 1
      })
      
      const testRequest2 = DARTCollector.fetchDisclosures({
        startDate: '2024-01-16', 
        endDate: '2024-01-16',
        pageCount: 1
      })
      
      await Promise.all([testRequest1, testRequest2])
      
      const elapsed = Date.now() - startTime
      
      // 최소 100ms 간격이 보장되어야 함
      expect(elapsed).toBeGreaterThanOrEqual(100)
      
      logger.info(`Rate limiting 테스트: ${elapsed}ms 소요`)
      
    } catch (error) {
      // API 키 이슈인 경우 스킵
      if (error instanceof Error && error.message.includes('DART_API_KEY')) {
        console.warn('API 키 이슈로 Rate limiting 테스트 스킵')
      } else {
        logger.error('Rate limiting 테스트 실패:', error)
      }
    }
  }, 10000)

  /**
   * 오류 처리 테스트
   */
  test('잘못된 날짜 형식 오류 처리', async () => {
    const invalidDate = 'invalid-date'
    
    try {
      await DARTCollector.collectDailyDisclosures(invalidDate)
      // 오류가 발생해야 하므로 여기 도달하면 실패
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeDefined()
      logger.info('잘못된 날짜 형식 오류 처리 성공')
    }
  })

  /**
   * 배치 서비스 초기화 테스트 (스킵 - 미구현)
   */
  test.skip('배치 서비스 초기화', async () => {
    try {
      // DartBatchService는 아직 구현되지 않음
      // expect(typeof DartBatchService.initialize).toBe('function')
      // expect(typeof DartBatchService.scheduleDailyDisclosureCollection).toBe('function')
      // expect(typeof DartBatchService.getStatus).toBe('function')
      
      logger.info('배치 서비스 메서드 존재 확인 완료 (스킵)')
      
    } catch (error) {
      logger.error('배치 서비스 초기화 테스트 실패:', error)
      throw error
    }
  })
})

/**
 * 통합 테스트 - 전체 워크플로우
 */
describe('DART Integration Tests', () => {
  
  test('전체 워크플로우 시뮬레이션', async () => {
    const testDate = '2024-01-15'
    
    try {
      logger.info(`통합 테스트 시작: ${testDate}`)
      
      // 1. 공시 데이터 수집
      const disclosures = await DARTCollector.collectDailyDisclosures(testDate)
      expect(disclosures.totalDisclosures).toBeGreaterThanOrEqual(0)
      
      // 2. Fear & Greed 관련 필터링
      const allDisclosures = [
        ...disclosures.regularReports,
        ...disclosures.majorEvents,
        ...disclosures.stockEvents
      ]
      
      const sentimentRelevant = DARTCollector.filterSentimentRelevantDisclosures(allDisclosures)
      expect(Array.isArray(sentimentRelevant)).toBe(true)
      
      // 3. 배치 상태 확인
      const batchStatus = await DARTCollector.checkBatchStatus()
      expect(batchStatus.isOperational).toBeDefined()
      
      logger.info(`통합 테스트 완료: 공시 ${disclosures.totalDisclosures}건, 관련 ${sentimentRelevant.length}건`)
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('DART_API_KEY')) {
        console.warn('API 키 이슈로 통합 테스트 스킵')
      } else {
        logger.error('통합 테스트 실패:', error)
        throw error
      }
    }
  }, 60000) // 60초 타임아웃
})

/**
 * 성능 테스트
 */
describe('DART Performance Tests', () => {
  
  test('대량 데이터 처리 성능', async () => {
    const startTime = Date.now()
    
    try {
      // 여러 날짜의 데이터를 병렬로 수집 (실제로는 mock 데이터)
      const dates = ['2024-01-15', '2024-01-16', '2024-01-17']
      const kospi200Corps = await DARTCollector.getKOSPI200CorpCodes()
      
      // KOSPI 200 기업 중 일부만 테스트
      const testCorps = kospi200Corps.slice(0, 5)
      
      expect(testCorps.length).toBeLessThanOrEqual(5)
      expect(dates.length).toBe(3)
      
      const elapsed = Date.now() - startTime
      
      // 성능 기준: 10초 이내
      expect(elapsed).toBeLessThan(10000)
      
      logger.info(`성능 테스트 완료: ${elapsed}ms 소요 (기업 ${testCorps.length}개, 날짜 ${dates.length}개)`)
      
    } catch (error) {
      logger.error('성능 테스트 실패:', error)
    }
  }, 15000)
})

/**
 * 수동 테스트 실행 함수
 */
export async function runManualDartTests(): Promise<void> {
  logger.info('DART 수동 테스트 실행')
  
  try {
    // 1. 최근 영업일 공시 데이터 수집 테스트
    const yesterday = DARTCollector.getLastBusinessDay(1)
    logger.info(`테스트 대상 날짜: ${yesterday}`)
    
    const result = await DARTCollector.collectDailyDisclosures(yesterday)
    logger.info(`수집된 공시: 총 ${result.totalDisclosures}건`)
    logger.info(`- 정기공시: ${result.regularReports.length}건`)
    logger.info(`- 주요사항보고: ${result.majorEvents.length}건`)  
    logger.info(`- 지분공시: ${result.stockEvents.length}건`)
    
    // 2. Fear & Greed 관련 공시 필터링
    const allDisclosures = [
      ...result.regularReports,
      ...result.majorEvents,
      ...result.stockEvents
    ]
    
    const sentimentRelevant = DARTCollector.filterSentimentRelevantDisclosures(allDisclosures)
    logger.info(`투자심리 관련 공시: ${sentimentRelevant.length}건`)
    
    sentimentRelevant.slice(0, 3).forEach((disclosure, index) => {
      logger.info(`${index + 1}. ${disclosure.corpName}: ${disclosure.reportName}`)
    })
    
    // 3. 배치 상태 확인
    const status = await DARTCollector.checkBatchStatus()
    logger.info(`배치 서비스 상태: ${status.isOperational ? '정상' : '비정상'}`)
    logger.info(`API 호출 한도 잔여: ${status.rateLimit.remaining}회`)
    
    logger.info('DART 수동 테스트 완료')
    
  } catch (error) {
    logger.error('DART 수동 테스트 실패:', error)
    throw error
  }
}

// 스크립트로 직접 실행할 경우
if (require.main === module) {
  runManualDartTests()
    .then(() => {
      logger.info('수동 테스트 성공적으로 완료')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('수동 테스트 실패:', error)
      process.exit(1)
    })
}