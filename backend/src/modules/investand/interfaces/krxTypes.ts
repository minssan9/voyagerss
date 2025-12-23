// KRX Stock Data Types
export interface krxStockData {
  date: string
  iscd_stat_cls_code: string
  marg_rate: string
  rprs_mrkt_kor_name: string
  new_hgpr_lwpr_cls_code: string
  bstp_kor_isnm: string
  temp_stop_yn: string
  oprc_rang_cont_yn: string
  clpr_rang_cont_yn: string
  crdt_able_yn: string
  grmn_rate_cls_code: string
  elw_pblc_yn: string
  stck_prpr: string
  prdy_vrss: string
  prdy_vrss_sign: string
  prdy_ctrt: string
  acml_tr_pbmn: string
  acml_vol: string
  prdy_vrss_vol_rate: string
  stck_oprc: string
  stck_hgpr: string
  stck_lwpr: string
  stck_mxpr: string
  stck_llam: string
  stck_sdpr: string
  wghn_avrg_stck_prc: string
  hts_frgn_ehrt: string
  frgn_ntby_qty: string
  pgtr_ntby_qty: string
  pvt_scnd_dmrs_prc: string
  pvt_frst_dmrs_prc: string
  pvt_pont_val: string
  pvt_frst_dmsp_prc: string
  pvt_scnd_dmsp_prc: string
  dmrs_val: string
  dmsp_val: string
  cpfn: string
  rstc_wdth_prc: string
  stck_fcam: string
  stck_sspr: string
  aspr_unit: string
  hts_deal_qty_unit_val: string
  lstn_stcn: string
  hts_avls: string
  per: string
  pbr: string
  stac_month: string
  vol_tnrt: string
  eps: string
  bps: string
  d250_hgpr: string
  d250_hgpr_date: string
  d250_hgpr_vrss_prpr_rate: string
  d250_lwpr: string
  d250_lwpr_date: string
  d250_lwpr_vrss_prpr_rate: string
  stck_dryy_hgpr: string
  dryy_hgpr_vrss_prpr_rate: string
  dryy_hgpr_date: string
  stck_dryy_lwpr: string
  dryy_lwpr_vrss_prpr_rate: string
  dryy_lwpr_date: string
  w52_hgpr: string
  w52_hgpr_vrss_prpr_ctrt: string
  w52_hgpr_date: string
  w52_lwpr: string
  w52_lwpr_vrss_prpr_ctrt: string
  w52_lwpr_date: string
  whol_loan_rmnd_rate: string
  ssts_yn: string
  stck_shrn_iscd: string
  fcam_cnnm: string
  cpfn_cnnm: string
  apprch_rate: string
  frgn_hldn_qty: string
  vi_cls_code: string
  ovtm_vi_cls_code: string
  last_ssts_cntg_qty: string
  invt_caful_yn: string
  mrkt_warn_cls_code: string
  short_over_yn: string
  sltr_yn: string
  mang_issu_cls_code: string
}

