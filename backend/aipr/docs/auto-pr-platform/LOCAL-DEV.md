# Local Development — 로컬 개발 환경 구성

> PLAN.md v0.1 기준 · 타겟: macOS / Windows(WSL2) / Linux
> 목적: clone 후 30분 안에 `pnpm dev` 실행 → 위젯 제출 → Admin UI 확인까지 스모크 완료

---

## 1. 전제조건 (Prerequisites)

| 도구 | 권장 버전 | 설치 확인 |
|------|---------|---------|
| Node.js | 20.x LTS | `node -v` |
| pnpm | 9.x | `pnpm -v` |
| Docker Desktop | 4.30+ | `docker -v && docker compose version` |
| Git | 2.40+ | `git --version` |
| Claude Code CLI | 최신 | `claude --version` |
| (선택) smee.io CLI | 최신 | `npx smee-client --version` |

설치 (macOS 예시):
```bash
brew install node@20 pnpm docker git
npm i -g @anthropic-ai/claude-code
```

Windows는 WSL2(Ubuntu 22.04) + Docker Desktop WSL2 backend 를 권장.

---

## 2. 저장소 초기화

```bash
git clone <repo-url> auto-pr-platform
cd auto-pr-platform
pnpm install                     # 워크스페이스 전체 의존성
cp .env.sample .env              # 루트 공용 env
cp apps/api/.env.sample apps/api/.env
cp apps/worker/.env.sample apps/worker/.env
cp apps/admin-web/.env.sample apps/admin-web/.env
cp apps/widget-app/.env.sample apps/widget-app/.env
```

---

## 3. 포트 레이아웃

| 포트 | 서비스 |
|------|--------|
| 3000 | `admin-web` (Nuxt3) |
| 3001 | `widget-app` (Nuxt3 iframe content) |
| 3100 | `api` (NestJS) |
| 3101 | `worker` (BullMQ + 헬스체크) |
| 5432 | Postgres |
| 6379 | Redis |
| 9000 | MinIO (S3 호환, 첨부 저장) |
| 9001 | MinIO Console |
| 8025 | MailHog UI (이메일 확인) |
| 8080 | Adminer (DB GUI) |

---

## 4. 인프라 (Docker Compose)

`docker/docker-compose.dev.yml`

```yaml
name: auto-pr-platform
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: auto_pr
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d auto_pr"]
      interval: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: ["redis-server", "--appendonly", "yes"]
    volumes: [redisdata:/data]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio12345
    ports: ["9000:9000", "9001:9001"]
    volumes: [miniodata:/data]

  mailhog:
    image: mailhog/mailhog:latest
    ports: ["1025:1025", "8025:8025"]

  adminer:
    image: adminer:4
    ports: ["8080:8080"]
    depends_on: [postgres]

volumes:
  pgdata: {}
  redisdata: {}
  miniodata: {}
```

기동:
```bash
docker compose -f docker/docker-compose.dev.yml up -d
docker compose -f docker/docker-compose.dev.yml ps
```

---

## 5. 환경 변수 (`.env.sample`)

루트 `.env.sample`

```bash
# --- 공통 ---
NODE_ENV=development
LOG_LEVEL=debug

# --- DB ---
DATABASE_URL="postgresql://app:app@localhost:5432/auto_pr?schema=public"

# --- Redis ---
REDIS_URL="redis://localhost:6379"

# --- Storage (MinIO) ---
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_BUCKET="attachments"
S3_ACCESS_KEY="minio"
S3_SECRET_KEY="minio12345"
S3_FORCE_PATH_STYLE="true"

# --- Mail (MailHog) ---
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_FROM="noreply@local.test"

# --- Auth ---
JWT_SECRET="change-me-dev"
JWT_REFRESH_SECRET="change-me-dev-refresh"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"

# --- GitHub App ---
GITHUB_APP_ID=""
GITHUB_APP_PRIVATE_KEY_PATH="./secrets/github-app.pem"
GITHUB_WEBHOOK_SECRET="dev-secret"
GITHUB_INSTALLATION_ID=""

# --- Anthropic / Claude ---
ANTHROPIC_API_KEY=""
CLAUDE_MODEL="claude-sonnet-4-6"
CLAUDE_MAX_TURNS=40
CLAUDE_DAILY_COST_LIMIT_USD=20

# --- URLs ---
API_BASE_URL="http://localhost:3100"
ADMIN_BASE_URL="http://localhost:3000"
WIDGET_BASE_URL="http://localhost:3001"

# --- CORS / Origin ---
WIDGET_ALLOWED_ORIGINS="http://localhost:5500,http://localhost:8000"
```

