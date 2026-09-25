# Specification: RouteView (Investand nested routes)

## Overview (개요)
Investand module routes use the shared `RouteView.vue` wrapper instead of a module-specific layout.
Investand 모듈은 별도 레이아웃 대신 공통 `RouteView.vue` 래퍼를 사용합니다.

## Components (구성 요소)
- **Router View**: Container for nested routes within the Investand module (`/investand/*`).

## Functional Analysis (기능 분석)
- **Working (정상 동작)**: Properly routing to child components (Index, Global Assets, Market Lab, Sector Comparison).

## Data Source (데이터 소스)
- N/A (Structural component)

## Migration note
`FindashLayout.vue` was removed; all modules now share `src/layout/RouteView.vue` under `MainLayout`.
