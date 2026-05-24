/**
 * E2E 테스트용 API helper — Playwright request context 래퍼
 */
import type { APIRequestContext } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3000/api';

export class ApiHelper {
  private token: string | null = null;

  constructor(private readonly request: APIRequestContext) {}

  /** admin 로그인 후 token 저장 */
  async login(email = 'admin@example.com', password = 'admin1234!') {
    const res = await this.request.post(`${API_BASE}/auth/login`, {
      data: { email, password },
    });
    if (!res.ok()) throw new Error(`Login failed: ${res.status()}`);
    const body = await res.json();
    this.token = body.accessToken;
    return this.token!;
  }

  private headers() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  /** POST /api/feedback */
  async submitFeedback(payload: {
    title: string;
    body: string;
    reporterEmail?: string;
    repoFullName?: string;
    baseBranch?: string;
  }) {
    const res = await this.request.post(`${API_BASE}/feedback`, {
      data: {
        title:        payload.title,
        body:         payload.body,
        reporterEmail: payload.reporterEmail ?? 'tester@example.com',
        repoFullName:  payload.repoFullName  ?? 'test-owner/test-repo',
        baseBranch:    payload.baseBranch    ?? 'main',
      },
    });
    if (!res.ok()) throw new Error(`submitFeedback failed: ${res.status()} ${await res.text()}`);
    return (await res.json()) as { id: string; status: string };
  }

  /** PATCH /api/admin/issues/:id — status transition */
  async transitionIssue(id: string, status: string) {
    const res = await this.request.patch(`${API_BASE}/admin/issues/${id}`, {
      headers: this.headers(),
      data: { status },
    });
    if (!res.ok()) throw new Error(`transition(${status}) failed: ${res.status()} ${await res.text()}`);
    return res.json();
  }

  /** GET /api/admin/issues/:id */
  async getIssue(id: string) {
    const res = await this.request.get(`${API_BASE}/admin/issues/${id}`, {
      headers: this.headers(),
    });
    if (!res.ok()) throw new Error(`getIssue failed: ${res.status()}`);
    return res.json();
  }

  /** Poll until issue.status === expected (or timeout) */
  async waitForStatus(
    id: string,
    expected: string,
    { intervalMs = 2000, timeoutMs = 30_000 }: { intervalMs?: number; timeoutMs?: number } = {},
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const issue = await this.getIssue(id);
      if (issue.status === expected) return;
      await new Promise(r => setTimeout(r, intervalMs));
    }
    const issue = await this.getIssue(id);
    throw new Error(`Timed out waiting for status ${expected}. Current: ${issue.status}`);
  }
}
