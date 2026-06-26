# PRD: Investand 모듈

> **버전**: v0.1.0 | **작성일**: 2026-06-06 | **상태**: Draft

---

## 1. 개요 (Overview)

### 1.1 제품 비전
한국 및 글로벌 금융 시장 데이터를 수집·분석·시각화하는 **투자 분석 플랫폼**.
KRX(한국거래소), DART(전자공시), 한국은행 등 공공 데이터 소스를 통합하여 투자자에게 의미 있는 인사이트를 제공한다.

### 1.2 문제 정의

| # | 문제 | 현재 해결 방식 | 한계 |
|---|------|--------------|------|
| 1 | 시장 데이터 파편화 | 각 기관 사이트 개별 접속 | 통합 조회 불가, 시간 낭비 |
| 2 | 투자 심리 지수 부재 | 주관적 판단 | 객관적 지표 없음 |
| 3 | DART 공시 추적 어려움 | 이메일 알림 수동 설정 | 필터링/분석 불가 |
| 4 | 섹터/글로벌 자산 비교 | 엑셀 수작업 | 실시간 비교 불가 |

### 1.3 목표 (Goals)

- **Primary**: 국내외 시장 데이터 자동 수집 및 통합 대시보드 제공
- **Secondary**: Fear & Greed 지수 자체 산출, DART 공시 자동 추적
- **Non-goal**: 직접 매매 연동, 포트폴리오 수익률 추적 (v2 이후)

---

## 2. 타겟 사용자 (Target Users)

| Persona | 역할 | 핵심 니즈 |
|---------|------|----------|
| **개인 투자자** | 주식/ETF 투자자 | 시장 흐름 파악, 공시 모니터링 |
| **퀀트 분석가** | 데이터 기반 투자자 | 원시 데이터 접근, 상관관계 분석 |
| **관리자 (Admin)** | 플랫폼 운영자 | 데이터 수집 현황, 리포트 관리 |

---

## 3. 핵심 기능 (Core Features)

### 3.1 구현된 기능

| 우선순위 | 기능명 | 설명 | 대상 |
|---------|--------|------|------|
| 🔴 P0 | **Fear & Greed 지수** | 5개 컴포넌트(가격 모멘텀·투자심리·풋콜비율·변동성·안전자산 수요) 기반 자체 산출 | 전체 |
| 🔴 P0 | **KOSPI/KOSDAQ 데이터** | 80+ 필드의 종합 시장 지표 수집 및 이력 조회 | 전체 |
| 🔴 P0 | **DART 공시 추적** | 기업별 공시 수집, 재무제표, 대주주 변동 모니터링 | 전체 |
| 🟡 P1 | **섹터 분석** | 섹터별 성과, 상대 강도, 베타, 벤치마크 대비 상관관계 | 전체 |
| 🟡 P1 | **글로벌 자산 비교** | 원자재·암호화폐·외환·글로벌 지수 성과 비교 | 전체 |
| 🟡 P1 | **경제 지표 (BOK)** | 기준금리·CD91·국채(3Y/10Y)·환율·CPI·PPI·실업률·GDP | 전체 |
| 🟡 P1 | **투자자별 매매 동향** | 외국인·개인·기관·증권사 매매 대금 추적 | 전체 |
| 🟡 P1 | **알림 시스템** | DART 알림 규칙 설정, 채널별(이메일/Telegram) 발송 | 전체 |
| 🟢 P2 | **리포트 엔진** | 정기 리포트 정의·스케줄링·실행 결과 추적 | 관리자 |
| 🟢 P2 | **데이터 내보내기** | CSV/Excel 형태 원시 데이터 다운로드 | 분석가 |
| 🟢 P2 | **시스템 인사이트** | 이상 감지, 자동 추천 알림 생성 | 관리자 |

### 3.2 데이터 소스

| 소스 | 데이터 |
|------|--------|
| KRX (한국거래소) | KOSPI, KOSDAQ, 투자자별 거래 |
| DART (전자공시시스템) | 기업 공시, 재무제표, 대주주 |
| 한국은행 (BOK) | 금리, 환율, 경제 지표 |
| 자체 산출 | Fear & Greed 지수, 정규화 자산 성과 |

---

## 4. 기술 요구사항 (Technical Requirements)

### 4.1 시스템 구성

```
Backend   : Node.js / TypeScript / Express
Database  : MySQL (Prisma ORM)
Cache     : Redis (세션, 레이트 리밋)
Auth      : JWT (Admin 전용)
Batch     : node-cron 기반 정기 수집
Frontend  : Vue 3 + Quasar
```

### 4.2 비기능 요구사항

| 항목 | 요구 수준 |
|------|----------|
| 데이터 수집 주기 | 장중: 실시간, 장외: 일 1회 |
| API 응답 | P95 ≤ 300ms |
| Admin MFA | TOTP 기반 2단계 인증 |
| 레이트 리밋 | IP 기반 자동 차단 |

---

## 5. 데이터 모델 (Core Data Model)

