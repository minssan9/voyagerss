# 이어서 진행하기 — Continuation Prompts

새 세션에서 작업을 이어갈 때 아래 프롬프트 중 현재 Phase에 맞는 걸 복사해 붙여넣어라.
모든 프롬프트는 `docs/auto-pr-platform/PLAN.md`와 `CHECKLIST.md`를 먼저 읽는 것을 전제로 한다.

---

## 0. 범용 부트스트랩 (항상 먼저)

```
나는 Mike, Auto-PR Feedback Platform을 만들고 있어.
기술 스택: NestJS 백엔드 + Nuxt3 (admin/widget) + PostgreSQL + Redis + BullMQ +
GitHub App + Claude Agent SDK + Claude Code CLI. 모노레포(pnpm workspace).

작업 시작 전에 반드시 아래 문서를 읽어:
- F:\repository\voyagerss__ai_dev\docs\auto-pr-platform\PLAN.md
- F:\repository\voyagerss__ai_dev\docs\auto-pr-platform\CHECKLIST.md

진행 규칙:
1. 지시 전 내 파일을 먼저 읽고 현재 상태를 파악해라.
2. 실행 전에 계획을 짧게 보여주고 내 승인을 받아라.
3. 파일을 삭제하기 전에 반드시 확인해라.
4. 결과물은 markdown, 파일 경로는 tree 구조로 표시해라.
5. 스타일은 애플/테슬라 감성 — 중립색 + 1 accent, 심플.
```

---

## Phase 0 — 사전 준비

```
[부트스트랩 프롬프트 포함]

CHECKLIST.md의 Phase 0 항목을 진행하려고 해.
지금 완료된 것: (예: 없음 / GitHub App 등록 완료)

다음 단계로 해줘:
1. pnpm workspace 초기 구조를 만드는 셸 스크립트 작성 (apps/, packages/, pnpm-workspace.yaml)
2. docker-compose.dev.yml (postgres:16, redis:7, adminer) 작성
3. .env.sample 작성 — GitHub App, Anthropic, JWT, DB 변수 포함
4. packages/config/ 에 ESLint + Prettier + tsconfig base 파일 배치

실행 전 계획을 보여주고 기다려라.
```

---

## Phase 1 — 데이터 & API 스켈레톤

```
[부트스트랩 프롬프트 포함]

Phase 0 완료됨. 이제 Phase 1 진입.

다음 순서로 작업해줘:
1. packages/db 에 Prisma init, PLAN.md §3 스키마를 schema.prisma로 옮기고 첫 migration 생성
2. apps/api NestJS scaffold
3. modules/feedback:
   - POST /api/feedback (public, zod DTO 검증, IP 기반 rate-limit 10/day)
   - 파일 업로드는 presigned URL 방식
4. modules/auth: JWT access+refresh, admin guard
5. modules/admin: GET /api/admin/issues (필터·페이지네이션), GET/PATCH /api/admin/issues/:id

각 모듈에 Jest 단위 테스트 포함. 커밋 단위는 기능별로 분리 제안.
실행 전 디렉토리 트리와 파일 목록부터 보여줘라.
```

---

## Phase 2 — 위젯

```
[부트스트랩 프롬프트 포함]

Phase 1 완료됨 (API와 DB 준비). Phase 2 위젯을 만든다.

1. apps/widget-app — Nuxt3 SPA, 단일 폼 페이지(제목/본문/이메일/스크린샷)
   - 디자인: 흰 배경, #111 텍스트, accent #0A84FF, 라운드 12px, 얇은 테두리
   - 유효성 검사 zod, 제출 실패 inline 에러
2. apps/widget-embed — Vite lib build로 embed.js (UMD, ≤3KB gzipped)
   - <script src=".../embed.js" data-app-id="xxx"></script> 로드
   - 우하단 FAB (56px 원형), 클릭 시 iframe 토글
   - postMessage 프로토콜: {type: 'ready'|'resize'|'close', payload}
3. 데모 HTML 파일 1개 — apps/widget-embed/demo/index.html
4. Origin 화이트리스트는 API의 /api/feedback에서 검증

파일 목록·트리 먼저 보여주고 진행해라.
```

---

## Phase 3 — Admin UI

```
[부트스트랩 프롬프트 포함]

Phase 1, 2 완료. Admin 대시보드 시작.

apps/admin-web 구성:
- Nuxt3 + Pinia + Tailwind
- 페이지: /login, /issues, /issues/[id], /settings
- 스타일: 좌측 사이드바 240px, 화이트 / #f7f7f8 / #111, accent #0A84FF
- 이슈 리스트: 상태 칩, 생성일, reporter, PR 번호
- 상세: 본문, 첨부 이미지, Plan 문서 마크다운 렌더, Run 타임라인(SSE)
- 상태 전이 버튼: Approve / Start Build / Retry / Cancel

우선 login → /issues 까지 스켈레톤만 만들고, 나머지는 단계적으로 PR로 쪼개자.
먼저 정리한 페이지 트리와 API 호출 매핑을 표로 보여줘라.
```

