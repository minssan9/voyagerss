# Auto-PR Platform — Runbook

> 작성일: 2026-04-25 · 대상: 운영자 / 온콜 엔지니어

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [로컬 서비스 시작 / 중지](#2-로컬-서비스-시작--중지)
3. [Staging 배포](#3-staging-배포)
4. [DB 마이그레이션](#4-db-마이그레이션)
5. [워커 재시작 절차](#5-워커-재시작-절차)
6. [장애 대응](#6-장애-대응)
7. [비용 초과 대응](#7-비용-초과-대응)
8. [Rollback 절차](#8-rollback-절차)
9. [로그 조회](#9-로그-조회)
10. [유용한 관리 쿼리](#10-유용한-관리-쿼리)

---

## 1. 서비스 개요

| 서비스 | 설명 | 포트 |
|--------|------|------|
| `api` | NestJS REST API + BullMQ enqueue | 3000 |
| `worker` | BullMQ plan/build processor + Claude CLI | — |
| `admin-web` | 관리자 대시보드 (Nuxt3 SPA) | 3001 |
| `widget-app` | 피드백 폼 SPA (iframe) | 3002 |
| `MySQL` | 메인 DB (`autpr_db`) | 3306 |
| `Redis` | 큐 + pub/sub + rate-limit | 6379 |

---

## 2. 로컬 서비스 시작 / 중지

```bash
# 전체 개발 서버 시작
pnpm --filter @repo/api   dev &
pnpm --filter @repo/worker dev &
pnpm --filter @repo/admin-web dev &
pnpm --filter @repo/widget-app dev &

# DB seed (최초 1회)
pnpm --filter @repo/db db:seed

# Adminer (DB GUI)
docker compose -f docker/docker-compose.dev.yml up adminer -d
```

---

## 3. Staging 배포

```bash
# 1. .env 준비 (민감 값 채우기)
cp .env.sample .env
vi .env

# 2. 빌드 + 기동
docker compose -f docker/docker-compose.staging.yml up -d --build

# 3. 헬스체크 확인
curl http://localhost:3000/api/metrics   # Prometheus metrics
curl http://localhost:3001               # admin-web

# 4. DB 마이그레이션 (최초 배포 또는 스키마 변경 시)
docker compose -f docker/docker-compose.staging.yml exec api \
  node -e "require('./apps/api/dist/main'); process.exit(0)"
# 또는 직접 실행:
pnpm --filter @repo/db db:migrate
```

---

## 4. DB 마이그레이션

```bash
# 새 migration 생성
pnpm --filter @repo/db db:migrate:dev --name <설명>

# 프로덕션 적용 (다운타임 주의 — 테이블 락 발생 가능)
pnpm --filter @repo/db db:migrate:deploy

# 롤백 (Prisma는 자동 롤백 미지원 — 수동 SQL 필요)
# 1. apps/api 컨테이너/프로세스 중지
# 2. 아래 Rollback SQL 실행
# 3. migration 테이블에서 해당 migration 레코드 삭제
#    DELETE FROM _prisma_migrations WHERE migration_name = '<name>';
```

> **주의:** `ALTER TABLE`이 포함된 migration은 대용량 테이블에서 수분간 락이 발생할 수 있음.  
> 배포 전 `pt-online-schema-change` 또는 `gh-ost` 사용을 검토할 것.

---

## 5. 워커 재시작 절차

### Staging (Docker)

```bash
# worker 컨테이너만 재시작
docker compose -f docker/docker-compose.staging.yml restart worker

# 로그 확인
docker compose -f docker/docker-compose.staging.yml logs -f worker
```

### 로컬 개발

```bash
# pnpm 프로세스 종료 후 재시작
kill $(lsof -ti :3001)   # 워커가 점유한 포트가 없으면 생략
pnpm --filter @repo/worker dev
```

### Stalled Job 재처리

BullMQ가 `stalled` 상태로 감지한 job은 자동 재큐됨 (기본 30초 간격).  
수동으로 강제 재큐가 필요하면:

```ts
// REPL 또는 admin 스크립트에서
import { Queue } from 'bullmq';
const q = new Queue('plan', { connection: { host: 'localhost', port: 6379 } });
const stalled = await q.getStalledCount();
console.log('stalled:', stalled);
// BullMQ 내부: retryJobs 는 v5+ 에서 Queue.retryJobs() 사용
await q.retryJobs({ count: 100, state: 'failed' });
```

---

## 6. 장애 대응

### 6.1 API 응답 없음 (5xx / timeout)

1. `docker compose logs api | tail -100` 로 오류 확인
2. Prisma connection 오류 → MySQL 상태 점검: `mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected'"`
3. Redis 연결 오류 → `redis-cli ping` 확인
4. 프로세스 재시작: `docker compose restart api`

### 6.2 Worker job 처리 멈춤

증상: admin-web 에서 이슈가 `QUEUED` 또는 `BUILDING` 상태에서 오랫동안 변하지 않음.

```bash
# Redis 큐 상태 확인
redis-cli llen bull:plan:wait
redis-cli llen bull:build:wait

# BullMQ dashboard (선택) — bull-board 설치 시
open http://localhost:3000/api/admin/queues
```

1. `FAILED` 상태 job 확인 → `runs` 테이블의 `error_summary` 컬럼 조회
2. Worker 로그: `docker compose logs -f worker`
3. Claude Code CLI 바이너리 확인: `docker compose exec worker claude --version`
4. Anthropic API quota 확인: https://console.anthropic.com

### 6.3 GitHub PR 생성 실패

1. `runs` 테이블 `error_summary` 확인
2. GitHub App 토큰 만료 여부 확인 (1h TTL — 자동 갱신됨)
3. GitHub App 권한 확인: `contents:write`, `pull_requests:write` 필요
4. Repo branch protection rule 확인 (force-push 차단 여부)

### 6.4 SSE 로그 스트림 끊김

1. Redis pub/sub 확인: `redis-cli subscribe "run-logs:*"` 로 메시지 수신 여부 확인
2. API keepalive: 15초마다 `: ping` 이벤트 전송됨 — 브라우저 DevTools Network 탭 확인
3. 프록시 timeout 설정 확인 (nginx: `proxy_read_timeout 120s` 이상)

---

## 7. 비용 초과 대응

### 모니터링

Grafana 대시보드 `auto-pr-platform` → "Claude Tokens" 패널에서 실시간 토큰 소모량 확인.

```sql
-- 금일 총 비용 ($)
SELECT SUM(cost_usd) AS today_usd
FROM runs
WHERE DATE(created_at) = CURDATE()
  AND status IN ('SUCCESS', 'FAILED');

-- run 별 비용 상위 10개
SELECT id, issue_id, kind, cost_usd, created_at
FROM runs
ORDER BY cost_usd DESC
LIMIT 10;
```

### 긴급 일시정지

```bash
# BullMQ 큐 일시 중단 (새 job 처리 중단, 기존 job은 완료)
redis-cli publish "bull:plan:pause" ""   # BullMQ v5 pause signal

# 또는 Worker 컨테이너 중지
docker compose -f docker/docker-compose.staging.yml stop worker
```

Worker 재개:

```bash
docker compose -f docker/docker-compose.staging.yml start worker
```

### 일일 상한 설정 권장

`apps/worker/src/processors/plan.processor.ts` 상단에 아래 가드를 추가:

```ts
const { _sum: { cost_usd } } = await this.prisma.run.aggregate({
  where: { createdAt: { gte: startOfToday() } },
  _sum: { costUsd: true },
});
if ((cost_usd ?? 0) > Number(process.env.DAILY_COST_LIMIT_USD ?? 20)) {
  throw new Error('Daily cost limit exceeded — job paused');
}
```

---

## 8. Rollback 절차

### 코드 Rollback

```bash
# 이전 Docker 이미지로 롤백
docker compose -f docker/docker-compose.staging.yml down
docker tag auto-pr-api:staging auto-pr-api:rollback-$(date +%Y%m%d)
# 이전 이미지 태그로 교체 후 재기동
docker compose -f docker/docker-compose.staging.yml up -d
```

### DB Migration Rollback

Prisma는 자동 롤백을 지원하지 않음. 수동 절차:

1. API/Worker 중지
2. `packages/db/prisma/migrations/<timestamp_name>/migration.sql` 에서 변경사항 파악
3. 역방향 SQL 수동 작성 및 실행
4. `_prisma_migrations` 테이블에서 해당 레코드 삭제
5. 코드 이전 커밋으로 롤백
6. 서비스 재기동

---

## 9. 로그 조회

```bash
# API 로그 (JSON — jq 파싱)
docker compose logs api | jq 'select(.level >= 40)'   # WARN 이상

# Worker 로그 (secret 마스킹 확인)
docker compose logs worker | grep "sk-\|ghp_\|AKIA"   # 마스킹 누락 여부 점검

# 특정 issue run 로그 조회 (DB)
mysql -u root -padmin autpr_db -e "
  SELECT seq, stream, LEFT(content, 200) AS content, ts
  FROM run_logs
  WHERE run_id = '<run_id>'
  ORDER BY seq
  LIMIT 100;
"
```

---

## 10. 유용한 관리 쿼리

```sql
-- 상태별 이슈 수
SELECT status, COUNT(*) AS cnt
FROM issues
GROUP BY status
ORDER BY FIELD(status, 'NEW','TRIAGED','QUEUED','PLAN_READY','BUILDING','PR_OPEN','MERGED','CLOSED','FAILED');

-- 최근 실패한 run 목록
SELECT r.id, r.issue_id, r.kind, r.error_summary, r.created_at
FROM runs r
WHERE r.status = 'FAILED'
ORDER BY r.created_at DESC
LIMIT 20;

-- 관리자 최근 액션 감사 로그
SELECT al.action, al.target, al.metadata, al.created_at, a.email
FROM audit_log al
JOIN admins a ON al.admin_id = a.id
ORDER BY al.created_at DESC
LIMIT 50;

-- 금주 자동화 성공률
SELECT
  kind,
  COUNT(*) AS total,
  SUM(status = 'SUCCESS') AS success,
  ROUND(SUM(status = 'SUCCESS') / COUNT(*) * 100, 1) AS success_pct
FROM runs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY kind;

-- PR Open 상태 이슈 (머지 대기 중)
SELECT i.id, i.title, pr.pr_url, pr.created_at
FROM issues i
JOIN pull_requests pr ON pr.issue_id = i.id
WHERE i.status = 'PR_OPEN'
ORDER BY pr.created_at;
```
