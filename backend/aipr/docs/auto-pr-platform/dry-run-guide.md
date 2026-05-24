# Dry-Run Guide — 실제 Repo 연결 테스트

> 목적: 프로덕션 배포 전, 실제 GitHub 저장소 1개를 연결해 전체 플로우(피드백 → Plan → Build → PR)를 검증한다.  
> 소요 시간: 약 30~60분

---

## 사전 준비

### 1. 테스트용 GitHub 저장소 준비

```bash
# 테스트 전용 저장소 생성 (중요: 프로덕션 repo 사용 금지)
# 예: github.com/YOUR_ORG/auto-pr-dryrun-test

# 저장소에 간단한 코드가 있어야 Claude가 컨텍스트를 파악할 수 있음
echo "# Dry-run test repo" > README.md
git add . && git commit -m "init" && git push
```

### 2. GitHub App 등록

1. https://github.com/settings/apps/new 접속
2. 다음 설정으로 앱 생성:

   | 항목 | 값 |
   |------|-----|
   | App name | `auto-pr-dryrun` |
   | Homepage URL | `http://localhost:3000` |
   | Webhook URL | `https://<ngrok_url>/api/webhooks/github` |
   | Webhook secret | 임의 문자열 (`.env`의 `GITHUB_WEBHOOK_SECRET`과 동일) |

3. Permissions 설정:
   - **Contents**: Read & Write
   - **Pull requests**: Read & Write
   - **Metadata**: Read-only

4. Subscribe to events: `Pull request`

5. 앱 생성 후:
   - **App ID** 메모
   - **Private key** 생성 후 다운로드 → base64 인코딩:
     ```bash
     base64 -w 0 private-key.pem
     ```
   - 테스트 repo에 앱 설치: App 설정 → Install App → 테스트 repo 선택
   - **Installation ID** 확인: `https://api.github.com/app/installations` 호출 또는 설치 URL에서 확인

### 3. ngrok으로 webhook 터널 열기

```bash
# GitHub webhook이 로컬 API를 호출할 수 있도록 ngrok 터널 생성
ngrok http 3000
# Forwarding URL 메모: https://xxxx.ngrok-free.app
```

GitHub App의 Webhook URL을 `https://xxxx.ngrok-free.app/api/webhooks/github` 로 업데이트.

---

## .env 설정

```dotenv
# DB / Redis
DATABASE_URL=mysql://root:admin@localhost:3306/autpr_db
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=your-32-char-access-secret-here
JWT_REFRESH_SECRET=your-32-char-refresh-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx

# GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY_BASE64=<base64_encoded_pem>
GITHUB_INSTALLATION_ID=78901234
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_DEFAULT_REPO=YOUR_ORG/auto-pr-dryrun-test
GITHUB_DEFAULT_BASE_BRANCH=main

# Widget CORS
WIDGET_ORIGIN_ALLOWLIST=http://localhost:3002

# Optional
PORT=3000
NODE_ENV=development
```

---

## 드라이런 절차

### Step 1. 서비스 기동

```bash
# 터미널 1 — API
pnpm --filter @repo/api dev

# 터미널 2 — Worker
pnpm --filter @repo/worker dev

# 터미널 3 — Admin Web
pnpm --filter @repo/admin-web dev

# 터미널 4 — Widget App (선택)
pnpm --filter @repo/widget-app dev
```

DB seed (최초 1회):
```bash
pnpm --filter @repo/db db:migrate:dev
pnpm --filter @repo/db db:seed
```

### Step 2. 피드백 제출

방법 A — curl:
```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "title": "드라이런 테스트 이슈",
    "body": "README.md 파일에 Getting Started 섹션을 추가해주세요. 설치 방법과 실행 방법을 포함해야 합니다.",
    "reporterEmail": "dryrun@example.com",
    "repoFullName": "YOUR_ORG/auto-pr-dryrun-test",
    "baseBranch": "main"
  }'
```

방법 B — 위젯 UI (`http://localhost:3002`):
- 제목: `드라이런 테스트 이슈`
- 내용: `README.md 파일에 Getting Started 섹션을 추가해주세요.`

응답 예시:
```json
{ "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "status": "NEW" }
```

### Step 3. Admin에서 Approve

1. `http://localhost:3001/login` → `admin@example.com / admin1234!`
2. Issues 목록에서 생성된 이슈 클릭
3. **Triage** 버튼 클릭 → `TRIAGED`
4. **Approve** 버튼 클릭 → `QUEUED`

또는 API 직접:
```bash
# 로그인
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin1234!"}' \
  | jq -r '.accessToken')

ISSUE_ID="<위에서 받은 id>"

# TRIAGED
curl -X PATCH http://localhost:3000/api/admin/issues/$ISSUE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"TRIAGED"}'

# QUEUED (plan job enqueue)
curl -X PATCH http://localhost:3000/api/admin/issues/$ISSUE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"QUEUED"}'
```

