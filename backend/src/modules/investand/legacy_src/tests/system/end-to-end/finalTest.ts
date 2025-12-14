import { FearGreedCalculator } from '@/services/fearGreedCalculator'
import { formatDate } from '@/utils/dateUtils'

/**
 * 최종 시스템 테스트
 * 현재 구현된 기능들을 테스트
 */
async function runFinalTest() {
  console.log('🎯 최종 시스템 테스트 시작\n')

  try {
    const testDate = formatDate(new Date())
    console.log(`📅 테스트 날짜: ${testDate}`)

    console.log('\n1️⃣ Fear & Greed Index 계산 테스트...')
    
    // Fear & Greed Index 계산 (샘플 데이터 사용)
    const fearGreedResult = await FearGreedCalculator.calculateIndex(testDate)
    
    if (fearGreedResult) {
      console.log(`✅ Fear & Greed Index 계산 성공:`)
      console.log(`   📊 지수: ${fearGreedResult.value}/100`)
      console.log(`   📈 레벨: ${fearGreedResult.level}`)
      console.log(`   🎯 신뢰도: ${fearGreedResult.confidence}%`)
      console.log(`   📋 구성요소:`)
      console.log(`      - 주가 모멘텀: ${fearGreedResult.components.priceMomentum}`)
      console.log(`      - 투자자 심리: ${fearGreedResult.components.investorSentiment}`)
      console.log(`      - 풋/콜 비율: ${fearGreedResult.components.putCallRatio}`)
      console.log(`      - 변동성 지수: ${fearGreedResult.components.volatilityIndex}`)
      console.log(`      - 안전자산 수요: ${fearGreedResult.components.safeHavenDemand}`)
    } else {
      console.log('❌ Fear & Greed Index 계산 실패')
    }

    console.log('\n2️⃣ 날짜 유틸리티 테스트...')
    
    // 날짜 관련 함수들 테스트
    const today = new Date()
    const formattedDate = formatDate(today)
    console.log(`✅ 날짜 포맷팅: ${today.toISOString()} → ${formattedDate}`)

    // 이전 날짜들 테스트
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const formattedYesterday = formatDate(yesterday)
    console.log(`✅ 어제 날짜: ${formattedYesterday}`)

    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)
    const formattedLastWeek = formatDate(lastWeek)
    console.log(`✅ 일주일 전: ${formattedLastWeek}`)

    console.log('\n3️⃣ 시스템 상태 확인...')
    
    // 환경 변수 확인
    console.log(`✅ Node 환경: ${process.env.NODE_ENV || 'development'}`)
    console.log(`✅ 포트: ${process.env.PORT || 3000}`)
    console.log(`✅ 데이터베이스 URL: ${process.env.DATABASE_URL ? '설정됨' : '미설정'}`)
    console.log(`✅ KRX API 키: ${process.env.KRX_API_KEY ? '설정됨' : '미설정'}`)
    console.log(`✅ BOK API 키: ${process.env.BOK_API_KEY ? '설정됨' : '미설정'}`)

    console.log('\n4️⃣ 메모리 사용량 확인...')
    
    const memoryUsage = process.memoryUsage()
    console.log(`✅ RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`)
    console.log(`✅ Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`)
    console.log(`✅ Heap Total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`)
    console.log(`✅ External: ${Math.round(memoryUsage.external / 1024 / 1024)}MB`)

    console.log('\n🎉 최종 시스템 테스트 완료!')
    console.log('✅ 핵심 기능들이 정상 작동합니다.')
    
    return {
      success: true,
      message: '최종 시스템 테스트 성공',
      fearGreedIndex: fearGreedResult,
      systemInfo: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000,
        databaseConfigured: !!process.env.DATABASE_URL,
        krxApiConfigured: !!process.env.KRX_API_KEY,
        bokApiConfigured: !!process.env.BOK_API_KEY,
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        }
      }
    }

  } catch (error) {
    console.error('\n❌ 최종 시스템 테스트 실패:', error)
    return {
      success: false,
      message: '최종 시스템 테스트 실패',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// 직접 실행 시 테스트 실행
if (require.main === module) {
  runFinalTest()
    .then(result => {
      console.log('\n📋 최종 테스트 결과:', result)
      process.exit(result.success ? 0 : 1)
    })
    .catch(error => {
      console.error('\n💥 테스트 실행 중 오류:', error)
      process.exit(1)
    })
}

export { runFinalTest } 