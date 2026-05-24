# Auto-PR Feedback Platform — 설계 문서

> 작성일: 2026-04-24 · 작성자: Mike · 상태: Draft v0.2
>
> 관련 문서:
> - [CHECKLIST.md](./CHECKLIST.md) — 단계별 액션 체크리스트
> - [LOCAL-DEV.md](./LOCAL-DEV.md) — 로컬 개발 환경 구성
> - [WIDGET-EMBED-GUIDE.md](./WIDGET-EMBED-GUIDE.md) — 위젯 설치 가이드 (배포용)
> - [CONTINUE-PROMPT.md](./CONTINUE-PROMPT.md) — 새 세션 이어가기 프롬프트

## 0. 한눈에 보기

기존 서비스 위에 **채널톡 형태의 피드백 위젯**을 붙이고, 접수된 요청을 관리자 페이지에서 트리아지한 뒤 **Claude Agent SDK + Claude Code CLI**가 GitHub 저장소에 자동으로 `브랜치 생성 → 플래닝 → 구현 → PR 생성`까지 실행하는 플랫폼.

```
[방문자]
   ↓ (JS snippet → iframe widget)
[Widget (Nuxt3 SPA build)]
   ↓ POST /api/feedback
[API Gateway (NestJS)] ─────── PostgreSQL (issues/prs/logs)
   │                              ▲
   │ enqueue job                  │
   ▼                              │
[Redis + BullMQ]                  │
   │                              │
   ▼                              │
[Worker Service]  ── spawn ──▶  [Claude Agent SDK Runner]
   │                                 │ (headless Claude Code CLI)
   │                                 ▼
   │                          [Cloned Repo Workspace]
   │                                 │ git push
   ▼                                 ▼
[GitHub REST API] ────────▶  [GitHub 저장소 (PR)]
                                     │ webhook
                                     ▼
                            [/api/webhooks/github]
                                     │
                                     ▼
                                [Admin UI (Nuxt3)]
```

---

## 1. 요구사항 정리

### 1.1 기능 요구사항 (Functional)

| # | 요구사항 | 우선순위 |
|---|---------|---------|
| F1 | 호스트 사이트 어디든 `<script>` 한 줄로 피드백 위젯 삽입 | P0 |
| F2 | 익명 + 로그인 사용자 모두 이메일·제목·내용·스크린샷 제출 가능 | P0 |
| F3 | 접수된 요청은 DB 저장, 관리자 페이지에 실시간 표시 | P0 |
| F4 | 관리자 승인 시 GitHub 브랜치 자동 생성 | P0 |
| F5 | Claude Agent SDK가 요청을 분석해 **Planning 문서** 자동 생성 | P0 |
| F6 | Planning 승인 후 Claude Code CLI가 코드 구현 & 커밋 & PR 생성 | P0 |
| F7 | PR 상태(open/merged/closed) 웹훅으로 동기화 | P0 |
| F8 | 관리자 페이지에서 재실행/중단/수동편집 가능 | P1 |
| F9 | 실행 로그(stdout/stderr/diff) 타임라인 뷰 제공 | P1 |
| F10 | Slack/Email 알림 (승인 필요, PR 생성됨 등) | P2 |

### 1.2 비기능 요구사항 (Non-functional)

| 항목 | 목표 |
|------|------|
| 위젯 로딩 | 호스트 페이지 LCP에 영향 <50ms (async load, iframe) |
| API 응답 | p95 < 300ms (비자동화 endpoint) |
| 자동화 1 사이클 | p95 < 15분 (plan+impl+PR) |
| 가용성 | 99% (single region MVP, 추후 HA) |
| 동시 자동화 작업 | 초기 3개 concurrent worker |
| 보안 | 위젯 Origin 화이트리스트, GitHub App private key KMS, rate limit |

### 1.3 제약 (Constraints)
- 백엔드 **Node.js (NestJS)**, 프론트 **Vue3/Nuxt3**
- Git 플랫폼은 **GitHub**
- AI 엔진은 **Claude Agent SDK + Claude Code CLI**
- 초기는 1인 개발, MVP 6~8주 내 배포

---

## 2. High-Level Design

### 2.1 컴포넌트

| 이름 | 역할 | 기술 |
|------|------|------|
| `widget-embed` | `<script>` 로더 → iframe 주입 | Vanilla JS (≤3KB) |
| `widget-app` | 피드백 폼 SPA | Nuxt3 SPA build, 독립 도메인 |
| `api` | REST API + 인증 + 큐 enqueue | NestJS |
| `admin-web` | 관리자 대시보드 | Nuxt3 + Pinia + Tailwind |
| `worker` | 큐 consumer, 자동화 실행 | NestJS BullMQ processor |
| `agent-runner` | Claude Code CLI headless 래퍼 | Node child_process + Anthropic SDK |
| `postgres` | 정규 데이터 저장 | PostgreSQL 16 |
| `redis` | 큐/세션/레이트리밋 | Redis 7 |
| `github-app` | PR/브랜치 권한 매개체 | GitHub App |

### 2.2 데이터 플로우 (요청 한 건 기준)

