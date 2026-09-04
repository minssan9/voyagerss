# Specification: GlobalAssetComparison.vue (글로벌 자산 비교)

## Overview (개요)
A page for comparing the normalized performance of various global assets (gold, oil, indices, BTC, etc.) on a unified 100-point scale.
다양한 글로벌 자산(금, 유가, 지수, 비트코인 등)의 성과를 100점 기준의 단일 척도로 정규화하여 비교하는 페이지입니다.

## Components (구성 요소)
- **Header (헤더)**: Contains page title and "Collect" / "Normalize" buttons. (페이지 제목과 데이터 수집/정규화 버튼 포함)
- **Chart Area (차트 영역)**: Interactive line chart displaying normalized performance for selected assets and time periods (1M, 3M, 6M, 1Y). (선택한 자산 및 기간에 대한 정규화된 성과를 보여주는 대화형 라인 차트)
- **Category Filter (카테고리 필터)**: Filter chips to narrow down assets by category. (자산군별 필터링 칩)
- **Asset Toggles (자산 토글)**: Buttons to toggle visibility of specific assets on the chart. (차트에 표시할 특정 자산 선택 버튼)
- **Performance Table (성과 테이블)**: Tabular view of latest price, change %, and returns for various periods. (최근 가격, 변동률, 기간별 수익률을 보여주는 표)

## Functional Analysis (기능 분석)
- **Working (정상 동작)**: Charting (Normalized), Period selection, Category filtering, Asset toggling (using `globalAssetApi.ts`).
- **Needs Improvement (개선 필요)**:
    - "Collect" and "Normalize" buttons feedback could be more granular. (수집/정규화 버튼 실행 시 진행 상태 피드백 강화)
    - Chart.js implementation optimization for many datasets. (다수 데이터셋 표시 시 차트 최적화)

## Data Source (데이터 소스)
- Backend: `/api/investand/global-assets` (Get all assets)
- Backend: `/api/investand/global-assets/normalized` (Get normalized data)
- Backend: `/api/investand/global-assets/collect` (Trigger collection)
- Backend: `/api/investand/global-assets/normalize` (Trigger normalization)
