# PRD: Auto-PR (AIPR) 모듈

> **버전**: v0.1.0 | **작성일**: 2026-06-06 | **상태**: Draft

---

## 1. 개요 (Overview)

### 1.1 제품 비전
사용자 피드백(이슈)을 받아 **AI가 자동으로 계획 문서를 생성하고 PR을 빌드**하는 자동화 플랫폼.
임베드 가능한 위젯으로 피드백을 수집하고, NestJS API + BullMQ Worker를 통해 AI 기반 플래닝·빌드 파이프라인을 실행한다.

### 1.2 문제 정의

| # | 문제 | 현재 해결 방식 | 한계 |
|---|------|--------------|------|
| 1 | 피드백 → PR 전환까지 수작업 多 | GitHub 이슈 수동 작성 | 느림, 일관성 없음 |
| 2 | 기획 문서 작성 비용 높음 | 개발자 직접 작성 | 시간 소모 |
| 3 | 피드백 수집 채널 통합 부재 | 이메일/Slack 혼재 | 추적 불가 |

### 1.3 목표 (Goals)

- **Primary**: 이슈 등록 → AI 계획 문서 생성 → 자동 PR 빌드 전체 파이프라인 자동화
- **Secondary**: 임베드 위젯으로 외부 사이트에서 피드백 수집
- **Non-goal**: 코드 리뷰 자동화, 배포 파이프라인 직접 제어 (v2 이후)

---

## 2. 타겟 사용자 (Target Users)

| Persona | 역할 | 핵심 니즈 |
|---------|------|----------|
| **피드백 제출자** | 서비스 이용자, 테스터 | 간편한 버그/기능 요청 제출 |
| **관리자 (Admin)** | 개발팀 리더, PM | 이슈 우선순위, 빌드 현황 모니터링 |
| **시스템** | AI Worker | 자동 플래닝·빌드 실행 |

---

## 3. 핵심 기능 (Core Features)

### 3.1 구현된 기능

| 우선순위 | 기능명 | 설명 | 대상 |
|---------|--------|------|------|
| 🔴 P0 | **이슈 관리** | 피드백 이슈 생성·조회·상태 관리 (NEW→IN_PROGRESS→DONE→CLOSED) | 관리자 |
| 🔴 P0 | **AI 플래닝** | 이슈 기반 AI 계획 문서(PlanningDoc) 자동 생성 (버전 관리) | 시스템 |
| 🔴 P0 | **자동 빌드 (Run)** | PLAN/BUILD 모드 실행, 비용 추적, 브랜치/PR 연동 | 시스템 |
| 🔴 P0 | **임베드 위젯** | 외부 사이트 삽입 가능한 피드백 수집 위젯 | 피드백 제출자 |
| 🟡 P1 | **PR 추적** | GitHub PR 상태(open/merged/closed) 실시간 동기화 | 관리자 |
| 🟡 P1 | **실행 로그 스트리밍** | 빌드 실행 stdout/stderr/이벤트 로그 실시간 확인 | 관리자 |
| 🟡 P1 | **감사 로그 (Audit)** | 관리자 액션 전체 기록 | 관리자 |
| 🟡 P1 | **CORS Origin 관리** | 위젯 허용 도메인 화이트리스트 관리 | 관리자 |
| 🟢 P2 | **첨부 파일 (S3)** | 이슈 파일 첨부 (AWS S3 저장) | 피드백 제출자 |
| 🟢 P2 | **IP 기반 레이트 리밋** | 위젯 피드백 스팸 방지 | 시스템 |

---

## 4. 기술 요구사항 (Technical Requirements)

### 4.1 시스템 구성

```
Backend (API)    : NestJS (pnpm workspace) — 포트 3010
Backend (Worker) : NestJS + BullMQ — 백그라운드 큐 처리
Database         : MySQL (Prisma ORM — @aipr/db 패키지)
Queue            : Redis (BullMQ)
Storage          : AWS S3 (첨부 파일)
Frontend (Admin) : Nuxt 3 SSR — 포트 3011
Frontend (Widget): 임베드 가능 번들 (dist/)
Shared           : @aipr/shared (텔레메트리, 시크릿 마스킹)
```

### 4.2 실행 명령

```bash
# 설치 (repo 루트)
npm run install:aipr

# 개발
npm run dev:aipr:api       # API 서버 (포트 3010)
npm run dev:aipr:worker    # Worker
npm run dev:aipr:admin     # Admin Web (포트 3011)

# 빌드
npm run build:aipr

# 테스트
npm run test:aipr
```

### 4.3 비기능 요구사항

