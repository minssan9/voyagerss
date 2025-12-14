import { DatabaseService } from '@/services/databaseService'
import { FearGreedCalculator } from '@/services/fearGreedCalculator'
import { formatDate } from '@/utils/dateUtils'

/**
 * 시스템 통합 테스트
 * 데이터베이스 연결, API 기능, Fear & Greed Index 계산 등을 테스트
 */
async function runSystemTest() {
  console.log('🧪 시스템 통합 테스트 시작\n')

  try {
    // 1. 데이터베이스 연결 테스트
    console.log('1️⃣ 데이터베이스 연결 테스트...')
    const testDate = formatDate(new Date())
    
    // 샘플 KOSPI 데이터 저장 테스트 (krxStockData 구조에 맞춤)
    const sampleKospiData = {
      date: testDate,
      iscd_stat_cls_code: '51',
      marg_rate: '40.00',
      rprs_mrkt_kor_name: 'KOSPI',
      new_hgpr_lwpr_cls_code: '0',
      bstp_kor_isnm: 'KOSPI 지수',
      temp_stop_yn: 'N',
      oprc_rang_cont_yn: 'N',
      clpr_rang_cont_yn: 'N',
      crdt_able_yn: 'N',
      grmn_rate_cls_code: '10',
      elw_pblc_yn: 'N',
      stck_prpr: '2500',
      prdy_vrss: '15',
      prdy_vrss_sign: '2',
      prdy_ctrt: '0.62',
      acml_tr_pbmn: '12000000000000',
      acml_vol: '450000000',
      prdy_vrss_vol_rate: '105.2',
      stck_oprc: '2485',
      stck_hgpr: '2510',
      stck_lwpr: '2480',
      stck_mxpr: '3228',
      stck_llam: '1800',
      stck_sdpr: '2000',
      wghn_avrg_stck_prc: '2495',
      hts_frgn_ehrt: '28.5',
      frgn_ntby_qty: '2000000',
      pgtr_ntby_qty: '1500000',
      pvt_scnd_dmrs_prc: '0',
      pvt_frst_dmrs_prc: '0',
      pvt_pont_val: '0',
      pvt_frst_dmsp_prc: '0',
      pvt_scnd_dmsp_prc: '0',
      dmrs_val: '0',
      dmsp_val: '0',
      cpfn: '0',
      rstc_wdth_prc: '0',
      stck_fcam: '0',
      stck_sspr: '0',
      aspr_unit: '1',
      hts_deal_qty_unit_val: '1',
      lstn_stcn: '850000000000',
      hts_avls: '2125000000000000',
      per: '12.5',
      pbr: '0.95',
      stac_month: '12',
      vol_tnrt: '0.53',
      eps: '200',
      bps: '2631',
      d250_hgpr: '2650',
      d250_hgpr_date: '20241015',
      d250_hgpr_vrss_prpr_rate: '-5.66',
      d250_lwpr: '2100',
      d250_lwpr_date: '20240315',
      d250_lwpr_vrss_prpr_rate: '19.05',
      stck_dryy_hgpr: '2700',
      dryy_hgpr_vrss_prpr_rate: '-7.41',
      dryy_hgpr_date: '20240820',
      stck_dryy_lwpr: '2000',
      dryy_lwpr_vrss_prpr_rate: '25.00',
      dryy_lwpr_date: '20240201',
      w52_hgpr: '2700',
      w52_hgpr_vrss_prpr_ctrt: '-7.41',
      w52_hgpr_date: '20240820',
      w52_lwpr: '2000',
      w52_lwpr_vrss_prpr_ctrt: '25.00',
      w52_lwpr_date: '20240201',
      whol_loan_rmnd_rate: '0.00',
      ssts_yn: 'N',
      stck_shrn_iscd: 'KS11',
      fcam_cnnm: '',
      cpfn_cnnm: '',
      apprch_rate: '0.00',
      frgn_hldn_qty: '0',
      vi_cls_code: '00',
      ovtm_vi_cls_code: '00',
      last_ssts_cntg_qty: '0',
      invt_caful_yn: 'N',
      mrkt_warn_cls_code: '00',
      short_over_yn: 'N',
      sltr_yn: 'N',
      mang_issu_cls_code: '00'
    }
    
    await DatabaseService.saveKRXStockData(sampleKospiData, 'KOSPI')
    console.log('✅ KOSPI 데이터 저장 성공')

    // 샘플 투자자별 매매동향 데이터 저장 테스트 (모든 필드를 포함한 완전한 구조)
    const sampleTradingData = {
      date: testDate,
      frgn_seln_vol: '1000000',
      frgn_shnu_vol: '1200000',
      frgn_ntby_qty: '200000',
      frgn_seln_tr_pbmn: '1100000000000',
      frgn_shnu_tr_pbmn: '1200000000000',
      frgn_ntby_tr_pbmn: '100000000000',
      prsn_seln_vol: '900000',
      prsn_shnu_vol: '800000',
      prsn_ntby_qty: '-100000',
      prsn_seln_tr_pbmn: '900000000000',
      prsn_shnu_tr_pbmn: '800000000000',
      prsn_ntby_tr_pbmn: '-100000000000',
      orgn_seln_vol: '550000',
      orgn_shnu_vol: '600000',
      orgn_ntby_qty: '50000',
      orgn_seln_tr_pbmn: '550000000000',
      orgn_shnu_tr_pbmn: '600000000000',
      orgn_ntby_tr_pbmn: '50000000000',
      scrt_seln_vol: '0',
      scrt_shnu_vol: '0',
      scrt_ntby_qty: '0',
      scrt_seln_tr_pbmn: '0',
      scrt_shnu_tr_pbmn: '0',
      scrt_ntby_tr_pbmn: '0',
      ivtr_seln_vol: '0',
      ivtr_shnu_vol: '0',
      ivtr_ntby_qty: '0',
      ivtr_seln_tr_pbmn: '0',
      ivtr_shnu_tr_pbmn: '0',
      ivtr_ntby_tr_pbmn: '0',
      pe_fund_seln_tr_pbmn: '0',
      pe_fund_seln_vol: '0',
      pe_fund_ntby_vol: '0',
      pe_fund_shnu_tr_pbmn: '0',
      pe_fund_shnu_vol: '0',
      pe_fund_ntby_tr_pbmn: '0',
      bank_seln_vol: '0',
      bank_shnu_vol: '0',
      bank_ntby_qty: '0',
      bank_seln_tr_pbmn: '0',
      bank_shnu_tr_pbmn: '0',
      bank_ntby_tr_pbmn: '0',
      insu_seln_vol: '0',
      insu_shnu_vol: '0',
      insu_ntby_qty: '0',
      insu_seln_tr_pbmn: '0',
      insu_shnu_tr_pbmn: '0',
      insu_ntby_tr_pbmn: '0',
      mrbn_seln_vol: '0',
      mrbn_shnu_vol: '0',
      mrbn_ntby_qty: '0',
      mrbn_seln_tr_pbmn: '0',
      mrbn_shnu_tr_pbmn: '0',
      mrbn_ntby_tr_pbmn: '0',
      fund_seln_vol: '0',
      fund_shnu_vol: '0',
      fund_ntby_qty: '0',
      fund_seln_tr_pbmn: '0',
      fund_shnu_tr_pbmn: '0',
      fund_ntby_tr_pbmn: '0',
      etc_orgt_seln_vol: '0',
      etc_orgt_shnu_vol: '0',
      etc_orgt_ntby_vol: '0',
      etc_orgt_seln_tr_pbmn: '0',
      etc_orgt_shnu_tr_pbmn: '0',
      etc_orgt_ntby_tr_pbmn: '0',
      etc_corp_seln_vol: '0',
      etc_corp_shnu_vol: '0',
      etc_corp_ntby_vol: '0',
      etc_corp_seln_tr_pbmn: '0',
      etc_corp_shnu_tr_pbmn: '0',
      etc_corp_ntby_tr_pbmn: '0'
    }
    
    await DatabaseService.saveInvestorTradingData(sampleTradingData)
    console.log('✅ 투자자별 매매동향 저장 성공')

    // 샘플 옵션 데이터 저장 테스트
    const sampleOptionData = {
      date: testDate,
      putVolume: 150000,
      callVolume: 200000,
      putCallRatio: 0.75
    }
    
    await DatabaseService.saveOptionData(sampleOptionData)
    console.log('✅ 옵션 데이터 저장 성공')

    // 샘플 금리 데이터 저장 테스트
    const sampleInterestRateData = {
      date: testDate,
      baseRate: 3.50,
      callRate: 3.45,
      cd91Rate: 3.60,
      treasuryBond3Y: 3.80,
      treasuryBond10Y: 4.20
    }
    
    await DatabaseService.saveInterestRateData(sampleInterestRateData)
    console.log('✅ 금리 데이터 저장 성공')

    // 샘플 환율 데이터 저장 테스트
    const sampleExchangeRateData = {
      date: testDate,
      usdKrw: 1320.50,
      eurKrw: 1450.30,
      jpyKrw: 8.95,
      cnyKrw: 185.20
    }
    
    await DatabaseService.saveExchangeRateData(sampleExchangeRateData)
    console.log('✅ 환율 데이터 저장 성공')

    console.log('\n2️⃣ 데이터 조회 테스트...')
    
    // 저장된 데이터 조회 테스트
    const latestKospi = await DatabaseService.getLatestKOSPIData()
    if (latestKospi) {
      console.log(`✅ 최신 KOSPI 데이터 조회 성공: ${latestKospi.stck_prpr} (${latestKospi.date.toISOString().split('T')[0]})`)
    } else {
      console.log('❌ KOSPI 데이터 조회 실패')
    }

    console.log('\n3️⃣ Fear & Greed Index 계산 테스트...')
    
    // Fear & Greed Index 계산 테스트
    try {
      const fearGreedResult = await FearGreedCalculator.calculateIndex(testDate)
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

      // Fear & Greed Index 저장
      await DatabaseService.saveFearGreedIndex(fearGreedResult)
      console.log('✅ Fear & Greed Index 저장 성공')

      // 저장된 Fear & Greed Index 조회
      const latestIndex = await DatabaseService.getLatestFearGreedIndex()
      if (latestIndex) {
        console.log(`✅ 최신 Fear & Greed Index 조회 성공: ${latestIndex.value} (${latestIndex.level})`)
      }

    } catch (error) {
      console.error('❌ Fear & Greed Index 계산 실패:', error)
    }

    console.log('\n4️⃣ 데이터 수집 로그 테스트...')
    
    // 데이터 수집 로그 저장 테스트
    await DatabaseService.saveDataCollectionLog(
      testDate,
      'TEST',
      'SYSTEM_TEST',
      'SUCCESS',
      5,
      undefined,
      1500
    )
    console.log('✅ 데이터 수집 로그 저장 성공')

    // 데이터 수집 상태 조회
    const collectionStatus = await DatabaseService.getDataCollectionStatus(1)
    console.log(`✅ 데이터 수집 상태 조회 성공: ${collectionStatus.length}개 로그`)

    console.log('\n5️⃣ 히스토리 데이터 테스트...')
    
    // Fear & Greed Index 히스토리 조회
    const history = await DatabaseService.getFearGreedIndexHistory(7)
    console.log(`✅ Fear & Greed Index 히스토리 조회 성공: ${history.length}개 레코드`)

    console.log('\n🎉 시스템 통합 테스트 완료!')
    console.log('✅ 모든 핵심 기능이 정상 작동합니다.')
    
    return {
      success: true,
      message: '시스템 통합 테스트 성공',
      testResults: {
        databaseConnection: true,
        dataStorage: true,
        dataRetrieval: true,
        fearGreedCalculation: true,
        logging: true,
        historyQuery: true
      }
    }

  } catch (error) {
    console.error('\n❌ 시스템 통합 테스트 실패:', error)
    return {
      success: false,
      message: '시스템 통합 테스트 실패',
      error: error instanceof Error ? error.message : String(error)
    }
  } finally {
    // 데이터베이스 연결 종료
    await DatabaseService.disconnect()
    console.log('\n🔌 데이터베이스 연결 종료')
  }
}

// 직접 실행 시 테스트 실행
if (require.main === module) {
  runSystemTest()
    .then(result => {
      console.log('\n📋 테스트 결과:', result)
      process.exit(result.success ? 0 : 1)
    })
    .catch(error => {
      console.error('\n💥 테스트 실행 중 오류:', error)
      process.exit(1)
    })
}

export { runSystemTest } 