⚠️ `secrets/github-app.pem` 는 gitignore. 개발 초기에는 GitHub App 없이도 mock 모드로 가능(아래 §8 참고).

---

## 6. 데이터베이스 준비

```bash
pnpm --filter @app/db exec prisma migrate dev --name init
pnpm --filter @app/db exec prisma db seed
```

`packages/db/prisma/seed.ts` 기본 시드:
- 관리자 1명: `admin@local.test` / `admin1234`
- 테스트용 `allowed_origins`: `http://localhost:5500`, `http://localhost:8000`
- 샘플 이슈 3건 (상태: NEW / PLAN_READY / PR_OPEN)

MinIO 버킷 생성:
```bash
docker run --rm --network host -e MC_HOST_local=http://minio:minio12345@localhost:9000 \
  minio/mc mb -p local/attachments
```

---

## 7. 애플리케이션 실행

**옵션 A — 한번에 모두**
```bash
pnpm dev
```
루트 `package.json` 의 `"dev": "turbo run dev --parallel"` 혹은 `concurrently` 사용.

**옵션 B — 개별 터미널**
```bash
pnpm --filter api dev           # 3100
pnpm --filter worker dev        # 3101
pnpm --filter admin-web dev     # 3000
pnpm --filter widget-app dev    # 3001
```

헬스체크:
```bash
curl http://localhost:3100/health
curl http://localhost:3101/health
open http://localhost:3000           # Admin
open http://localhost:8025           # MailHog
open http://localhost:9001           # MinIO console
open http://localhost:8080           # Adminer
```

---

## 8. 외부 연동 (GitHub / Claude) 로컬 구성

### 8-1. GitHub App (실제 PR 테스트)
1. https://github.com/settings/apps 에서 dev 전용 App 생성
2. 권한: `Contents: Read & write`, `Pull requests: Read & write`, `Metadata: Read`
3. Webhook URL → smee.io 프록시:
   ```bash
   npx smee-client --url https://smee.io/<your-channel> \
                   --target http://localhost:3100/api/webhooks/github
   ```
4. private key `.pem` 다운로드 → `secrets/github-app.pem`
5. App 을 테스트용 repo 에 Install → `GITHUB_INSTALLATION_ID` 에 기입

### 8-2. Mock 모드 (GitHub 없이)
`GITHUB_MOCK=true` 지정 시 `github-client` 가 in-memory 로 동작:
- clone 대신 `fixtures/mock-repo/` 를 작업공간으로 복사
- `push` / `create PR` 는 로그만 남기고 fake PR URL 반환
- E2E 초기 단계에 유용

### 8-3. Claude Code CLI 확인
```bash
claude --version
claude --help | head -20
echo $ANTHROPIC_API_KEY | head -c 10
```
최초 1회 수동 실행으로 권한·모델 접근 확인:
```bash
cd /tmp && mkdir smoke && cd smoke && git init
claude --headless -p "Create a file hello.txt with 'world'" --allowed-tools "Write" --max-turns 3
cat hello.txt
```

---

## 9. 스모크 테스트 (End-to-End 30분 안에)