1. 방문자가 widget 열고 제출 → `POST /api/feedback` (status=`NEW`)
2. 관리자가 검토 후 `Approve` → status=`QUEUED`, BullMQ `planning` job enqueue
3. Worker가 repo clone → Claude Agent SDK로 plan 생성 → `planning_docs` 저장 → status=`PLAN_READY`
4. 관리자 Plan 확인 후 `Start Build` → status=`BUILDING`, `build` job enqueue
5. Worker가 Claude Code CLI headless 실행 → commit/push → GitHub PR 생성 → status=`PR_OPEN`
6. GitHub webhook이 merge/close 감지 → status=`MERGED`/`CLOSED`

### 2.3 API 계약 (핵심만)

```
POST   /api/feedback                      (public, rate-limited)
GET    /api/admin/issues?status=          (admin)
GET    /api/admin/issues/:id              (admin)
PATCH  /api/admin/issues/:id              (admin, 상태 전이)
POST   /api/admin/issues/:id/approve      (admin, QUEUED 전이)
POST   /api/admin/issues/:id/start-build  (admin, BUILDING 전이)
POST   /api/admin/issues/:id/retry        (admin)
POST   /api/admin/issues/:id/cancel       (admin)
GET    /api/admin/issues/:id/logs         (admin, SSE stream)
POST   /api/webhooks/github               (public, HMAC 검증)
```

---

## 3. 데이터 모델

```sql
-- 요청 본체
issues (
  id UUID PK,
  status ENUM('NEW','TRIAGED','QUEUED','PLAN_READY','BUILDING','PR_OPEN','MERGED','CLOSED','FAILED'),
  title TEXT, body TEXT,
  reporter_email TEXT, reporter_user_id UUID NULL,
  source_url TEXT, user_agent TEXT,
  repo_full_name TEXT, base_branch TEXT DEFAULT 'main',
  labels TEXT[],
  created_at, updated_at
)

-- 첨부 (스크린샷 등)
attachments (id, issue_id FK, s3_key, mime, size)

-- 플래닝 산출물
planning_docs (id, issue_id FK, version, content MD, created_by, created_at)

-- 자동화 실행
runs (
  id UUID PK, issue_id FK,
  kind ENUM('PLAN','BUILD'),
  status ENUM('PENDING','RUNNING','SUCCESS','FAILED','CANCELLED'),
  started_at, finished_at,
  branch_name, commit_sha, pr_number, pr_url,
  claude_session_id, cost_usd DECIMAL(10,4),
  error_summary TEXT
)

-- 실행 로그 (append-only)
run_logs (id, run_id FK, seq, stream ENUM('stdout','stderr','event'), content, ts)

-- GitHub 동기화
pull_requests (
  id, issue_id FK, pr_number, pr_url,
  state ENUM('open','merged','closed'),
  author, head_sha, merged_at, last_event_at
)

-- 관리자
admins (id, email, role, password_hash, created_at)

-- 레이트리밋/스팸
feedback_rate (ip INET, day DATE, count, PRIMARY KEY(ip,day))
```

---

## 4. 자동화 워크플로우 상세

### 4.1 Plan 단계
1. Worker가 `git clone --depth=50 <repo>` to `/tmp/workspaces/<run_id>`
2. 이슈 본문 + 관련 파일 컨텍스트 수집 (간단한 grep, recent git log)
3. Claude Agent SDK로 호출:
   - system prompt: "You are a senior engineer. Write a concrete implementation plan."
   - user prompt: issue + repo tree + 제약(테스트 필수, 스타일)
   - 산출: `plan.md` (목표·변경 파일 목록·단계·테스트 계획·리스크)
4. `planning_docs`에 저장, 관리자 알림

### 4.2 Build 단계
1. 새 브랜치 `feat/issue-<id>-<slug>` 체크아웃
2. Claude Code CLI headless 실행:
   ```bash
   claude-code --headless \
     --prompt-file plan.md \
     --max-turns 40 \
     --allowed-tools "Edit,Write,Bash(npm test:*),Bash(git *)" \
     --output-format stream-json > run.log
   ```
3. 파이프를 SSE로 `/api/admin/issues/:id/logs` 브로드캐스트
4. 성공 시 `git push`, GitHub API로 `POST /repos/:owner/:repo/pulls` 호출
5. PR URL, head SHA, 커밋 목록을 `runs`/`pull_requests` 테이블에 기록

### 4.3 실패·재시도 전략
- 네트워크/GitHub 5xx → 지수 백오프 3회 (1m, 5m, 15m)
- Claude 툴콜 실패 / 턴 초과 → `FAILED`, `error_summary`에 마지막 메시지
- 관리자가 **Retry** 클릭 시 같은 issue에 새 `run` row 생성 (멱등성 유지)

---

## 5. 보안 & 운영