### Step 4. Plan 생성 확인

Worker 로그에서:
```
[PlanProcessor] Starting plan for issue <id>
[PlanProcessor] Cloning repo: YOUR_ORG/auto-pr-dryrun-test
[PlanProcessor] Claude plan generated — 450 input tokens, 280 output tokens
[PlanProcessor] Plan saved → planning_docs id: <id>
[PlanProcessor] Issue transitioned to PLAN_READY
```

Admin UI의 이슈 상세 → **Planning Doc** 탭에서 생성된 plan.md 내용 확인.

```bash
# DB 직접 확인
mysql -u root -padmin autpr_db -e "
  SELECT id, version, LEFT(content, 300) AS preview, created_at
  FROM planning_docs
  WHERE issue_id = '$ISSUE_ID';
"
```

### Step 5. Build 시작

Admin UI에서 **Start Build** 버튼 클릭 → `BUILDING`

또는:
```bash
curl -X PATCH http://localhost:3000/api/admin/issues/$ISSUE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"BUILDING"}'
```

Worker 로그에서 Claude Code CLI 실행 확인:
```
[BuildProcessor] Branch created: feat/issue-<id>-getstarted
[BuildProcessor] Spawning Claude Code CLI (max-turns: 40)
[BuildProcessor] stdout: Reading README.md...
[BuildProcessor] stdout: Editing README.md — Adding Getting Started section
[BuildProcessor] Claude Code completed — exit 0
[BuildProcessor] Pushing branch feat/issue-<id>-getstarted
[BuildProcessor] PR created: https://github.com/YOUR_ORG/auto-pr-dryrun-test/pull/1
[BuildProcessor] Issue transitioned to PR_OPEN
```

Admin UI의 SSE 로그 타임라인에서 실시간 확인 가능.

### Step 6. PR 확인

`https://github.com/YOUR_ORG/auto-pr-dryrun-test/pulls` 에서 PR 확인:
- 브랜치: `feat/issue-<id>-*`
- 변경사항: README.md에 Getting Started 섹션 추가
- PR 설명에 이슈 본문 포함 여부 확인

### Step 7. PR Merge → MERGED 전이

GitHub에서 PR Merge 후:
- ngrok 터널로 webhook이 수신됨
- API 로그: `[WebhooksService] PR #1 merged → issue MERGED`
- Admin UI에서 이슈 상태 `MERGED` 확인

---

## 검증 포인트 체크리스트

```
[ ] 피드백 제출 → DB issue row 생성 (status=NEW)
[ ] TRIAGED 전이 → audit_log 기록
[ ] QUEUED 전이 → BullMQ plan job 생성 (redis-cli llen bull:plan:wait)
[ ] Plan 생성 → planning_docs row + PLAN_READY 전이
[ ] Plan 내용이 이슈 본문을 반영하고 있음
[ ] BUILDING 전이 → build job 생성
[ ] GitHub 저장소에 새 브랜치 생성됨
[ ] Claude Code CLI가 코드를 수정하고 커밋함
[ ] PR 생성됨 (제목/본문 적절)
[ ] PR_OPEN 전이 → pull_requests row 생성
[ ] GitHub PR Merge → webhook 수신 → MERGED 전이
[ ] 비용 추적: runs.cost_usd 값 존재
[ ] Grafana 대시보드에 모든 메트릭 반영됨
[ ] secret 마스킹: Worker 로그에 API 키 노출 없음
```

---

## 트러블슈팅

### GitHub clone 실패
```
Error: Could not clone repository
```
- Installation ID 확인: `.env`의 `GITHUB_INSTALLATION_ID` 정확한지 확인
- GitHub App이 해당 repo에 설치됐는지 확인
- private key base64 디코딩 확인: `echo $GITHUB_APP_PRIVATE_KEY_BASE64 | base64 -d | head -1`

### Claude Code CLI 실행 실패
```
Error: claude: command not found
```
- Worker 환경에서 Claude Code CLI 설치 확인: `claude --version`
- 전역 설치: `npm install -g @anthropic-ai/claude-code`

### Webhook 미수신
- ngrok URL이 GitHub App webhook URL과 일치하는지 확인
- ngrok 대시보드(`http://localhost:4040`)에서 요청 내역 확인
- `GITHUB_WEBHOOK_SECRET` 값 불일치 → 401 응답

### Plan이 생성됐는데 PR이 안 만들어짐
- `runs` 테이블의 `error_summary` 컬럼 조회
- Worker 로그에서 Claude Code 종료 코드 확인 (exit 0이어야 정상)
- GitHub API rate limit 확인 (분당 5000 requests)
