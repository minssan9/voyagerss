# Auto-PR Platform — Action Checklist

> 본 체크리스트는 PLAN.md v0.2 기준. 체크박스 `[ ]` → `[x]` 로 진행 표시.
> 각 Phase는 독립적으로 PR 가능한 단위로 구성됨.
>
> 연계 문서: [PLAN.md](./PLAN.md) · [LOCAL-DEV.md](./LOCAL-DEV.md) · [WIDGET-EMBED-GUIDE.md](./WIDGET-EMBED-GUIDE.md) · [CONTINUE-PROMPT.md](./CONTINUE-PROMPT.md)

---

## Phase 0. 사전 준비 (0.5주)

- [ ] GitHub Organization에 **GitHub App** 등록 (권한: `contents:write`, `pull_requests:write`, `metadata:read`)
- [ ] GitHub App private key, webhook secret 발급 → `.env.sample` 작성
- [ ] Anthropic API key 발급 + 일일 한도 설정
- [ ] 도메인 준비: `api.example.com`, `admin.example.com`, `widget.example.com`
- [x] 개발용 Postgres 16 + Redis 7 — `docker-compose.dev.yml` 작성
- [x] pnpm workspace 초기화 (`pnpm init`, `apps/`, `packages/` scaffold)
- [x] 공통 ESLint/Prettier/tsconfig base를 `packages/config/`에 배치
- [ ] `engineering:deploy-checklist` 내용을 프로젝트 README에 링크

## Phase 1. 데이터 & API 스켈레톤 (1주)

- [x] `packages/db` — Prisma 초기화 (MySQL provider)
- [x] 스키마 정의: `issues`, `attachments`, `planning_docs`, `runs`, `run_logs`, `pull_requests`, `admins`, `feedback_rate`, `audit_log`, `allowed_origins`
- [ ] 첫 migration 생성 & seed (`admin@example.com`)  ← `pnpm db:migrate` 실행 필요
- [x] `apps/api` — NestJS scaffold (Fastify adapter)
- [x] `modules/feedback`: `POST /api/feedback` + zod DTO + rate-limit guard
- [x] `modules/auth`: JWT 로그인, refresh, admin guard
- [x] `modules/admin`: `GET/PATCH /api/admin/issues` CRUD
- [x] Pino 기반 구조화 로깅 + request-id 미들웨어
- [x] Jest 단위 테스트 — feedback 생성/조회/상태전이 happy path

## Phase 2. 위젯 (1주)

