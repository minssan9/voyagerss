# Specification: SectorComparison.vue (섹터 비교)

## Overview (개요)
Analyzes and compares S&P 500 sector ETFs (Technology, Healthcare, Energy, etc.).
S&P 500 섹터 ETF(기술, 헬스케어, 에너지 등)를 분석하고 비교하는 페이지입니다.

## Components (구성 요소)
- **Stats Summary (통계 요약)**: Overall counts of performance and comparison records. (성과 및 비교 데이터의 전체 통계 요약)
- **Sector Performance Table (섹터 성과 테이블)**: Returns (1M, 3M, 1Y) and P/E ratios. (기간별 수익률 및 PER 정보 등 성과 지표)
- **Rankings & Comparisons Table (순위 및 비교 테이블)**: Relative strength compared to SPY, Beta, Correlation, and Sharpe Ratio. (SPY 대비 상대적 강도, 베타, 상관관계, 샤프 지수 등 비교 지표)

## Functional Analysis (기능 분석)
- **Working (정상 동작)**: Fetching sector data, rank-based formatting (using `sectorApi.ts`). (섹터 데이터 조회 및 순위 기반 포매팅 정상 동작)
- **Improvement (개선점)**: Adding a visualization (e.g., bar chart of relative strength) would improve UX. (상대적 강도를 보여주는 막대 차트 등 시각화 요소 추가 시 사용자 경험 향상 기대)

## Data Source (데이터 소스)
- Backend: `/api/investand/sectors`
- Backend: `/api/investand/sectors/comparisons/latest`
- Backend: `/api/investand/sectors/stats`
