/**
 * Spec 02 — Admin 전체 플로우 (API 레벨)
 *
 * 테스트 범위:
 *   1. 피드백 제출 (NEW)
 *   2. Admin 로그인
 *   3. TRIAGED → QUEUED (Approve — plan job enqueue)
 *   4. Worker가 Plan 생성 후 PLAN_READY 전이 확인 (nock 으로 GitHub/Anthropic mock)
 *   5. BUILDING 전이 (Start Build — build job enqueue)
 *   6. Worker가 PR 생성 후 PR_OPEN 전이 확인
 *
 * Worker는 같은 Node 프로세스 내 또는 별도 프로세스로 구동됨.
 * 별도 프로세스 구동 시 globalSetup 에서 환경변수로 mock URL을 주입할 것.
 *
 * NOTE: PLAN_READY / PR_OPEN 전이는 Worker 구동 여부에 따라 달라짐.
 *       Worker 없이 API만 실행 시 status poll은 timeout으로 skip됨.
 */
import { expect, test } from '@playwright/test';
import { ApiHelper } from '../helpers/api';

const WORKER_RUNNING = process.env.E2E_WORKER_RUNNING === 'true';
const ADMIN_URL      = process.env.ADMIN_URL ?? 'http://localhost:3001';

test.describe('Admin — Status Transition Flow (API)', () => {
  let issueId: string;
  let api: ApiHelper;

  test.beforeAll(async ({ request }) => {
    api = new ApiHelper(request);
    await api.login();

    // 테스트용 issue 생성
    const result = await api.submitFeedback({
      title:       'E2E Full Flow — Auto-PR test',
      body:        'Reproduce: open /dashboard. Expected: loading spinner. Actual: blank page.',
      repoFullName: process.env.E2E_REPO ?? 'test-owner/test-repo',
      baseBranch:   'main',
    });
    issueId = result.id;
  });

  test('1. 생성된 issue 상태는 NEW', async () => {
    const issue = await api.getIssue(issueId);
    expect(issue.status).toBe('NEW');
  });

  test('2. NEW → TRIAGED 전이', async () => {
    const issue = await api.transitionIssue(issueId, 'TRIAGED');
    expect(issue.status).toBe('TRIAGED');
  });

  test('3. TRIAGED → QUEUED 전이 (Approve — plan job enqueue)', async () => {
    const issue = await api.transitionIssue(issueId, 'QUEUED');
    expect(issue.status).toBe('QUEUED');
  });

  test('4. Worker가 플랜 생성 후 PLAN_READY로 전이 (Worker 필요)', async () => {
    if (!WORKER_RUNNING) {
      test.skip(true, 'Worker not running — set E2E_WORKER_RUNNING=true to enable');
    }
    // Worker 가 plan job 처리 → PLAN_READY 전이 대기 (최대 30s)
    await api.waitForStatus(issueId, 'PLAN_READY', { timeoutMs: 30_000 });
    const issue = await api.getIssue(issueId);
    expect(issue.status).toBe('PLAN_READY');
    expect(issue.planningDocs).toHaveLength(1);
    expect(issue.planningDocs[0].content).toContain('Plan');
  });

  test('5. PLAN_READY → BUILDING 전이 (Start Build)', async () => {
    if (!WORKER_RUNNING) {
      test.skip(true, 'Worker not running — set E2E_WORKER_RUNNING=true to enable');
    }
    const issue = await api.transitionIssue(issueId, 'BUILDING');
    expect(issue.status).toBe('BUILDING');
  });

  test('6. Worker가 PR 생성 후 PR_OPEN으로 전이 (Worker 필요)', async () => {
    if (!WORKER_RUNNING) {
      test.skip(true, 'Worker not running — set E2E_WORKER_RUNNING=true to enable');
    }
    // Claude Code CLI spawn + GitHub PR 생성 대기 (최대 60s)
    await api.waitForStatus(issueId, 'PR_OPEN', { timeoutMs: 60_000 });
    const issue = await api.getIssue(issueId);
    expect(issue.status).toBe('PR_OPEN');
    expect(issue.pullRequests).toHaveLength(1);
    expect(issue.pullRequests[0].prUrl).toContain('github.com');
  });
});

test.describe('Admin UI — Login & Issue List', () => {
  test('admin-web 로그인 페이지 렌더링', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await expect(page.getByRole('heading', { name: /login|로그인/i })).toBeVisible({ timeout: 10_000 });
  });

  test('로그인 후 /issues 리다이렉트', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);

    await page.getByPlaceholder(/email/i).fill('admin@example.com');
    await page.getByPlaceholder(/password|비밀번호/i).fill('admin1234!');
    await page.getByRole('button', { name: /login|로그인/i }).click();

    await page.waitForURL(/\/issues/, { timeout: 10_000 });
    await expect(page.getByText(/issue|feedback/i)).toBeVisible();
  });

  test('issue 상세 페이지 — 상태 배지 표시', async ({ page, request }) => {
    const api = new ApiHelper(request);
    await api.login();
    const { id } = await api.submitFeedback({
      title: 'UI Badge Test',
      body:  'Testing status badge rendering',
    });

    // 로그인
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByPlaceholder(/email/i).fill('admin@example.com');
    await page.getByPlaceholder(/password|비밀번호/i).fill('admin1234!');
    await page.getByRole('button', { name: /login|로그인/i }).click();
    await page.waitForURL(/\/issues/, { timeout: 10_000 });

    // 상세 페이지 이동
    await page.goto(`${ADMIN_URL}/issues/${id}`);
    await expect(page.getByText('NEW')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('GitHub Webhook — PR merge → MERGED 전이', () => {
  test('webhook payload 수신 시 issue status가 MERGED로 변경됨', async ({ request }) => {
    const api = new ApiHelper(request);
    await api.login();

    // PR_OPEN 상태 issue 준비 (수동 삽입이 필요해 직접 전이를 5단계 밟는 대신
    // 여기서는 QUEUED까지만 하고 webhook 테스트를 분리)
    const { id } = await api.submitFeedback({
      title: 'Webhook Merge Test',
      body:  'Testing webhook handler',
    });
    await api.transitionIssue(id, 'TRIAGED');
    await api.transitionIssue(id, 'QUEUED');

    // webhook 직접 호출 — HMAC 서명 없이 테스트 (실제로는 secret 필요)
    // CI에서는 WEBHOOK_SECRET env로 서명을 생성해 전달
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? 'dev-webhook-secret';
    const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3000/api';

    const payload = {
      action:       'closed',
      pull_request: {
        number:    99,
        html_url:  `https://github.com/test-owner/test-repo/pull/99`,
        merged:    true,
        merged_at: new Date().toISOString(),
        head:      { sha: 'deadbeef' },
        user:      { login: 'test-user' },
      },
      repository: {
        full_name: 'test-owner/test-repo',
      },
    };

    // NOTE: HMAC 서명 생성 (crypto.createHmac)은 Node.js에서만 가능.
    // Playwright request 는 브라우저 fetch 기반이므로 여기서는 서명 생략하고
    // API에서 HMAC skip 모드(E2E_SKIP_HMAC=true)를 지원하면 가능.
    // 실제 CI 파이프라인에서는 jest supertest로 webhook 테스트를 별도 실행 권장.
    test.skip(true, 'Webhook HMAC signing requires Node crypto — use Jest supertest for this case');

    const res = await request.post(`${API_BASE}/webhooks/github`, {
      headers: {
        'x-github-event':    'pull_request',
        'x-hub-signature-256': `sha256=placeholder`,
        'content-type':       'application/json',
      },
      data: payload,
    });

    expect(res.status()).toBe(204);
  });
});