---

## Phase 4 — Worker & Claude 연동 (핵심)

```
[부트스트랩 프롬프트 포함]

Phase 1 API와 DB 준비 완료. 이제 worker를 만든다 — 플랫폼의 심장.

apps/worker 구성:
1. BullMQ processor scaffold — 큐 이름: `plan`, `build`
2. agent/github-client.ts — Octokit, GitHub App installation token 캐시, 레포 clone/push/PR 생성
3. agent/claude-runner.ts
   - Plan job: Anthropic Messages API 직접 호출, system="senior engineer, write concrete plan",
     user=이슈 본문 + 레포 트리 + recent git log → plan.md 생성
   - Build job: child_process.spawn('claude-code', ['--headless', '--prompt-file', 'plan.md',
     '--max-turns', '40', '--allowed-tools', 'Edit,Write,Bash(npm test:*),Bash(git *)',
     '--output-format', 'stream-json'])
4. processors/plan.processor.ts — clone shallow → agent 호출 → planning_docs insert → 상태 전이
5. processors/build.processor.ts — 새 브랜치 → claude-code spawn → stream-json을 Redis pub/sub로 브로드캐스트 → commit/push → PR 생성 → runs/pull_requests 기록
6. 실패 처리: 3회 지수 백오프 (1m/5m/15m), FAILED 시 error_summary 기록
7. 비용: API 응답의 usage를 runs.cost_usd에 누적, 일일 상한 초과 시 큐 일시정지

먼저 claude-runner.ts 인터페이스와 error 처리 매트릭스를 표로 보여줘라.
보안: workspace는 /tmp/workspaces/<run_id>, 완료/실패 후 삭제 — 삭제 로직은 내 승인 후에만.
```

---

## Phase 5 — GitHub Webhook

```
[부트스트랩 프롬프트 포함]

Phase 4 worker가 PR을 만든다. 이제 머지 시점 등을 동기화한다.

1. POST /api/webhooks/github — HMAC SHA-256 (x-hub-signature-256) 검증 guard
2. 처리 이벤트: pull_request.opened/closed/reopened, pull_request.merged
3. pull_requests 테이블 upsert, issues.status 전이 규칙:
   - PR opened → PR_OPEN
   - PR merged → MERGED
   - PR closed (not merged) → CLOSED
4. admin UI에 실시간 반영 (SSE 혹은 폴링 10초)
5. /settings에서 repo_full_name 등록 UI

PR 전 먼저 이벤트 페이로드 예시와 매핑 표를 보여줘라.
```

---

## Phase 6 — 관측성 & 보안

```
[부트스트랩 프롬프트 포함]

핵심 기능 완료. 이제 운영 안전망.

1. OpenTelemetry 계측 (api, worker) — OTLP exporter
2. Prom metrics: /metrics 엔드포인트, 카운터 runs_total, feedback_received_total,
   히스토그램 run_duration_seconds, 게이지 queue_depth
3. run_logs secret 마스킹: sk-, ghp_, AKIA, email 패턴 정규식으로 ****
4. audit_log — 모든 admin 승인/취소/재실행 기록 (admin_id, action, target, ts)
5. Secrets를 Doppler 또는 AWS KMS로 이동, .env 원본은 .gitignore 유지
6. Grafana 대시보드 JSON을 ops/grafana/dashboards/ 에 커밋

먼저 어떤 메트릭을 노출할지 표로 확정하고 진행해라.
```

---

## Phase 7 — E2E & 배포

```
[부트스트랩 프롬프트 포함]

모든 기능 완료. 통합 테스트 + 배포.

1. Playwright E2E 시나리오 1건:
   - 데모 사이트에서 피드백 제출
   - 어드민 로그인 → Approve
   - GitHub API mock으로 PR URL 반환
   - 이슈 상태가 PR_OPEN 까지 전이되는 것 확인
2. staging 배포 (docker compose on VM 또는 Fly.io)
3. 실제 내 저장소 하나 연결해서 드라이런 1회
4. engineering:deploy-checklist 스킬을 호출해 prod 체크리스트 실행
5. docs/runbook.md — 워커 재시작, Claude 비용 초과, DB 장애 대응 절차

배포 전 체크리스트 전체를 훑어보고 미완료 항목이 있으면 나한테 보고해라.
```

---

## 트러블슈팅 프롬프트 템플릿

```
[부트스트랩 프롬프트 포함]

현재 증상: <증상>
관련 파일: <파일 경로>
최근 변경: <git log -5 출력>
에러 로그:
```
<로그 붙여넣기>
```

engineering:debug 스킬로 재현-격리-진단-수정 4단계 진행해줘.
가설 3개 세우고 가장 가능성 높은 순서로 검증한 뒤 보고해라.
```

