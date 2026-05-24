# Deploy Checklist — Auto-PR Platform

**서비스:** `api` + `worker` (NestJS/BullMQ)  
**스택:** MySQL · Redis · Docker · GitHub App · Anthropic API  
**배포 방식:** `docker compose -f docker/docker-compose.staging.yml up -d --build`

---

## Pre-Deploy

### 코드 & 테스트

- [ ] `main` 브랜치의 모든 PR이 머지되고 CI가 통과됨
- [ ] Jest 단위 테스트 전체 통과: `pnpm --filter @repo/api test`
- [ ] Playwright E2E 통과 (Worker 포함): `E2E_WORKER_RUNNING=true npx playwright test`
- [ ] ESLint 오류 없음: `pnpm --filter @repo/api lint`
- [ ] TypeScript 컴파일 오류 없음: `pnpm --filter @repo/api build`

### DB Migration

- [ ] Migration 파일이 `packages/db/prisma/migrations/` 에 커밋됨
- [ ] **Staging DB** 에서 migration 적용 테스트 완료: `pnpm --filter @repo/db db:migrate:deploy`
- [ ] Migration에 `DROP TABLE` / `DROP COLUMN` 포함 시 → 데이터 백업 확인
- [ ] `ALTER TABLE` 이 포함된 경우 대상 테이블 row 수 확인 (대용량이면 pt-osc 사용)

### Secrets & 환경변수

- [ ] `.env` (또는 Doppler/KMS) 에 아래 값 모두 설정됨:

  | 키 | 설명 |
  |----|------|
  | `DATABASE_URL` | MySQL 연결 문자열 |
  | `REDIS_HOST` / `REDIS_PORT` | Redis 주소 |
  | `JWT_ACCESS_SECRET` | JWT access 서명키 (≥32 chars) |
  | `JWT_REFRESH_SECRET` | JWT refresh 서명키 (≥32 chars) |
  | `ANTHROPIC_API_KEY` | Claude API 키 |
  | `GITHUB_APP_ID` | GitHub App ID |
  | `GITHUB_APP_PRIVATE_KEY_BASE64` | GitHub App private key (base64) |
  | `GITHUB_WEBHOOK_SECRET` | Webhook HMAC secret |
  | `WIDGET_ORIGIN_ALLOWLIST` | 허용 widget 도메인 (콤마 구분) |

- [ ] `.env` 파일이 `.gitignore` 에 포함되어 있고 커밋되지 않음
- [ ] `ANTHROPIC_API_KEY` 일일 한도 설정 확인 (console.anthropic.com)

### GitHub App 설정

- [ ] GitHub App이 대상 org/repo 에 설치됨
- [ ] 권한 확인: `Contents: Write`, `Pull requests: Write`, `Metadata: Read`
- [ ] Webhook URL 설정: `https://api.example.com/api/webhooks/github`
- [ ] Webhook Secret이 `.env`의 `GITHUB_WEBHOOK_SECRET` 와 일치함

### 인프라 확인

- [ ] MySQL 접속 가능: `mysql -u root -p -e "SELECT 1"`
- [ ] Redis 접속 가능: `redis-cli ping` → `PONG`
- [ ] Docker daemon 실행 중: `docker info`
- [ ] 디스크 여유 공간 확인: `df -h` (worker `/tmp` — 최소 5GB 권장)

### 롤백 계획

- [ ] 이전 Docker 이미지 태그 확인 (`docker images auto-pr-api`)
- [ ] `docs/auto-pr-platform/runbook.md` §8 Rollback 절차 숙지
- [ ] DB migration rollback SQL 준비 (스키마 변경이 있는 경우)

---

## Deploy

### Staging 배포

- [ ] Staging 배포 실행:
  ```bash
  docker compose -f docker/docker-compose.staging.yml up -d --build
  ```
- [ ] 컨테이너 상태 확인: `docker compose ps` — api, worker, adminer 모두 `running`
- [ ] API 헬스체크: `curl -fsS http://localhost:3000/api/metrics | head -5`
- [ ] Admin 로그인 확인: `http://localhost:3001/login` → `admin@example.com / admin1234!`
- [ ] Worker 로그 확인 (오류 없음): `docker compose logs worker | tail -30`

### Smoke Test (Staging)

- [ ] 위젯 폼 제출: `http://localhost:3002` → 피드백 작성 후 제출 → DB row 확인
- [ ] Admin → 이슈 조회: `GET /api/admin/issues` → 200 응답 + 데이터 반환
- [ ] Admin → TRIAGED → QUEUED 전이 → plan job enqueue 확인 (Redis: `redis-cli llen bull:plan:wait`)
- [ ] Plan 처리 완료 후 PLAN_READY 전이 확인 (Grafana / DB 직접 조회)
- [ ] BUILDING 전이 → build job enqueue → Worker 로그에서 Claude CLI 실행 확인
- [ ] PR_OPEN 전이 → GitHub에 PR 생성됨 확인
- [ ] GitHub webhook: PR merge → issue 상태 MERGED 전이 확인

### Grafana 모니터링 확인

- [ ] `feedback_received_total` 카운터 증가 확인
- [ ] `runs_total{kind="PLAN"}` 카운터 증가 확인
- [ ] `run_duration_seconds` 히스토그램 데이터 수집 확인
- [ ] `queue_depth` gauge 값 0으로 수렴 (job 처리 완료 후)
- [ ] 에러율(`runs_total{status="FAILED"}` / `runs_total`) < 5%

---

## Post-Deploy

- [ ] 15분간 에러율 모니터링 — `runs_total{status="FAILED"}` 스파이크 없음
- [ ] API p95 응답 시간 < 300ms 확인
- [ ] `audit_log` 테이블에 이번 배포의 액션 기록 정상 여부 확인
- [ ] 비용 트래킹: `SELECT SUM(cost_usd) FROM runs WHERE DATE(created_at) = CURDATE()`
- [ ] Slack/Email 팀 공지 (배포 완료)
- [ ] CHECKLIST.md Phase 7 항목 업데이트

---

## Rollback Triggers

아래 조건 중 하나라도 발생하면 즉시 롤백:

| 조건 | 임계값 |
|------|--------|
| API 5xx 에러율 | > 5% (5분 윈도우) |
| Plan/Build 실패율 | > 30% |
| API p95 응답시간 | > 1,000ms |
| Worker 로그에 panic / OOM | 발생 즉시 |
| DB connection 에러 | 연속 3회 이상 |
| 비용 ($) | 일일 $20 초과 |

롤백 실행: `docs/auto-pr-platform/runbook.md` §8 참고