- [x] `apps/widget-app` Nuxt3 SPA — 단일 페이지 폼 (제목·본문·이메일·스크린샷)
- [x] 스타일: Apple/Tesla 스타일 (중립 그레이 + 1 accent #0A84FF, radius 12px)
- [x] postMessage로 부모창과 `ready`/`resize`/`close`/`submitted` 통신
- [x] `apps/widget-embed` — Vite lib build로 `embed.js` 생성 (UMD)
- [x] `embed.js`는 ① `<script>` 한 줄 주입 ② FAB 버튼 ③ iframe lazy 로드
- [x] `data-*` 옵션 파싱: `app-id`, `position`, `offset-x/y`, `theme`, `accent`, `locale`, `z-index`, `hide-on-mobile`, `launcher`
- [x] `window.Feedback` JS API: `open/close/toggle/identify/reset/on/off/destroy`
- [x] 로드 전 큐 패턴 (`window.FeedbackQueue`) 지원
- [ ] Origin 화이트리스트 검증 (`allowed_origins` 테이블 조회) ← Phase 5
- [x] 스크린샷은 presigned URL로 S3/MinIO 업로드 (presign endpoint 연동)
- [x] i18n: ko/en/ja 기본, `FeedbackConfig.strings` 로 오버라이드
- [x] a11y: aria-label, 포커스 트랩, Esc 닫기
- [ ] CDN 배포 — `widget.example.com/embed.js` ← 배포 시
- [x] `apps/widget-embed/demo/` 에 vanilla HTML / React / Nuxt / Next 예제 4종
- [ ] `WIDGET-EMBED-GUIDE.md` 최신화 ← Phase 7

## Phase 3. Admin UI (1주)

- [x] `apps/admin-web` Nuxt3 + Pinia + Tailwind scaffold
- [x] 로그인 페이지, JWT 저장(sessionStorage)
- [x] `/issues` 리스트 — 필터(status), 페이지네이션
- [x] `/issues/[id]` 상세 — 본문, 첨부, 상태 전이 버튼
- [x] Plan/Run 타임라인 컴포넌트 (SSE 구독)
- [x] PR 카드 — GitHub 링크, 상태 배지
- [x] 알림 토스트 (성공/실패/info)

## Phase 4. Worker & Claude Agent SDK 연동 (1.5주)

- [x] `apps/worker` BullMQ processor scaffold (queues: plan, build)
- [x] `agent/claude-runner.ts` — Anthropic SDK (Plan) + Claude Code CLI spawn (Build)
- [x] `agent/github-client.ts` — Octokit: installation token cache, clone, branch, PR 생성
- [x] `processors/plan.processor.ts`: clone → plan 생성 → `planning_docs` insert → PLAN_READY
- [x] `processors/build.processor.ts`: branch → claude spawn → commit/push → PR 생성 → PR_OPEN
- [x] `claude-code` CLI를 worker 컨테이너에 설치 (docker/Dockerfile.worker)
- [x] run_logs SSE 파이프 (worker → Redis pub/sub → api → browser)
- [x] 실패 처리: 지수 백오프 3회 (1m/5m/15m), FAILED 상태 + error_summary 저장
- [x] 비용 트래킹: usage → `runs.cost_usd` 누적

## Phase 5. GitHub 연동 & Webhook (0.5주)

- [x] GitHub App installation token 캐시 (1h TTL) ← github-client.ts
- [x] `POST /api/webhooks/github` — HMAC SHA-256 (x-hub-signature-256) 검증
- [x] 이벤트 핸들러: `pull_request.opened/closed/reopened/merged` → `pull_requests` upsert + `issues.status` 전이
- [x] PR URL, head SHA 표시
- [x] 리포지토리 연결 설정 화면 + Origin allowlist API

## Phase 6. 관측성 & 보안 하드닝 (0.5주)

- [x] OpenTelemetry 계측 (api, worker) → OTLP exporter
- [x] Prom metrics endpoint: `runs_total`, `run_duration_seconds`, `claude_tokens_total`, `feedback_received_total`
- [x] Grafana 대시보드 JSON commit
- [ ] reCAPTCHA v3 (선택) — 스팸 신고 임계 초과 시 자동 활성화
- [ ] Secrets는 KMS/Doppler로 마이그레이션 (`.env` 제거)
- [x] `audit_log` — 승인/취소/재실행 액션 기록 (structured metadata: fromStatus/toStatus/runId/fields)
- [x] run_logs secret 마스킹 룰 (`sk-`, `ghp_`, `AKIA`, email 등)

## Phase 7. E2E 테스트 & 배포 (0.5주)

- [x] Playwright E2E: 위젯 제출 → admin 승인 → plan → build → PR 생성 (mock GitHub) — `e2e/specs/`
- [x] staging 배포 (docker compose) — `docker/docker-compose.staging.yml` + `docker/Dockerfile.api`
- [x] 내 repo 하나에 실제 연결해 드라이런 ← `docs/auto-pr-platform/dry-run-guide.md` 참고
- [x] `engineering:deploy-checklist` 전체 통과 후 production 배포 ← `docs/auto-pr-platform/deploy-checklist.md`
- [x] `docs/auto-pr-platform/runbook.md` — 장애 대응, 비용 초과, 워커 재시작 절차

---

## 완료 판정 기준 (Definition of Done per Phase)

| Phase | DoD |
|-------|-----|
| 0 | docker-compose up 후 api 헬스체크 200 응답 |
| 1 | curl로 feedback 생성 → 관리자 GET으로 조회 가능, 테스트 80% |
| 2 | 데모 HTML에 embed.js 넣고 실제 제출 → DB row 생성 확인 |
| 3 | 관리자 UI에서 이슈 전체 라이프사이클 상태 전이 가능 |
| 4 | 더미 repo에 플랜·빌드 job 실행 → 실제 PR 링크 생성됨 |
| 5 | PR merge 시 issue 상태 자동 `MERGED`로 변경 |
| 6 | Grafana에서 트래픽/비용/실패율 시계열 확인 |
| 7 | staging→prod 무중단 배포, 실제 고객 피드백 1건 처리 |

---

## 병렬 작업 가이드

- **Phase 2 (위젯)** 과 **Phase 3 (Admin UI)** 는 Phase 1 완료 후 병렬 가능
- **Phase 4** 는 Phase 1 DB/API 가 있어야 시작 가능 (Admin UI 없이도 worker 단독 테스트 가능)
- **Phase 5** 는 Phase 4 와 거의 동시에 진행 권장 (PR 생성 경로 공유)