export interface InvestorTradingData {
  date: string
  frgn_seln_vol: string    // 외국인 매도 거래량
  frgn_shnu_vol: string    // 외국인 매수2 거래량
  frgn_ntby_qty: string    // 외국인 순매수 수량
  frgn_seln_tr_pbmn: string    // 외국인 매도 거래 대금
  frgn_shnu_tr_pbmn: string    // 외국인 매수2 거래 대금
  frgn_ntby_tr_pbmn: string    // 외국인 순매수 거래 대금
  prsn_seln_vol: string    // 개인 매도 거래량
  prsn_shnu_vol: string    // 개인 매수2 거래량
  prsn_ntby_qty: string    // 개인 순매수 수량
  prsn_seln_tr_pbmn: string    // 개인 매도 거래 대금
  prsn_shnu_tr_pbmn: string    // 개인 매수2 거래 대금
  prsn_ntby_tr_pbmn: string    // 개인 순매수 거래 대금
  orgn_seln_vol: string    // 기관계 매도 거래량
  orgn_shnu_vol: string    // 기관계 매수2 거래량
  orgn_ntby_qty: string    // 기관계 순매수 수량
  orgn_seln_tr_pbmn: string    // 기관계 매도 거래 대금
  orgn_shnu_tr_pbmn: string    // 기관계 매수2 거래 대금
  orgn_ntby_tr_pbmn: string    // 기관계 순매수 거래 대금
  scrt_seln_vol: string    // 증권 매도 거래량
  scrt_shnu_vol: string    // 증권 매수2 거래량
  scrt_ntby_qty: string    // 증권 순매수 수량
  scrt_seln_tr_pbmn: string    // 증권 매도 거래 대금
  scrt_shnu_tr_pbmn: string    // 증권 매수2 거래 대금
  scrt_ntby_tr_pbmn: string    // 증권 순매수 거래 대금
  ivtr_seln_vol: string    // 투자신탁 매도 거래량
  ivtr_shnu_vol: string    // 투자신탁 매수2 거래량
  ivtr_ntby_qty: string    // 투자신탁 순매수 수량
  ivtr_seln_tr_pbmn: string    // 투자신탁 매도 거래 대금
  ivtr_shnu_tr_pbmn: string    // 투자신탁 매수2 거래 대금
  ivtr_ntby_tr_pbmn: string    // 투자신탁 순매수 거래 대금
  pe_fund_seln_tr_pbmn: string    // 사모 펀드 매도 거래 대금
  pe_fund_seln_vol: string    // 사모 펀드 매도 거래량
  pe_fund_ntby_vol: string    // 사모 펀드 순매수 거래량
  pe_fund_shnu_tr_pbmn: string    // 사모 펀드 매수2 거래 대금
  pe_fund_shnu_vol: string    // 사모 펀드 매수2 거래량
  pe_fund_ntby_tr_pbmn: string    // 사모 펀드 순매수 거래 대금
  bank_seln_vol: string    // 은행 매도 거래량
  bank_shnu_vol: string    // 은행 매수2 거래량
  bank_ntby_qty: string    // 은행 순매수 수량
  bank_seln_tr_pbmn: string    // 은행 매도 거래 대금
  bank_shnu_tr_pbmn: string    // 은행 매수2 거래 대금
  bank_ntby_tr_pbmn: string    // 은행 순매수 거래 대금
  insu_seln_vol: string    // 보험 매도 거래량
  insu_shnu_vol: string    // 보험 매수2 거래량
  insu_ntby_qty: string    // 보험 순매수 수량
  insu_seln_tr_pbmn: string    // 보험 매도 거래 대금
  insu_shnu_tr_pbmn: string    // 보험 매수2 거래 대금
  insu_ntby_tr_pbmn: string    // 보험 순매수 거래 대금
  mrbn_seln_vol: string    // 종금 매도 거래량
  mrbn_shnu_vol: string    // 종금 매수2 거래량
  mrbn_ntby_qty: string    // 종금 순매수 수량
  mrbn_seln_tr_pbmn: string    // 종금 매도 거래 대금
  mrbn_shnu_tr_pbmn: string    // 종금 매수2 거래 대금
  mrbn_ntby_tr_pbmn: string    // 종금 순매수 거래 대금
  fund_seln_vol: string    // 기금 매도 거래량
  fund_shnu_vol: string    // 기금 매수2 거래량
  fund_ntby_qty: string    // 기금 순매수 수량
  fund_seln_tr_pbmn: string    // 기금 매도 거래 대금
  fund_shnu_tr_pbmn: string    // 기금 매수2 거래 대금
  fund_ntby_tr_pbmn: string    // 기금 순매수 거래 대금
  etc_orgt_seln_vol: string    // 기타 단체 매도 거래량
  etc_orgt_shnu_vol: string    // 기타 단체 매수2 거래량
  etc_orgt_ntby_vol: string    // 기타 단체 순매수 거래량
  etc_orgt_seln_tr_pbmn: string    // 기타 단체 매도 거래 대금
  etc_orgt_shnu_tr_pbmn: string    // 기타 단체 매수2 거래 대금
  etc_orgt_ntby_tr_pbmn: string    // 기타 단체 순매수 거래 대금
  etc_corp_seln_vol: string    // 기타 법인 매도 거래량
  etc_corp_shnu_vol: string    // 기타 법인 매수2 거래량
  etc_corp_ntby_vol: string    // 기타 법인 순매수 거래량
  etc_corp_seln_tr_pbmn: string    // 기타 법인 매도 거래 대금
  etc_corp_shnu_tr_pbmn: string    // 기타 법인 매수2 거래 대금
  etc_corp_ntby_tr_pbmn: string    // 기타 법인 순매수 거래 대금
}

export interface OptionData {
  date: string
  putVolume: number
  callVolume: number
  putCallRatio: number
} 