/**
 * DART API 타입 정의
 * 전자공시시스템 데이터 수집을 위한 TypeScript 타입들
 */

// DART 배치 요청 인터페이스 (지분공시 D 타입 전용)
export interface DartBatchRequest {
  startDate: string      // YYYY-MM-DD
  endDate: string        // YYYY-MM-DD
  corpCode?: string      // 기업 고유번호 (8자리)
  // reportCode는 'D'로 고정되어 DartApiClient에서 처리됨
  pageNo?: number        // 페이지 번호 (기본값: 1)
  pageCount?: number     // 페이지당 건수 (최대 100)
}

// 공시정보 데이터 구조
export interface DartDisclosureData {
  corpCode: string        // 기업 고유번호
  corpName: string        // 기업명
  stockCode: string       // 주식코드
  reportName: string      // 보고서명
  receiptNumber: string   // 접수번호
  flrName: string        // 공시제출인명
  receiptDate: string    // 접수일자 (YYYYMMDD)
  remarks: string        // 비고
  disclosureDate: string // 공시일자
  reportCode: string     // 보고서 코드
}

// 기업개황 정보
export interface DartCompanyInfo {
  corpCode: string       // 기업 고유번호
  corpName: string       // 기업명
  corpNameEng: string    // 기업명(영문)
  stockName: string      // 종목명
  stockCode: string      // 주식코드
  ceoName: string        // 대표자명
  corpCls: string        // 기업구분 (Y=유가, K=코스닥, N=코넥스, E=기타)
  jurirNo: string        // 법인번호
  bizrNo: string         // 사업자번호
  adres: string          // 주소
  homUrl: string         // 홈페이지
  irUrl: string          // IR홈페이지
  phnNo: string          // 전화번호
  faxNo: string          // 팩스번호
  indutyCode: string     // 업종코드
  estDate: string        // 설립일자
  accMt: string          // 결산월
}

// 재무정보 데이터
export interface DartFinancialInfo {
  corpCode: string           // 기업 고유번호
  businessYear: string       // 사업연도
  reportCode: string         // 보고서 코드
  reprtNm: string           // 보고서명
  acntNm: string            // 계정명
  thstrmNm: string          // 당기명
  thstrmAmount: string      // 당기금액
  frmtrmNm: string          // 전기명
  frmtrmAmount: string      // 전기금액
  bfefrmtrmNm: string       // 전전기명
  bfefrmtrmAmount: string   // 전전기금액
  ord: string               // 계정순서
  currency: string          // 통화단위
  fsCls: string             // 재무제표구분
  sjNm: string              // 재무제표명
}

// 배치 작업 결과 (지분공시 D 타입 전용)
export interface DartBatchResult {
  jobId: string                    // 작업 ID
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime: Date                  // 시작 시간
  endTime?: Date                   // 종료 시간
  processedCount: number           // 처리된 건수
  successCount: number             // 성공 건수
  failedCount: number              // 실패 건수
  errors: string[]                 // 오류 메시지 목록
  resultSummary: {
    totalDisclosures: number       // 총 지분공시 건수 (D 타입만)
    stockDisclosures: number       // 지분공시 건수 (동일값)
  }
}

// Fear & Greed 지수 관련 공시 분류
export interface SentimentRelevantDisclosure extends DartDisclosureData {
  sentimentImpact: 'positive' | 'negative' | 'neutral'  // 시장 심리 영향도
  impactScore: number                                    // 영향 점수 (0-100)
  keywords: string[]                                     // 매칭된 키워드
  category: 'dividend' | 'merger' | 'acquisition' | 'financial' | 'management' | 'other'
}

// 대량보유 현황 (기존)
export interface DartStockHoldingData {
  corpCode: string        // 기업 고유번호
  corpName: string        // 기업명
  stockCode: string       // 주식코드
  reportDate: string      // 보고일자
  reporterName: string    // 보고자명
  holdingRatio: number    // 보유비율 (%)
  holdingShares: number   // 보유주식수
  changeRatio: number     // 변동비율 (%)
  changeShares: number    // 변동주식수
  changeReason: string    // 변동사유
  reportType: string      // 보고서 타입
  isSignificant: boolean  // 중요한 변동 여부
  receiptNumber: string   // 접수번호
  reportTypeCode: string  // 보고서 타입 코드
  
  // Executive holdings fields
  isu_main_shrholdr?: string   // 주요주주 여부
  isu_exctv_rgist_at?: string  // 발행회사 임원 등기여부 (Y/N)
  isu_exctv_ofcps?: string     // 발행회사 임원 직책
}

// 통합 지분공시 배치 데이터 타입
export interface DartStockDisclosureBatchData {
  // 기본 공시 정보
  receiptNumber: string
  disclosureType: string
  beforeHolding?: number
  afterHolding?: number
  changeAmount?: number
  changeReason?: string
  reporterName?: string
  isSignificant: boolean
  marketImpact?: string
  impactScore?: number
  
  // 주요 지분 관련 필드
  majorHoldingReceiptNumber?: string
  majorHoldingReceiptDate?: string
  majorHoldingCorpCode?: string
  majorHoldingCorpName?: string
  majorHoldingReportType?: string
  majorHoldingShares?: string
  majorHoldingChangeShares?: string
  majorHoldingRatio?: string
  majorHoldingChangeRatio?: string
  majorHoldingTransactionShares?: string
  majorHoldingTransactionRatio?: string
  majorHoldingReportReason?: string
  
