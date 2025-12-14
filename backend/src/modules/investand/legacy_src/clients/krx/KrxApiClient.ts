import axios from 'axios'
import type { krxStockData, InvestorTradingData, OptionData } from '@/types/collectors/krxTypes'

/**
 * KRX API 클라이언트
 * Korea Investment & Securities (KIS) OpenAPI를 통한 시장데이터 수집
 */
export class KrxApiClient {

  // ================================
  // STATIC PROPERTIES & CONSTANTS
  // ================================

  private static readonly BASE_URL = 'https://openapi.koreainvestment.com:9443'
  private static readonly APP_KEY = process.env.KIS_API_KEY || ''
  private static readonly APP_SECRET = process.env.KIS_API_SECRET || ''
  private static readonly TIMEOUT = 10000
  private static readonly CUSTOMER_TYPE = 'P' // 개인
  private static readonly RATE_LIMIT_DELAY = 100 // 100ms between requests
  
  private static accessToken: string | null = null

  // ================================
  // PUBLIC METHODS (API SURFACE)
  // ================================

  /**
   * KRX 지수 데이터 수집 (KOSPI/KOSDAQ)
   */
  static async fetchStockData(date: string, market: 'KOSPI' | 'KOSDAQ'): Promise<krxStockData> {
    await this.enforceRateLimit()
    
    const marketCode = market === 'KOSPI' ? '0001' : '1001'
    
    try {
      const response = await axios.get(
        `${this.BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
        {
          params: {
            fid_cond_mrkt_div_code: 'U',
            fid_input_iscd: marketCode,
          },
          headers: await this.getHeaders('FHPUP02100000'),
          timeout: this.TIMEOUT,
        }
      )

      const data = response.data?.output
      if (!data) throw new Error(`No ${market} data returned`)

      return this.transformStockData(data, date)

    } catch (error) {
      const errorMessage = `[KIS] ${market} 데이터 수집 실패 (${date}): ${(error as any)?.message}`
      console.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 투자자별 매매동향 데이터 수집
   */
  static async fetchInvestorTradingData(
    date: string,
    market: 'KOSPI' | 'KOSDAQ' = 'KOSPI'
  ): Promise<InvestorTradingData> {
    await this.enforceRateLimit()
    
    const marketCode = market === 'KOSPI' ? '0001' : '1001'
    const marketName = market

    try {
      const response = await axios.get(
        `${this.BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor-time-by-market`,
        {
          params: {
            fid_cond_mrkt_div_code: 'J',
            fid_input_iscd: marketCode,
            fid_input_date_1: date.replace(/-/g, ''),
            fid_input_date_2: date.replace(/-/g, ''),
            fid_vol_cnt_gb_cd: '1', // 1: 수량, 2: 금액
          },
          headers: await this.getHeaders('FHPTJ04030000'),
          timeout: this.TIMEOUT,
        }
      )

      const data = response.data?.output1[0] // output1 is an array
      if (!data) throw new Error(`No investor trading data returned for ${marketName}`)

      return this.transformInvestorTradingData(data, date)

    } catch (error) {
      const errorMessage = `[KIS] ${marketName} 투자자별 매매동향 수집 실패 (${date}): ${(error as any)?.message}`
      console.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 옵션 Put/Call 비율 데이터 수집 (KIS API에서 지원하지 않음)
   */
  static async fetchOptionData(date: string): Promise<OptionData> {
    throw new Error('Option data (Put/Call ratio) is not supported by Korea Investment & Securities Open API.')
  }

  /**
   * 특정 날짜의 모든 KRX 데이터 수집
   */
  static async fetchAllMarketData(date: string): Promise<{
    kospiData: krxStockData | null
    kosdaqData: krxStockData | null
    kospiInvestorTrading: InvestorTradingData | null
    kosdaqInvestorTrading: InvestorTradingData | null
  }> {
    console.log(`[KRX] ${date} 전체 시장데이터 수집 시작`)
    
    const results = {
      kospiData: null as krxStockData | null,
      kosdaqData: null as krxStockData | null,
      kospiInvestorTrading: null as InvestorTradingData | null,
      kosdaqInvestorTrading: null as InvestorTradingData | null
    }

    // 병렬 처리로 성능 최적화
    const promises = [
      this.safeApiCall(() => this.fetchStockData(date, 'KOSPI'), 'KOSPI 지수'),
      this.safeApiCall(() => this.fetchStockData(date, 'KOSDAQ'), 'KOSDAQ 지수'),
      this.safeApiCall(() => this.fetchInvestorTradingData(date, 'KOSPI'), 'KOSPI 투자자거래'),
      this.safeApiCall(() => this.fetchInvestorTradingData(date, 'KOSDAQ'), 'KOSDAQ 투자자거래')
    ]

    const [kospi, kosdaq, kospiInvestor, kosdaqInvestor] = await Promise.allSettled(promises)

    results.kospiData = kospi?.status === 'fulfilled' ? kospi.value as krxStockData : null
    results.kosdaqData = kosdaq?.status === 'fulfilled' ? kosdaq.value as krxStockData : null  
    results.kospiInvestorTrading = kospiInvestor?.status === 'fulfilled' ? kospiInvestor.value as InvestorTradingData : null
    results.kosdaqInvestorTrading = kosdaqInvestor?.status === 'fulfilled' ? kosdaqInvestor.value as InvestorTradingData : null

    console.log(`[KRX] ${date} 전체 시장데이터 수집 완료`)
    return results
  }

  // ================================
  // PRIVATE METHODS (IMPLEMENTATION)
  // ================================

  /**
   * KIS API 접근 토큰 발급
   */
  private static async issueAccessToken(): Promise<void> {
    try {
      if (!this.APP_KEY || !this.APP_SECRET) {
        throw new Error('KIS API Key or Secret is not set in environment variables.')
      }

      const response = await axios.post(
        `${this.BASE_URL}/oauth2/tokenP`,
        {
          grant_type: 'client_credentials',
          appkey: this.APP_KEY,
          appsecret: this.APP_SECRET,
        },
        {
          headers: { 'content-type': 'application/json' },
          timeout: this.TIMEOUT,
        }
      )

      const token = response.data?.access_token
      if (!token) {
        throw new Error('Failed to retrieve access token from KIS API.')
      }
      
      this.accessToken = token
      console.log('[KIS] Access token issued successfully.')
      
    } catch (error) {
      const errorMessage = `[KIS] Access token issuance failed: ${
        (error as any).response?.data?.msg1 || (error as any).message
      }`
      console.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 유효한 접근 토큰 반환 (없으면 발급)
   */
  private static async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      await this.issueAccessToken()
    }
    return this.accessToken!
  }

  /**
   * API 요청 헤더 생성
   */
  private static async getHeaders(trId: string): Promise<Record<string, string>> {
    const accessToken = await this.getAccessToken()
    
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      appkey: this.APP_KEY,
      appsecret: this.APP_SECRET,
      tr_id: trId,
      custtype: this.CUSTOMER_TYPE,
    }
  }

  /**
   * 주식 데이터 변환
   */
  private static transformStockData(apiData: any, date: string): krxStockData {
    return {
      date,
      iscd_stat_cls_code: apiData.iscd_stat_cls_code ?? '',
      marg_rate: apiData.marg_rate ?? '',
      rprs_mrkt_kor_name: apiData.rprs_mrkt_kor_name ?? '',
      new_hgpr_lwpr_cls_code: apiData.new_hgpr_lwpr_cls_code ?? '',
      bstp_kor_isnm: apiData.bstp_kor_isnm ?? '',
      temp_stop_yn: apiData.temp_stop_yn ?? '',
      oprc_rang_cont_yn: apiData.oprc_rang_cont_yn ?? '',
      clpr_rang_cont_yn: apiData.clpr_rang_cont_yn ?? '',
      crdt_able_yn: apiData.crdt_able_yn ?? '',
      grmn_rate_cls_code: apiData.grmn_rate_cls_code ?? '',
      elw_pblc_yn: apiData.elw_pblc_yn ?? '',
      stck_prpr: apiData.stck_prpr ?? '',
      prdy_vrss: apiData.prdy_vrss ?? '',
      prdy_vrss_sign: apiData.prdy_vrss_sign ?? '',
      prdy_ctrt: apiData.prdy_ctrt ?? '',
      acml_tr_pbmn: apiData.acml_tr_pbmn ?? '',
      acml_vol: apiData.acml_vol ?? '',
      prdy_vrss_vol_rate: apiData.prdy_vrss_vol_rate ?? '',
      stck_oprc: apiData.stck_oprc ?? '',
      stck_hgpr: apiData.stck_hgpr ?? '',
      stck_lwpr: apiData.stck_lwpr ?? '',
      stck_mxpr: apiData.stck_mxpr ?? '',
      stck_llam: apiData.stck_llam ?? '',
      stck_sdpr: apiData.stck_sdpr ?? '',
      wghn_avrg_stck_prc: apiData.wghn_avrg_stck_prc ?? '',
      hts_frgn_ehrt: apiData.hts_frgn_ehrt ?? '',
      frgn_ntby_qty: apiData.frgn_ntby_qty ?? '',
      pgtr_ntby_qty: apiData.pgtr_ntby_qty ?? '',
      pvt_scnd_dmrs_prc: apiData.pvt_scnd_dmrs_prc ?? '',
      pvt_frst_dmrs_prc: apiData.pvt_frst_dmrs_prc ?? '',
      pvt_pont_val: apiData.pvt_pont_val ?? '',
      pvt_frst_dmsp_prc: apiData.pvt_frst_dmsp_prc ?? '',
      pvt_scnd_dmsp_prc: apiData.pvt_scnd_dmsp_prc ?? '',
      dmrs_val: apiData.dmrs_val ?? '',
      dmsp_val: apiData.dmsp_val ?? '',
      cpfn: apiData.cpfn ?? '',
      rstc_wdth_prc: apiData.rstc_wdth_prc ?? '',
      stck_fcam: apiData.stck_fcam ?? '',
      stck_sspr: apiData.stck_sspr ?? '',
      aspr_unit: apiData.aspr_unit ?? '',
      hts_deal_qty_unit_val: apiData.hts_deal_qty_unit_val ?? '',
      lstn_stcn: apiData.lstn_stcn ?? '',
      hts_avls: apiData.hts_avls ?? '',
      per: apiData.per ?? '',
      pbr: apiData.pbr ?? '',
      stac_month: apiData.stac_month ?? '',
      vol_tnrt: apiData.vol_tnrt ?? '',
      eps: apiData.eps ?? '',
      bps: apiData.bps ?? '',
      d250_hgpr: apiData.d250_hgpr ?? '',
      d250_hgpr_date: apiData.d250_hgpr_date ?? '',
      d250_hgpr_vrss_prpr_rate: apiData.d250_hgpr_vrss_prpr_rate ?? '',
      d250_lwpr: apiData.d250_lwpr ?? '',
      d250_lwpr_date: apiData.d250_lwpr_date ?? '',
      d250_lwpr_vrss_prpr_rate: apiData.d250_lwpr_vrss_prpr_rate ?? '',
      stck_dryy_hgpr: apiData.stck_dryy_hgpr ?? '',
      dryy_hgpr_vrss_prpr_rate: apiData.dryy_hgpr_vrss_prpr_rate ?? '',
      dryy_hgpr_date: apiData.dryy_hgpr_date ?? '',
      stck_dryy_lwpr: apiData.stck_dryy_lwpr ?? '',
      dryy_lwpr_vrss_prpr_rate: apiData.dryy_lwpr_vrss_prpr_rate ?? '',
      dryy_lwpr_date: apiData.dryy_lwpr_date ?? '',
      w52_hgpr: apiData.w52_hgpr ?? '',
      w52_hgpr_vrss_prpr_ctrt: apiData.w52_hgpr_vrss_prpr_ctrt ?? '',
      w52_hgpr_date: apiData.w52_hgpr_date ?? '',
      w52_lwpr: apiData.w52_lwpr ?? '',
      w52_lwpr_vrss_prpr_ctrt: apiData.w52_lwpr_vrss_prpr_ctrt ?? '',
      w52_lwpr_date: apiData.w52_lwpr_date ?? '',
      whol_loan_rmnd_rate: apiData.whol_loan_rmnd_rate ?? '',
      ssts_yn: apiData.ssts_yn ?? '',
      stck_shrn_iscd: apiData.stck_shrn_iscd ?? '',
      fcam_cnnm: apiData.fcam_cnnm ?? '',
      cpfn_cnnm: apiData.cpfn_cnnm ?? '',
      apprch_rate: apiData.apprch_rate ?? '',
      frgn_hldn_qty: apiData.frgn_hldn_qty ?? '',
      vi_cls_code: apiData.vi_cls_code ?? '',
      ovtm_vi_cls_code: apiData.ovtm_vi_cls_code ?? '',
      last_ssts_cntg_qty: apiData.last_ssts_cntg_qty ?? '',
      invt_caful_yn: apiData.invt_caful_yn ?? '',
      mrkt_warn_cls_code: apiData.mrkt_warn_cls_code ?? '',
      short_over_yn: apiData.short_over_yn ?? '',
      sltr_yn: apiData.sltr_yn ?? '',
      mang_issu_cls_code: apiData.mang_issu_cls_code ?? ''
    }
  }

  /**
   * 투자자 거래 데이터 변환
   */
  private static transformInvestorTradingData(apiData: any, date: string): InvestorTradingData {
    return {
      date,
      frgn_seln_vol: apiData.frgn_seln_vol ?? '',
      frgn_shnu_vol: apiData.frgn_shnu_vol ?? '',
      frgn_ntby_qty: apiData.frgn_ntby_qty ?? '',
      frgn_seln_tr_pbmn: apiData.frgn_seln_tr_pbmn ?? '',
      frgn_shnu_tr_pbmn: apiData.frgn_shnu_tr_pbmn ?? '',
      frgn_ntby_tr_pbmn: apiData.frgn_ntby_tr_pbmn ?? '',
      prsn_seln_vol: apiData.prsn_seln_vol ?? '',
      prsn_shnu_vol: apiData.prsn_shnu_vol ?? '',
      prsn_ntby_qty: apiData.prsn_ntby_qty ?? '',
      prsn_seln_tr_pbmn: apiData.prsn_seln_tr_pbmn ?? '',
      prsn_shnu_tr_pbmn: apiData.prsn_shnu_tr_pbmn ?? '',
      prsn_ntby_tr_pbmn: apiData.prsn_ntby_tr_pbmn ?? '',
      orgn_seln_vol: apiData.orgn_seln_vol ?? '',
      orgn_shnu_vol: apiData.orgn_shnu_vol ?? '',
      orgn_ntby_qty: apiData.orgn_ntby_qty ?? '',
      orgn_seln_tr_pbmn: apiData.orgn_seln_tr_pbmn ?? '',
      orgn_shnu_tr_pbmn: apiData.orgn_shnu_tr_pbmn ?? '',
      orgn_ntby_tr_pbmn: apiData.orgn_ntby_tr_pbmn ?? '',
      scrt_seln_vol: apiData.scrt_seln_vol ?? '',
      scrt_shnu_vol: apiData.scrt_shnu_vol ?? '',
      scrt_ntby_qty: apiData.scrt_ntby_qty ?? '',
      scrt_seln_tr_pbmn: apiData.scrt_seln_tr_pbmn ?? '',
      scrt_shnu_tr_pbmn: apiData.scrt_shnu_tr_pbmn ?? '',
      scrt_ntby_tr_pbmn: apiData.scrt_ntby_tr_pbmn ?? '',
      ivtr_seln_vol: apiData.ivtr_seln_vol ?? '',
      ivtr_shnu_vol: apiData.ivtr_shnu_vol ?? '',
      ivtr_ntby_qty: apiData.ivtr_ntby_qty ?? '',
      ivtr_seln_tr_pbmn: apiData.ivtr_seln_tr_pbmn ?? '',
      ivtr_shnu_tr_pbmn: apiData.ivtr_shnu_tr_pbmn ?? '',
      ivtr_ntby_tr_pbmn: apiData.ivtr_ntby_tr_pbmn ?? '',
      pe_fund_seln_tr_pbmn: apiData.pe_fund_seln_tr_pbmn ?? '',
      pe_fund_seln_vol: apiData.pe_fund_seln_vol ?? '',
      pe_fund_ntby_vol: apiData.pe_fund_ntby_vol ?? '',
      pe_fund_shnu_tr_pbmn: apiData.pe_fund_shnu_tr_pbmn ?? '',
      pe_fund_shnu_vol: apiData.pe_fund_shnu_vol ?? '',
      pe_fund_ntby_tr_pbmn: apiData.pe_fund_ntby_tr_pbmn ?? '',
      bank_seln_vol: apiData.bank_seln_vol ?? '',
      bank_shnu_vol: apiData.bank_shnu_vol ?? '',
      bank_ntby_qty: apiData.bank_ntby_qty ?? '',
      bank_seln_tr_pbmn: apiData.bank_seln_tr_pbmn ?? '',
      bank_shnu_tr_pbmn: apiData.bank_shnu_tr_pbmn ?? '',
      bank_ntby_tr_pbmn: apiData.bank_ntby_tr_pbmn ?? '',
      insu_seln_vol: apiData.insu_seln_vol ?? '',
      insu_shnu_vol: apiData.insu_shnu_vol ?? '',
      insu_ntby_qty: apiData.insu_ntby_qty ?? '',
      insu_seln_tr_pbmn: apiData.insu_seln_tr_pbmn ?? '',
      insu_shnu_tr_pbmn: apiData.insu_shnu_tr_pbmn ?? '',
      insu_ntby_tr_pbmn: apiData.insu_ntby_tr_pbmn ?? '',
      mrbn_seln_vol: apiData.mrbn_seln_vol ?? '',
      mrbn_shnu_vol: apiData.mrbn_shnu_vol ?? '',
      mrbn_ntby_qty: apiData.mrbn_ntby_qty ?? '',
      mrbn_seln_tr_pbmn: apiData.mrbn_seln_tr_pbmn ?? '',
      mrbn_shnu_tr_pbmn: apiData.mrbn_shnu_tr_pbmn ?? '',
      mrbn_ntby_tr_pbmn: apiData.mrbn_ntby_tr_pbmn ?? '',
      fund_seln_vol: apiData.fund_seln_vol ?? '',
      fund_shnu_vol: apiData.fund_shnu_vol ?? '',
      fund_ntby_qty: apiData.fund_ntby_qty ?? '',
      fund_seln_tr_pbmn: apiData.fund_seln_tr_pbmn ?? '',
      fund_shnu_tr_pbmn: apiData.fund_shnu_tr_pbmn ?? '',
      fund_ntby_tr_pbmn: apiData.fund_ntby_tr_pbmn ?? '',
      etc_orgt_seln_vol: apiData.etc_orgt_seln_vol ?? '',
      etc_orgt_shnu_vol: apiData.etc_orgt_shnu_vol ?? '',
      etc_orgt_ntby_vol: apiData.etc_orgt_ntby_vol ?? '',
      etc_orgt_seln_tr_pbmn: apiData.etc_orgt_seln_tr_pbmn ?? '',
      etc_orgt_shnu_tr_pbmn: apiData.etc_orgt_shnu_tr_pbmn ?? '',
      etc_orgt_ntby_tr_pbmn: apiData.etc_orgt_ntby_tr_pbmn ?? '',
      etc_corp_seln_vol: apiData.etc_corp_seln_vol ?? '',
      etc_corp_shnu_vol: apiData.etc_corp_shnu_vol ?? '',
      etc_corp_ntby_vol: apiData.etc_corp_ntby_vol ?? '',
      etc_corp_seln_tr_pbmn: apiData.etc_corp_seln_tr_pbmn ?? '',
      etc_corp_shnu_tr_pbmn: apiData.etc_corp_shnu_tr_pbmn ?? '',
      etc_corp_ntby_tr_pbmn: apiData.etc_corp_ntby_tr_pbmn ?? '',
    }
  }

  /**
   * 안전한 API 호출 래퍼
   */
  private static async safeApiCall<T>(
    apiCall: () => Promise<T>, 
    operation: string
  ): Promise<T | null> {
    try {
      const result = await apiCall()
      console.log(`[KRX] ${operation} 수집 완료`)
      return result
    } catch (error) {
      console.error(`[KRX] ${operation} 수집 실패:`, (error as any)?.message)
      return null
    }
  }

  // ================================
  // HELPER METHODS & UTILITIES
  // ================================

  /**
   * API 호출 간 레이트 리밋 적용
   */
  private static async enforceRateLimit(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY))
  }

  /**
   * 최근 영업일 계산 (주말, 공휴일 제외)
   */
  static getLastBusinessDay(): string {
    const today = new Date()
    const day = today.getDay()
    let daysToSubtract = 1
    
    // 월요일(1)이면 3일전(금요일), 일요일(0)이면 2일전, 토요일(6)이면 1일전
    if (day === 1) daysToSubtract = 3
    else if (day === 0) daysToSubtract = 2
    else if (day === 6) daysToSubtract = 1
    
    const lastBusinessDay = new Date(today)
    lastBusinessDay.setDate(today.getDate() - daysToSubtract)
    return lastBusinessDay.toISOString().split('T')[0] as string
  }

  // ================================
  // ERROR HANDLING & VALIDATION
  // ================================

  /**
   * API 키 설정 검증
   */
  static validateApiKeys(): boolean {
    return !!(this.APP_KEY && this.APP_SECRET)
  }

  /**
   * 날짜 형식 검증
   */
  static validateDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) return false
    
    const dateObj = new Date(date)
    return dateObj instanceof Date && !isNaN(dateObj.getTime())
  }
}