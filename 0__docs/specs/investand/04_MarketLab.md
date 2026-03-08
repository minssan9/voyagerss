# Specification: MarketLab.vue (마켓 랩)

## Overview (개요)
An experimental "lab" for deeper relative strength analysis of global assets.
글로벌 자산의 상대적 강도를 심층 분석하기 위한 실험적 "랩(Lab)" 페이지입니다.

## Components (구성 요소)
- **Comparison Chart (비교 차트)**: Normalized performance chart. (정규화된 성과 비교 차트)
- **Asset Grid (자산 그리드)**: Detailed tiles for individual assets with sparklines. (개별 자산의 상세 정보 및 스파크라인 타일)
- **Correlation Matrix (상관관계 행렬)**: Visualization of asset correlations. (자산 간의 상관관계를 보여주는 매트릭스 시각화)

## Functional Analysis (기능 분석)
- **Working (정상 동작)**: Real-time data integration using `GlobalAssetApi`, Charting, Grid layout. (백엔드 API 연동 완료, 차트 및 그리드 레이아웃 정상 동작)
- **Improvement (개선점)**: Correlation matrix data should be fetched from backend (currently static example). (상관관계 매트릭스 데이터를 백엔드에서 실시간으로 가져오도록 개선 필요)

## Data Source (데이터 소스)
- Backend: `/api/investand/assets/normalized/{period}`
- Backend: (Planned) `/api/investand/assets/correlations/matrix`
