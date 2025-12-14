import { KRXCollector } from '@/collectors/krxCollector'
import { BOKCollector } from '@/collectors/bokCollector' 
import { FearGreedCalculator } from '@/services/fearGreedCalculator'

/**
 * 데이터 수집기 테스트 스크립트
 */
async function testCollectors() {
  console.log('🧪 데이터 수집기 테스트 시작\n')

  const testDate = '2024-12-19' // 테스트할 날짜

  try {
    // 1. KRX 데이터 수집 테스트
    console.log('📊 KRX 데이터 수집 테스트...')
    const krxKospiData = await KRXCollector.fetchKRXStockData(testDate, 'KOSPI')
    const krxKosdaqData = await KRXCollector.fetchKRXStockData(testDate, 'KOSDAQ')
    const krxInvestorTradingData = await KRXCollector.fetchInvestorTradingData(testDate)
    const krxOptionData = await KRXCollector.fetchOptionData(testDate)
    
    console.log('KRX 수집 결과:')
    if (krxKospiData) {
      console.log(`  ✅ KOSPI: ${krxKospiData.stck_prpr} (${krxKospiData.prdy_ctrt}%)`)
    } else {
      console.log('  ❌ KOSPI 데이터 없음')
    }
    
    if (krxInvestorTradingData) {
      const foreignNet = Number(krxInvestorTradingData.frgn_shnu_tr_pbmn || 0) - Number(krxInvestorTradingData.frgn_seln_tr_pbmn || 0)
      console.log(`  ✅ 외국인 순매수: ${foreignNet.toLocaleString()}원`)
    } else {
      console.log('  ❌ 투자자별 매매동향 데이터 없음')
    }
    
    if (krxOptionData) {
      console.log(`  ✅ Put/Call 비율: ${krxOptionData.putCallRatio.toFixed(2)}`)
    } else {
      console.log('  ❌ 옵션 데이터 없음')
    }

    // 2. BOK 데이터 수집 테스트
    console.log('\n🏦 BOK 데이터 수집 테스트...')
    
    // API 키 검증 먼저
    const isApiValid = await BOKCollector.validateApiKey()
    console.log(`BOK API 키 유효성: ${isApiValid ? '✅ 유효' : '❌ 무효'}`)
    
    if (isApiValid) {
      const bokData = await BOKCollector.collectDailyData(testDate)
      
      console.log('BOK 수집 결과:')
      if (bokData.interestRates) {
        console.log(`  ✅ 기준금리: ${bokData.interestRates.baseRate}%`)
        console.log(`  ✅ 국고채 10년: ${bokData.interestRates.treasuryBond10Y}%`)
      } else {
        console.log('  ❌ 금리 데이터 없음')
      }
      
      if (bokData.exchangeRates) {
        console.log(`  ✅ USD/KRW: ${bokData.exchangeRates.usdKrw}`)
      } else {
        console.log('  ❌ 환율 데이터 없음')
      }
    } else {
      console.log('  ⚠️ BOK API 키가 설정되지 않아 테스트를 건너뜁니다.')
    }

    // 3. Fear & Greed Index 계산 테스트
    console.log('\n😱😍 Fear & Greed Index 계산 테스트...')
    const fearGreedResult = await FearGreedCalculator.calculateIndex(testDate)
    
    if (fearGreedResult) {
      console.log('Fear & Greed Index 계산 결과:')
      console.log(`  ✅ 지수: ${fearGreedResult.value}/100`)
      console.log(`  ✅ 레벨: ${fearGreedResult.level}`)
      console.log(`  ✅ 신뢰도: ${fearGreedResult.confidence}%`)
      console.log('  구성요소:')
      console.log(`    - 주가 모멘텀: ${fearGreedResult.components.priceMomentum}`)
      console.log(`    - 투자자 심리: ${fearGreedResult.components.investorSentiment}`)
      console.log(`    - Put/Call 비율: ${fearGreedResult.components.putCallRatio}`)
      console.log(`    - 변동성: ${fearGreedResult.components.volatilityIndex}`)
      console.log(`    - 안전자산 수요: ${fearGreedResult.components.safeHavenDemand}`)
    } else {
      console.log('  ❌ Fear & Greed Index 계산 실패 (데이터 부족)')
    }

    // 4. 최근 영업일 계산 테스트
    console.log('\n📅 최근 영업일 계산 테스트...')
    const lastBusinessDay = KRXCollector.getLastBusinessDay()
    console.log(`  ✅ 최근 영업일: ${lastBusinessDay}`)

    console.log('\n🎉 모든 테스트 완료!')

  } catch (error) {
    console.error('\n❌ 테스트 중 오류 발생:', error)
    process.exit(1)
  }
}