```
시장 데이터
├── FearGreedIndex     — 일별 공포/탐욕 지수 (5개 컴포넌트)
├── KospiData          — KOSPI 일별 80+ 지표
├── KosdaqData         — KOSDAQ 일별 지표
├── InvestorTrading    — 투자자 유형별 거래
├── OptionData         — 옵션 거래 (풋/콜 비율)
├── VkospiData         — 변동성 지수
├── InterestRateData   — 금리 (기준/콜/CD/국채)
├── ExchangeRateData   — 환율 (USD/EUR/JPY/CNY)
├── EconomicIndicatorData — 경제 지표
├── BondYieldCurveData — 채권 수익률 곡선
├── SectorPerformance  — 섹터별 성과
├── SectorComparison   — 섹터 상대 강도·상관관계
├── GlobalAssetPerformance — 글로벌 자산 성과
├── NormalizedAssetData — 정규화 성과 곡선
└── AssetCorrelation   — 교차 자산 상관관계

DART 공시
├── DartCompany        — 기업 메타데이터
├── DartDisclosure     — 공시 원문
├── DartFinancial      — 재무제표
├── DartStockHolding   — 대주주 변동
├── DartAlert          — 알림 규칙
└── DartBatchLog       — 수집 배치 이력

Admin / 시스템
├── AdminUser          — 관리자 계정 (MFA, RBAC)
├── AdminSession / AdminRefreshToken / AdminLoginAttempt
├── NotificationChannel / NotificationSubscription / NotificationTemplate / NotificationLog
├── ReportDefinition / ReportExecution / ReportSchedule
├── DataExportRequest  — 데이터 내보내기 요청
├── SystemInsight      — 자동 생성 인사이트
├── RateLimitRecord    — 레이트 리밋 기록
└── SecurityConfig     — 보안 설정
```

---

## 6. API 현황

### 공개 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/fear-greed/latest` | 최신 공포/탐욕 지수 |
| GET | `/api/fear-greed/history?days=30` | 이력 조회 |
| GET | `/api/market/kospi/latest` | 최신 KOSPI |
| GET | `/api/market/kosdaq` | KOSDAQ 데이터 |
| GET | `/api/market/market` | KOSPI + KOSDAQ 통합 |
| GET | `/api/system/status` | 시스템 헬스 + 최신 데이터 타임스탬프 |
| GET | `/api/system/collection-status?days=7` | 데이터 수집 로그 |
| GET | `/api/dart/disclosures` | 공시 검색 (날짜/종목/페이징) |

### 관리자 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/admin/calculate-index` | 수동 지수 재산출 |
| * | `/api/admin/auth/*` | 관리자 인증·세션 |
| * | `/api/admin/reports/*` | 리포트 생성·스케줄 |
| * | `/api/admin/export/*` | 데이터 내보내기 |

---

## 7. 프론트엔드 라우트

| Route | View | 역할 | 상태 |
|-------|------|------|------|
| `/investand` | IndexPage | 랜딩 | ✅ |
| `/investand/market-lab` | MarketLab | 시장 분석 대시보드 | ✅ |
| `/investand/sector` | SectorComparison | 섹터 비교 | ✅ |
| `/investand/global` | GlobalAssetComparison | 글로벌 자산 비교 | ✅ |
| `/investand/dart` | DartDataPage | 공시 조회 | ✅ |
| `/investand/bok` | EconomicPage | 경제 지표 (한국은행) | ✅ |
| `/investand/settings` | Settings | 사용자 설정 | ✅ |
| `/investand/admin/login` | AdminLogin | 관리자 로그인 | ✅ |
| `/investand/admin/dashboard` | DashboardPage | 관리자 대시보드 | ✅ |
| `/investand/admin/dart` | DartAdminPage | 공시 데이터 관리 | ✅ |
| `/investand/admin/fear-greed` | FearGreedAdminPage | 지수 관리 | ✅ |

---

## 8. 갭 분석 (Gap Analysis)

| 항목 | 상태 | 설명 |
|------|------|------|
| 실시간 주가 데이터 | ❌ 미구현 | 장중 틱 데이터 없음, 일별 집계만 |
| 포트폴리오 추적 | ❌ 미구현 | 개인 보유 종목 관리 기능 없음 |
| 모바일 반응형 | ⚠️ 부분 | 데스크탑 위주 UI |
| 알림 실제 발송 | ⚠️ 확인 필요 | NotificationChannel 모델 존재, 실제 발송 로직 검증 필요 |
| 리포트 자동화 | ✅ 모델 구현 | `ReportDefinition/Execution/Schedule` 존재 |

---

## 9. 타임라인 (Timeline)

| 단계 | 주요 산출물 |
|------|-----------|
| v0.1 (완료) | 시장 데이터 수집, Fear&Greed 지수, DART 추적, 관리자 대시보드 |
| v0.2 (계획) | 실시간 틱 데이터, 알림 발송 검증, 모바일 반응형 개선 |
| v1.0 (계획) | 포트폴리오 추적, AI 기반 인사이트 자동화 |

---

*이 문서는 살아있는 문서(Living Document)입니다.*
