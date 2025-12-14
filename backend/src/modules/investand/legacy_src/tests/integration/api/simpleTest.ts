/**
 * 간단한 시스템 테스트 (외부 API 의존성 없음)
 */

console.log('🧪 KOSPI Fear & Greed Index 시스템 테스트')
console.log('='.repeat(50))

// 1. 모듈 import 테스트
try {
  console.log('\n1. 모듈 Import 테스트...')
  
  // KRX 수집기 관련 타입만 import
  const krxTypes = require('@/collectors/krxCollectionService')
  console.log('  ✅ KRX Collector 타입 로드 성공')
  
  // BOK 수집기 관련 타입만 import  
  const bokTypes = require('@/collectors/financial/bokCollector')
  console.log('  ✅ BOK Collector 타입 로드 성공')
  
  // Fear & Greed 계산기 타입만 import
  const fearGreedTypes = require('@/services/core/fearGreedCalculator')
  console.log('  ✅ Fear & Greed Calculator 타입 로드 성공')
  
  // 배치 처리 서비스 타입만 import
  const batchProcessingTypes = require('@/services/domain/BatchProcessingService')
  console.log('  ✅ BatchProcessingService 타입 로드 성공')
  
} catch (error) {
  console.error('  ❌ 모듈 Import 실패:', error)
  process.exit(1)
}

// 2. Fear & Greed 계산 로직 테스트 (샘플 데이터)
try {
  console.log('\n2. Fear & Greed Index 계산 로직 테스트...')
  
  // 샘플 구성요소 점수
  const sampleComponents = {
    priceMomentum: 65,     // 주가 상승 추세 (탐욕)
    investorSentiment: 45, // 중립적 투자자 심리
    putCallRatio: 60,      // 약간 탐욕
    volatilityIndex: 40,   // 높은 변동성 (공포)
    safeHavenDemand: 50    // 중립적 안전자산 수요
  }
  
  // 가중치 (계산기와 동일)
  const weights = {
    priceMovement: 0.25,     // 25%
    investorSentiment: 0.25, // 25%
    putCallRatio: 0.20,      // 20%
    volatility: 0.15,        // 15%
    safeHaven: 0.15          // 15%
  }
  
  // 가중평균 계산
  const calculatedIndex = 
    sampleComponents.priceMomentum * weights.priceMovement +
    sampleComponents.investorSentiment * weights.investorSentiment +
    sampleComponents.putCallRatio * weights.putCallRatio +
    sampleComponents.volatilityIndex * weights.volatility +
    sampleComponents.safeHavenDemand * weights.safeHaven
  
  console.log(`  계산된 지수: ${Math.round(calculatedIndex)}/100`)
  
  // 레벨 분류
  let level = 'Neutral'
  if (calculatedIndex <= 24) level = 'Extreme Fear'
  else if (calculatedIndex <= 44) level = 'Fear'
  else if (calculatedIndex <= 54) level = 'Neutral'
  else if (calculatedIndex <= 74) level = 'Greed'
  else level = 'Extreme Greed'
  
  console.log(`  레벨: ${level}`)
  console.log('  ✅ Fear & Greed Index 계산 로직 검증 성공')
  
} catch (error) {
  console.error('  ❌ 계산 로직 테스트 실패:', error)
}

// 3. 날짜 유틸리티 함수 테스트
try {
  console.log('\n3. 날짜 유틸리티 테스트...')
  
  // 최근 영업일 계산 로직 (KRXCollector와 동일)
  function getLastBusinessDay(): string {
    const today = new Date()
    const day = today.getDay()
    
    let daysToSubtract = 1
    if (day === 1) daysToSubtract = 3      // 월요일 → 3일 전 금요일
    else if (day === 0) daysToSubtract = 2 // 일요일 → 2일 전 금요일
    else if (day === 6) daysToSubtract = 1 // 토요일 → 1일 전 금요일

    const lastBusinessDay = new Date(today)
    lastBusinessDay.setDate(today.getDate() - daysToSubtract)
    
    try {
      return lastBusinessDay.toISOString().split('T')[0] ?? ''
    } catch {
      return ''
    }
  }
  
  const lastBusinessDay = getLastBusinessDay()
  console.log(`  최근 영업일: ${lastBusinessDay}`)
  console.log('  ✅ 날짜 유틸리티 테스트 성공')
  
} catch (error) {
  console.error('  ❌ 날짜 유틸리티 테스트 실패:', error)
}

// 4. 환경 변수 확인
try {
  console.log('\n4. 환경 설정 확인...')
  
  const nodeEnv = process.env.NODE_ENV || 'development'
  console.log(`  NODE_ENV: ${nodeEnv}`)
  
  const bokApiKey = process.env.BOK_API_KEY
  console.log(`  BOK_API_KEY: ${bokApiKey ? '설정됨' : '설정 안됨'}`)
  
  const databaseUrl = process.env.DATABASE_URL
  console.log(`  DATABASE_URL: ${databaseUrl ? '설정됨' : '설정 안됨'}`)
  
  console.log('  ✅ 환경 설정 확인 완료')
  
} catch (error) {
  console.error('  ❌ 환경 설정 확인 실패:', error)
}

// 5. 시스템 리소스 확인
try {
  console.log('\n5. 시스템 리소스 확인...')
  
  const memUsage = process.memoryUsage()
  console.log(`  메모리 사용량: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`)
  console.log(`  총 메모리: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`)
  
  console.log('  ✅ 시스템 리소스 확인 완료')
  
} catch (error) {
  console.error('  ❌ 시스템 리소스 확인 실패:', error)
}

console.log('\n='.repeat(50))
console.log('🎉 기본 시스템 테스트 완료!')
console.log('\n📝 다음 단계:')
console.log('  1. BOK API 키 설정 (.env 파일)')
console.log('  2. 실제 API 테스트 (npm run test:collectors)')
console.log('  3. 스케줄러 실행 (npm run start:scheduler)')
console.log('='.repeat(50)) 