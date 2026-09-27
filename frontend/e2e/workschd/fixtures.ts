import { APIRequestContext, Page, test as base } from '@playwright/test';

/**
 * Seed credentials (backend/prisma/seed-workschd.sql).
 * Password for all: password123!
 */
export const users = {
  leader: {
    email: 'leader@example.com',
    password: 'password123!',
    accountId: 1,
  },
  worker: {
    email: 'member@example.com',
    password: 'password123!',
    accountId: 2,
  },
  admin: {
    email: 'admin@workschd.test',
    password: 'password123!',
    accountId: 3,
  },
} as const;

const apiBase = process.env.E2E_API_BASE_URL || 'http://localhost:9002';

function identityLoginUrl() {
  const base = apiBase.replace(/\/$/, '');
  return `${base.endsWith('/api') ? base : `${base}/api`}/identity/auth/login`;
}

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const response = await request.post(identityLoginUrl(), {
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { accessToken?: string };
  const authHeader = response.headers()['authorization'];
  const token = body.accessToken || authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    throw new Error(`Login for ${email} did not return accessToken`);
  }
  return token;
}

export async function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function mockExternalServices(page: Page) {
  await page.route('**/oauth2/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/identity/auth/google**', (route) => route.abort());
  await page.route('**/identity/auth/kakao**', (route) => route.abort());
  await page.route('**/solapi/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }),
  );
}

export async function mockScrapeApi(page: Page) {
  await page.route('**/api/workschd/scrape**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        report: { totalScraped: 1, bySource: [{ name: 'mock' }], errors: [] },
      }),
    }),
  );

  await page.route('**/api/workschd/scraped-funerals**', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [
            {
              id: 101,
              deceasedName: 'E2E Mock Deceased',
              funeralHome: { name: 'Mock Funeral Home', region: 'INCHEON' },
              roomNumber: '101',
              taskId: null,
            },
          ],
          totalElements: 1,
          totalPages: 1,
        }),
      });
    }
    return route.continue();
  });

  await page.route('**/api/workschd/scraped-funerals/*/link-task**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, funeralId: 101, taskId: 1 }),
    }),
  );
}

export async function isAppHealthy(request: APIRequestContext): Promise<boolean> {
  try {
    const health = await request.get(`${apiBase.replace(/\/api$/, '')}/health`);
    return health.ok();
  } catch {
    return false;
  }
}

export async function setAuthCookie(page: Page, token: string) {
  await page.context().addCookies([
    {
      name: 'accessToken',
      value: token,
      domain: 'localhost',
      path: '/',
    },
  ]);
}

type WorkschdFixtures = {
  leaderToken: string;
  workerToken: string;
};

export const test = base.extend<WorkschdFixtures>({
  leaderToken: async ({ request }, use) => {
    const token = await apiLogin(request, users.leader.email, users.leader.password);
    await use(token);
  },
  workerToken: async ({ request }, use) => {
    const token = await apiLogin(request, users.worker.email, users.worker.password);
    await use(token);
  },
});

export { expect } from '@playwright/test';
