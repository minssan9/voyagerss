/**
 * Spec 03 — GitHub Webhook integration (Jest supertest 스타일 API 테스트)
 *
 * Playwright request context 는 브라우저 fetch 기반이라 Node.js crypto 사용 불가.
 * 이 파일은 Playwright 의 `request` fixture 대신 Node.js fetch + crypto 를 사용.
 *
 * 실행: E2E_WEBHOOK_TEST=true npx playwright test 03-webhook-integration
 */
import * as crypto from 'crypto';
import { expect, test } from '@playwright/test';

const API_BASE          = process.env.API_BASE_URL    ?? 'http://localhost:3000/api';
const WEBHOOK_SECRET    = process.env.GITHUB_WEBHOOK_SECRET ?? 'dev-webhook-secret';
const E2E_WEBHOOK_TEST  = process.env.E2E_WEBHOOK_TEST === 'true';

function signPayload(body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

async function sendWebhook(event: string, payload: object) {
  const body = JSON.stringify(payload);
  const sig  = signPayload(body);
  return fetch(`${API_BASE}/webhooks/github`, {
    method: 'POST',
    headers: {
      'content-type':           'application/json',
      'x-github-event':         event,
      'x-hub-signature-256':    sig,
    },
    body,
  });
}

test.describe('GitHub Webhook Handler', () => {
  test.beforeEach(() => {
    if (!E2E_WEBHOOK_TEST) test.skip(true, 'Set E2E_WEBHOOK_TEST=true to run webhook tests');
  });

  test('pull_request opened → 204', async () => {
    const payload = {
      action: 'opened',
      pull_request: {
        number:   101,
        html_url: 'https://github.com/o/r/pull/101',
        merged:   false,
        head:     { sha: 'aaabbb' },
        user:     { login: 'bot' },
      },
      repository: { full_name: 'o/r' },
    };
    const res = await sendWebhook('pull_request', payload);
    expect(res.status).toBe(204);
  });

  test('pull_request closed + merged → 204', async () => {
    const payload = {
      action: 'closed',
      pull_request: {
        number:    101,
        html_url:  'https://github.com/o/r/pull/101',
        merged:    true,
        merged_at: new Date().toISOString(),
        head:      { sha: 'aaabbb' },
        user:      { login: 'bot' },
      },
      repository: { full_name: 'o/r' },
    };
    const res = await sendWebhook('pull_request', payload);
    expect(res.status).toBe(204);
  });

  test('잘못된 서명 → 401', async () => {
    const body = JSON.stringify({ action: 'opened', pull_request: {}, repository: {} });
    const res = await fetch(`${API_BASE}/webhooks/github`, {
      method: 'POST',
      headers: {
        'content-type':        'application/json',
        'x-github-event':      'pull_request',
        'x-hub-signature-256': 'sha256=invalidsignature',
      },
      body,
    });
    expect(res.status).toBe(401);
  });
});
