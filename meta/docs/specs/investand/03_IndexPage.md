# Specification: IndexPage.vue (Investand Home / 인덱스 페이지)

## Overview (개요)
Main landing page for the Investand module, focusing on the South Korean market's Fear & Greed Index and broad market indices (KOSPI/KOSDAQ).
한국 주식 시장의 공포와 탐욕 지수(Fear & Greed Index)와 주요 시장 지수(KOSPI, KOSDAQ)를 중심으로 보여주는 Investand 모듈의 메인 랜딩 페이지입니다.

## Components (구성 요소)
- **Index Card (지수 카드)**: Displays the current Fear & Greed Index value, level (Fear, Neutral, Greed), and last update date. (현재 공포/탐욕 지수 값, 단계, 업데이트 날짜 표시)
- **Component Grid (구성 요소 그리드)**: Shows individual metrics contributing to the index (Price Momentum, Sentiment, Put/Call Ratio, etc.). (지수를 구성하는 개별 지표들 표시)
- **Chart Section (차트 섹션)**: Historical trend of the index (30-day). (지수의 30일 추이 차트)
- **Market Indices (시장 지수)**: Cards showing KOSPI and KOSDAQ prices and changes. (KOSPI, KOSDAQ 가격 및 변동성 표시 카드)

## Functional Analysis (기능 분석)
- **Working (정상 동작)**: Fetching current index data, market data integration, 30-day trend chart. (현재 지수 및 시장 데이터 조회, 30일 추이 차트 구현 완료)
- **Improvement (개선점)**: Real-time update stability. (실시간 업데이트 안정성 확보)

## Data Source (데이터 소스)
- Backend: `/api/investand/fear-greed/current`
- Backend: `/api/investand/market/all` (KOSPI & KOSDAQ)
- Backend: `/api/investand/fear-greed/history` (30-day history)
