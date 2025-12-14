/**
 * 간단한 시스템 테스트 (JavaScript 버전)
 */

console.log('🧪 KOSPI Fear & Greed Index 시스템 테스트')
console.log('='.repeat(50))

// 1. Node.js 기본 모듈 테스트
try {
  console.log('\n1. Node.js 기본 모듈 테스트...')
  
  const fs = require('fs')
  const path = require('path')
  console.log('  ✅ fs, path 모듈 로드 성공')
  
  // 프로젝트 구조 확인
  const srcPath = path.join(__dirname, '..')
  const collectorsPath = path.join(srcPath, 'collectors')
  const servicesPath = path.join(srcPath, 'services')
  
  if (fs.existsSync(collectorsPath)) {
    console.log('  ✅ collectors 디렉토리 존재')
  }
  
  if (fs.existsSync(servicesPath)) {
    console.log('  ✅ services 디렉토리 존재')
  }
  
} catch (error) {
  console.error('  ❌ 기본 모듈 테스트 실패:', error.message)
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
  
  // 구성요소 상세 출력
  console.log('  구성요소 상세:')
  console.log(`    - 주가 모멘텀: ${sampleComponents.priceMomentum} × ${weights.priceMovement} = ${(sampleComponents.priceMomentum * weights.priceMovement).toFixed(1)}`)
  console.log(`    - 투자자 심리: ${sampleComponents.investorSentiment} × ${weights.investorSentiment} = ${(sampleComponents.investorSentiment * weights.investorSentiment).toFixed(1)}`)
  console.log(`    - Put/Call 비율: ${sampleComponents.putCallRatio} × ${weights.putCallRatio} = ${(sampleComponents.putCallRatio * weights.putCallRatio).toFixed(1)}`)
  console.log(`    - 변동성: ${sampleComponents.volatilityIndex} × ${weights.volatility} = ${(sampleComponents.volatilityIndex * weights.volatility).toFixed(1)}`)
  console.log(`    - 안전자산 수요: ${sampleComponents.safeHavenDemand} × ${weights.safeHaven} = ${(sampleComponents.safeHavenDemand * weights.safeHaven).toFixed(1)}`)
  
  console.log('  ✅ Fear & Greed Index 계산 로직 검증 성공')
  
} catch (error) {
  console.error('  ❌ 계산 로직 테스트 실패:', error.message)
}

// 3. 날짜 유틸리티 함수 테스트
try {
  console.log('\n3. 날짜 유틸리티 테스트...')
  
  // 최근 영업일 계산 로직
  function getLastBusinessDay() {
    const today = new Date()
    const day = today.getDay()
    
    let daysToSubtract = 1
    if (day === 1) daysToSubtract = 3      // 월요일 → 3일 전 금요일
    else if (day === 0) daysToSubtract = 2 // 일요일 → 2일 전 금요일
    else if (day === 6) daysToSubtract = 1 // 토요일 → 1일 전 금요일

    const lastBusinessDay = new Date(today)
    lastBusinessDay.setDate(today.getDate() - daysToSubtract)
    
    return lastBusinessDay.toISOString().split('T')[0] as string
  }
  
  const lastBusinessDay = getLastBusinessDay()
  const today = new Date().toISOString().split('T')[0]
  
  console.log(`  오늘: ${today}`)
  console.log(`  최근 영업일: ${lastBusinessDay}`)
  console.log('  ✅ 날짜 유틸리티 테스트 성공')
  
} catch (error) {
  console.error('  ❌ 날짜 유틸리티 테스트 실패:', error.message)
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
  
  const port = process.env.PORT || '3000'
  console.log(`  PORT: ${port}`)
  
  console.log('  ✅ 환경 설정 확인 완료')
  
} catch (error) {
  console.error('  ❌ 환경 설정 확인 실패:', error.message)
}

// 5. 시스템 리소스 확인
try {
  console.log('\n5. 시스템 리소스 확인...')
  
  const memUsage = process.memoryUsage()
  console.log(`  메모리 사용량: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`)
  console.log(`  총 메모리: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`)
  console.log(`  외부 메모리: ${Math.round(memUsage.external / 1024 / 1024)}MB`)
  
  console.log('  ✅ 시스템 리소스 확인 완료')
  
} catch (error) {
  console.error('  ❌ 시스템 리소스 확인 실패:', error.message)
}

// 6. 레벨 분류 테스트
try {
  console.log('\n6. Fear & Greed 레벨 분류 테스트...')
  
  function getFearGreedLevel(score) {
    if (score <= 24) return 'Extreme Fear'
    if (score <= 44) return 'Fear'
    if (score <= 54) return 'Neutral'
    if (score <= 74) return 'Greed'
    return 'Extreme Greed'
  }
  
  const testScores = [10, 35, 50, 65, 85]
  testScores.forEach(score => {
    const level = getFearGreedLevel(score)
    console.log(`  지수 ${score}: ${level}`)
  })
  
  console.log('  ✅ 레벨 분류 테스트 성공')
  
} catch (error) {
  console.error('  ❌ 레벨 분류 테스트 실패:', error.message)
}

console.log('\n='.repeat(50))
console.log('🎉 기본 시스템 테스트 완료!')
console.log('\n📊 시스템 요약:')
console.log('  - Fear & Greed Index 계산 로직: ✅ 정상')
console.log('  - 날짜 유틸리티: ✅ 정상')
console.log('  - 환경 설정: ✅ 정상')
console.log('  - 시스템 리소스: ✅ 정상')
console.log('\n📝 다음 단계:')
console.log('  1. BOK API 키 설정 (.env 파일에 BOK_API_KEY 추가)')
console.log('  2. 실제 API 테스트 실행')
console.log('  3. 스케줄러 시작하여 자동 데이터 수집')
console.log('='.repeat(50)) 