| 항목 | 설계 |
|------|------|
| Widget Origin | `allowed_origins` 테이블로 호스트 도메인 화이트리스트, CORS + CSP |
| Anti-spam | IP 기반 일일 10건 하드 리밋 + reCAPTCHA v3 선택 |
| GitHub 권한 | GitHub App 설치 → installation token (1h TTL) |
| Secrets | `.env` + AWS KMS 또는 Doppler |
| 감사 로그 | 모든 admin 액션 `audit_log` 테이블 |
| 비용 관리 | `runs.cost_usd` 집계, 일일 상한(예 $20) 초과 시 자동 일시정지 |
| PII | 이메일은 해시 컬럼 + 원본 분리 저장, 30일 후 익명화 배치 |

---

## 6. 폴더 구조 (모노레포 제안 — pnpm workspace)

```
auto-pr-platform/
├─ apps/
│  ├─ api/              # NestJS
│  │  ├─ src/
│  │  │  ├─ modules/
│  │  │  │  ├─ feedback/     # POST /api/feedback
│  │  │  │  ├─ admin/        # /api/admin/*
│  │  │  │  ├─ webhooks/     # /api/webhooks/github
│  │  │  │  ├─ runs/         # run 상태, SSE
│  │  │  │  └─ auth/
│  │  │  └─ main.ts
│  │  └─ test/
│  ├─ worker/           # BullMQ processors + agent-runner
│  │  └─ src/
│  │     ├─ processors/
│  │     │  ├─ plan.processor.ts
│  │     │  └─ build.processor.ts
│  │     └─ agent/
│  │        ├─ claude-runner.ts
│  │        └─ github-client.ts
│  ├─ admin-web/        # Nuxt3 관리자 UI
│  │  └─ pages/
│  │     ├─ issues/index.vue
│  │     ├─ issues/[id].vue
│  │     └─ settings.vue
│  ├─ widget-app/       # Nuxt3 SPA build (iframe 안 로딩)
│  │  └─ pages/index.vue
│  └─ widget-embed/     # 로더 스크립트 (Vite lib build)
│     └─ src/embed.ts
├─ packages/
│  ├─ db/               # Prisma schema + migrations
│  ├─ shared/           # 공통 타입, DTO, zod schema
│  └─ config/           # eslint, tsconfig base
├─ docker/
│  ├─ Dockerfile.api
│  ├─ Dockerfile.worker
│  └─ docker-compose.dev.yml
├─ docs/auto-pr-platform/
│  ├─ PLAN.md           ← 본 문서
│  ├─ CHECKLIST.md
│  └─ CONTINUE-PROMPT.md
└─ pnpm-workspace.yaml
```

---

## 7. 확장성 & 신뢰성

- **Stateless API**: 수평 스케일. 세션은 Redis.
- **Worker pool**: BullMQ concurrency 시작 3, 이슈 수 증가 시 컨테이너 수 증설.
- **Workspace 격리**: 각 run은 `/tmp/workspaces/<run_id>` — 사용 후 삭제 (사용자 승인 기반 정책).
- **Back-pressure**: 큐 길이 > 50이면 신규 승인 버튼 비활성화 + 경고.
- **관측성**: OpenTelemetry + Grafana Loki (로그) + Prom metrics (`runs_total`, `run_duration_seconds`, `claude_tokens_total`).

---

## 8. 트레이드오프 & 의사결정

| 결정 | 선택 | 대안 | 선택 이유 |
|------|------|------|---------|
| DB | PostgreSQL | MongoDB | 관계형 + 트랜잭션 + JSONB |
| 큐 | BullMQ (Redis) | SQS, RabbitMQ | Node 네이티브, 운영 단순 |
| Agent 실행 | 서버 child_process | Docker-in-Docker, Firecracker | MVP는 단순, 추후 샌드박스 전환 |
| Widget 배포 | iframe JS snippet | npm component | 스택 독립성, 호스트 CSS 오염 0 |
| Monorepo | pnpm workspace | Nx, Turborepo | 단순/빠른 시작 |
| 인증 | JWT + refresh | Session cookie | API 중심 구조 |

### 나중에 재검토할 것
- Agent 실행 샌드박스를 Firecracker/gVisor로 격리 (보안 레벨 업)
- 멀티 테넌시 — 여러 조직이 자기 repo 붙이는 SaaS 전환
- Plan 승인까지 사람 in-the-loop를 줄일 수 있을지 (자동 저위험 분류)

---

## 9. 리스크 & 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Claude API 비용 폭주 | 높음 | `cost_usd` 집계 + 일일 상한 + per-run 토큰 상한 |
| 자동 PR이 저장소를 망가뜨림 | 높음 | 항상 별도 브랜치·PR만, `main` 직접 푸시 금지, CODEOWNERS 필수 리뷰 |
| 스팸 피드백 | 중간 | IP rate-limit + reCAPTCHA + 이메일 검증 |
| 민감정보 로그 유출 | 중간 | run_logs에서 secret 패턴 마스킹, 30일 retention |
| Long-running job 중단 | 중간 | BullMQ `stalledInterval` + 자동 재큐 |

---

## 10. 성공 지표 (MVP)

- 첫 엔드투엔드 자동 PR 1건 머지 — 출시 후 2주
- 주간 10건 이상 자동 PR 생성, 승인율 ≥50% — 출시 후 6주
- 위젯→PR 머지 사이클 평균 < 24h
- 자동화 1건당 평균 비용 < $1.5