| 단계 | 명령 / 행동 | 확인 |
|------|------------|------|
| 1 | `docker compose up -d` | 5개 컨테이너 healthy |
| 2 | `pnpm dev` | 4개 앱 모두 listening |
| 3 | 브라우저로 `apps/widget-embed/demo/index.html` 열기 | 우하단 FAB 표시 |
| 4 | FAB 클릭 → 폼 제출 | Admin UI `/issues` 목록에 새 행 |
| 5 | 이슈 상세 → `Approve` | 상태 `QUEUED`, worker 로그에 `plan` job |
| 6 | (mock) 몇 초 후 `PLAN_READY` 전이 | planning_docs 저장, 타임라인 표시 |
| 7 | `Start Build` 클릭 | `BUILDING` → (mock PR URL) → `PR_OPEN` |
| 8 | MailHog `http://localhost:8025` | 승인 필요 / PR 생성 알림 이메일 2건 |

---

## 10. 유용한 dev 명령어

```bash
# 마이그레이션 재생성
pnpm --filter @app/db exec prisma migrate reset --force

# DB 시드만 재실행
pnpm --filter @app/db exec prisma db seed

# 큐 상태 확인 (BullMQ CLI)
pnpm dlx bull-board --redis redis://localhost:6379 --port 3210

# API 전용 핫리로드 + 디버거
pnpm --filter api dev:debug     # node --inspect=9229

# 전체 타입체크
pnpm -r typecheck

# 전체 테스트
pnpm -r test

# 전체 린트
pnpm -r lint --fix
```

---

## 11. 디렉토리 구조 (로컬에서 생성될 것)

```
auto-pr-platform/
├─ .env                       ← 루트 공용 (gitignored)
├─ secrets/
│  └─ github-app.pem          ← GitHub App private key (gitignored)
├─ docker/
│  └─ docker-compose.dev.yml
├─ fixtures/
│  └─ mock-repo/              ← GITHUB_MOCK=true 용 샘플 레포
├─ workspaces/                ← 런타임 생성, 런당 임시 clone 디렉토리
│  └─ <run_id>/
├─ apps/
│  ├─ api/        .env
│  ├─ worker/     .env
│  ├─ admin-web/  .env
│  ├─ widget-app/ .env
│  └─ widget-embed/
│     └─ demo/index.html      ← 스모크용 호스트 HTML
├─ packages/
│  ├─ db/
│  │  └─ prisma/{schema.prisma,seed.ts,migrations/}
│  ├─ shared/
│  └─ config/
└─ pnpm-workspace.yaml
```

---

## 12. 흔한 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-----------|
| `ECONNREFUSED 127.0.0.1:5432` | `docker compose ps` 로 postgres healthy 확인, 포트 충돌 시 `.env`의 `DATABASE_URL` 포트 변경 |
| Prisma `P1001` | postgres healthcheck 지연 — `docker logs <pg>` 로 `ready to accept` 확인 후 재실행 |
| Widget 에서 CORS 에러 | API 의 `WIDGET_ALLOWED_ORIGINS` 에 호스트 origin 포함됐는지 확인 |
| `claude: command not found` | `npm i -g @anthropic-ai/claude-code` 재실행, PATH 확인 |
| Worker 가 `plan` job 에서 hang | Anthropic API key 미설정 or 레이트리밋 — `docker logs` 대신 worker 콘솔 확인 |
| GitHub webhook 이 안 옴 | smee-client 터미널이 떠 있는지, App Webhook URL 이 smee 채널인지 확인 |
| MinIO 업로드 403 | 버킷 생성 여부, `S3_FORCE_PATH_STYLE=true` 확인 |

---

## 13. 한 줄 요약 부트스트랩

```bash
git clone <repo> auto-pr-platform && cd $_ \
 && pnpm install \
 && docker compose -f docker/docker-compose.dev.yml up -d \
 && cp .env.sample .env && pnpm --filter @app/db exec prisma migrate dev --name init \
 && pnpm --filter @app/db exec prisma db seed \
 && pnpm dev
```