/**
 * 샘플 데이터로 Fear & Greed Index 계산 테스트
 */
async function testWithSampleData() {
  console.log('\n🧪 샘플 데이터로 Fear & Greed Index 테스트...')

  try {
    // 샘플 데이터로 직접 계산 테스트
    const sampleComponents = {
      priceMomentum: 65,     // 주가 상승 추세
      investorSentiment: 45, // 중립적 투자자 심리
      putCallRatio: 60,      // 약간 탐욕
      volatilityIndex: 55,   // 보통 변동성
      safeHavenDemand: 50    // 중립적 안전자산 수요
    }

    // 가중평균 계산 (수동)
    const weights = {
      priceMovement: 0.25,
      investorSentiment: 0.25,
      putCallRatio: 0.20,
      volatility: 0.15,
      safeHaven: 0.15
    }

    const calculatedIndex = 
      sampleComponents.priceMomentum * weights.priceMovement +
      sampleComponents.investorSentiment * weights.investorSentiment +
      sampleComponents.putCallRatio * weights.putCallRatio +
      sampleComponents.volatilityIndex * weights.volatility +
      sampleComponents.safeHavenDemand * weights.safeHaven

    console.log('샘플 계산 결과:')
    console.log(`  계산된 지수: ${Math.round(calculatedIndex)}/100`)
    
    let level = 'Neutral'
    if (calculatedIndex <= 24) level = 'Extreme Fear'
    else if (calculatedIndex <= 44) level = 'Fear'
    else if (calculatedIndex <= 54) level = 'Neutral'
    else if (calculatedIndex <= 74) level = 'Greed'
    else level = 'Extreme Greed'
    
    console.log(`  레벨: ${level}`)
    console.log('  구성요소:')
    console.log(`    - 주가 모멘텀: ${sampleComponents.priceMomentum} (가중치: ${weights.priceMovement})`)
    console.log(`    - 투자자 심리: ${sampleComponents.investorSentiment} (가중치: ${weights.investorSentiment})`)
    console.log(`    - Put/Call 비율: ${sampleComponents.putCallRatio} (가중치: ${weights.putCallRatio})`)
    console.log(`    - 변동성: ${sampleComponents.volatilityIndex} (가중치: ${weights.volatility})`)
    console.log(`    - 안전자산 수요: ${sampleComponents.safeHavenDemand} (가중치: ${weights.safeHaven})`)

  } catch (error) {
    console.error('샘플 데이터 테스트 실패:', error)
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('='.repeat(60))
  console.log('🚀 KOSPI Fear & Greed Index 데이터 수집기 테스트')
  console.log('='.repeat(60))

  // 환경 변수 체크
  console.log('\n🔧 환경 설정 체크:')
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  console.log(`  BOK_API_KEY: ${process.env.BOK_API_KEY ? '설정됨' : '설정 안됨'}`)

  // 실제 API 테스트
  await testCollectors()

  // 샘플 데이터 테스트
  await testWithSampleData()

  console.log('\n='.repeat(60))
  console.log('테스트 완료!')
  console.log('='.repeat(60))
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main().catch(console.error)
}

export { testCollectors, testWithSampleData } 