| 항목 | 요구 수준 |
|------|----------|
| 위젯 응답 | 200ms 이하 (CDN 캐시) |
| 빌드 실행 로그 | 실시간 스트리밍 |
| 관리자 인증 | 이메일 + 비밀번호 (SUPER/ADMIN 역할) |
| 보안 | CORS 화이트리스트, IP 레이트 리밋, 시크릿 마스킹 |

---

## 5. 데이터 모델 (Core Data Model)

```
이슈 & 플래닝
├── Issue          — 피드백 이슈 (제목, 설명, 상태, 레이블, 담당자, 첨부)
├── Attachment     — S3 첨부 파일
├── PlanningDoc    — AI 생성 계획 문서 (버전 관리)
└── Run            — 실행 단위 (PLAN/BUILD, 상태, 비용, 브랜치, PR 링크)
      └── RunLog   — 실행 로그 (stdout/stderr/event 스트림)

GitHub 연동
└── PullRequest    — PR 추적 (상태, 작성자, 병합 여부)

관리자
├── Admin          — 관리자 계정 (SUPER/ADMIN)
├── AuditLog       — 관리자 액션 감사 로그
└── AllowedOrigin  — 위젯 허용 도메인

보안
└── FeedbackRate   — IP 기반 피드백 레이트 리밋
```

### 이슈 상태 흐름

```
NEW → IN_PROGRESS → DONE → CLOSED
     ↘ (거절 시) → CLOSED
```

### 실행(Run) 상태 흐름

```
PENDING → RUNNING → SUCCESS
                  ↘ FAILED
```

---

## 6. API 현황

### 공개 (위젯 용)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/issues` | 피드백 이슈 생성 (위젯에서 호출) |
| POST | `/api/feedback-rate/check` | IP 레이트 리밋 확인 |

### 관리자 (Admin Web 용)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET/POST/PATCH/DELETE | `/api/issues/*` | 이슈 CRUD |
| GET | `/api/runs` | 실행 목록 |
| GET | `/api/runs/:id/logs` | 실행 로그 스트리밍 |
| GET | `/api/pull-requests` | PR 목록 |
| GET | `/api/audit-logs` | 감사 로그 |
| GET/POST/DELETE | `/api/allowed-origins/*` | CORS 허용 도메인 관리 |
| POST | `/api/admin/auth/login` | 관리자 로그인 |
| POST | `/api/admin/auth/refresh` | 토큰 갱신 |

---

## 7. 프론트엔드

### Admin Web (`frontend/aipr/apps/admin-web`, Nuxt 3, 포트 3011)

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 이슈 대시보드 | `/` | 이슈 목록, 상태별 필터 |
| 실행 모니터링 | `/runs` | 빌드 실행 현황, 로그 스트림 |
| PR 추적 | `/pull-requests` | GitHub PR 상태 |
| 감사 로그 | `/audit` | 관리자 액션 이력 |

### Widget Embed (`frontend/aipr/apps/widget-embed`)

- 단일 번들(`dist/`)로 배포
- 외부 사이트에서 `<script>` 태그로 삽입
- CORS `AllowedOrigin` 검증 후 이슈 제출

---

## 8. 갭 분석 (Gap Analysis)

| 항목 | 상태 | 설명 |
|------|------|------|
| 이슈 생성·관리 | ✅ 구현 완료 | DB 모델, API, Admin UI 존재 |
| AI 플래닝 실행 | ✅ 구현 완료 | Run + RunLog, BullMQ Worker |
| PR 추적 | ✅ 구현 완료 | `PullRequest` 모델, 상태 동기화 |
| 임베드 위젯 | ✅ 구현 완료 | `widget-embed` 번들 |
| 위젯 UI 완성도 | ⚠️ 확인 필요 | `widget-app` 구조 최소화 상태 |
| 실행 로그 스트리밍 | ⚠️ 확인 필요 | `RunLog` 모델 존재, 프론트 스트리밍 검증 필요 |
| S3 첨부 파일 | ⚠️ 부분 | `Attachment` 모델 존재, S3 설정 환경 의존 |
| 다중 AI 프로바이더 | ❌ 미확인 | 단일 프로바이더인지 멀티인지 소스 확인 필요 |

---

## 9. 타임라인 (Timeline)

| 단계 | 주요 산출물 |
|------|-----------|
| v0.1 (완료) | NestJS API/Worker, Prisma 모델, Admin Web, 임베드 위젯 |
| v0.2 (계획) | 위젯 UI 완성, 로그 스트리밍 검증, 다중 AI 프로바이더 |
| v1.0 (계획) | 퍼블릭 SaaS 출시, 구독 과금, GitHub App 연동 |

---

*이 문서는 살아있는 문서(Living Document)입니다.*