  // 분석 관련 필드
  majorHoldingsCount?: number
  executiveHoldingsCount?: number
  totalAnalysisScore?: number
  topMajorHolder?: string
  maxMajorHoldingRate?: number
  topExecutiveHolder?: string
  maxExecutiveHoldingRate?: number
}

// 배치 처리 결과 타입
export interface DartStockDisclosureBatchResult {
  success: boolean
  transactionId: string
  operationsCompleted: number
  operationsFailed: number
  saved: number
  updated: number
  failed: number
  errors: Array<{ receiptNumber: string; error: string }>
  processingTime: number
}

// 대량보유 현황 API 응답 (majorstock 엔드포인트)
export interface DartMajorStockResponse {
  status: string
  message: string
  list?: DartMajorStockItem[]
}

// 대량보유 개별 항목
export interface DartMajorStockItem {
  rcept_no: string        // 접수번호
  rcept_dt: string        // 접수일자
  corp_cls: string        // 법인구분
  corp_code: string       // 고유번호
  corp_name: string       // 회사명
  report_tp: string       // 보고구분
  report_resn: string     // 보고사유
  stkqy: string          // 주식수
  stkrt: string          // 지분율
  ctr_stkqy: string      // 계약주식수
  ctr_stkrt: string      // 계약지분율
  report_resn_disc_dt: string  // 보고사유발생일
  reporter: string        // 보고자
  nv_stkqy?: string      // 담보제공 주식수
  nv_stkrt?: string      // 담보제공 지분율
}

// 공시 데이터 필터 옵션
export interface DartFilterOptions {
  corpCodes?: string[]           // 특정 기업들만 필터링
  reportTypes?: string[]         // 특정 보고서 타입만 필터링
  keywords?: string[]            // 제목/내용 키워드 필터링
  sentimentRelevant?: boolean    // Fear & Greed 지수 관련 공시만 필터링
  minImpactScore?: number        // 최소 영향 점수
  excludeWeekends?: boolean      // 주말 데이터 제외
}

// DART API 에러 응답
export interface DartApiError {
  status: string      // 에러 코드
  message: string     // 에러 메시지
}

// 배치 스케줄링 설정
export interface DartBatchSchedule {
  id: string
  name: string
  cronExpression: string    // cron 표현식
  isActive: boolean
  batchType: 'daily' | 'weekly' | 'monthly'
  filterOptions: DartFilterOptions
  notifyOnComplete: boolean
  retryOnFailure: boolean
  maxRetries: number
  lastRun?: Date
  nextRun?: Date
  
}

// 데이터 수집 통계
export interface DartCollectionStats {
  date: string
  totalApiCalls: number
  successfulCalls: number
  failedCalls: number
  dataPoints: number
  averageResponseTime: number   // ms
  rateLimit: {
    limit: number
    remaining: number
    resetTime: Date
  }
}

// 공시 알림 설정
export interface DartAlertConfig {
  id: string
  name: string
  corpCodes: string[]          // 모니터링할 기업 코드
  keywords: string[]           // 알림 키워드
  reportTypes: string[]        // 알림 대상 보고서 유형
  minImpactScore: number       // 최소 영향 점수
  channels: ('email' | 'slack' | 'webhook')[]  // 알림 채널
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 배치 작업 큐 아이템
export interface DartBatchQueueItem {
  id: string
  type: 'disclosure' | 'financial' | 'company_info'
  priority: 'high' | 'medium' | 'low'
  payload: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  maxAttempts: number
  createdAt: Date
  scheduledAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

// 실시간 공시 모니터링
export interface DartRealtimeMonitor {
  id: string
  isActive: boolean
  monitoringCorps: string[]     // 실시간 모니터링 기업들
  lastCheckTime: Date
  newDisclosures: DartDisclosureData[]
  alertsSent: number
}

// 임원·주요주주 소유현황 API 응답 (elestock 엔드포인트)
export interface DartExecutiveStockResponse {
  status: string
  message: string
  list?: DartExecutiveStockItem[]
}

// 임원·주요주주 소유현황 개별 항목
export interface DartExecutiveStockItem {
  rcept_no: string        // 접수번호
  rcept_dt: string        // 접수일자
  corp_code: string       // 고유번호
  corp_name: string       // 회사명
  repror: string          // 보고자
  isu_exctv_rgist_at: string    // 발행회사 임원 등기여부
  isu_exctv_ofcps: string       // 발행회사 임원 직책
  sp_stock_lmp_cnt: string      // 특정증권 대량보유 수량
  sp_stock_lmp_rate: string     // 특정증권 대량보유 비율
}

// DART API Raw Response (snake_case from API)
export interface DartDisclosureRawResponse {
  status: string
  message: string
  list?: DartDisclosureRawItem[]
  page_no: number
  page_count: number
  total_count: number
  total_page: number
}

// DART API Raw Disclosure Item (snake_case fields)
export interface DartDisclosureRawItem {
  corp_cls: string        // 법인구분
  corp_name: string       // 회사명
  corp_code: string       // 고유번호
  stock_code: string      // 주식코드
  report_nm: string       // 보고서명
  rcept_no: string        // 접수번호
  flr_nm: string          // 공시제출인명
  rcept_dt: string        // 접수일자 (YYYYMMDD)
  rm: string              // 비고
}