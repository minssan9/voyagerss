import { defineConfig, devices } from '@playwright/test';

/**
 * E2E 테스트 설정
 *
 * 실행 전 로컬 서비스 필요:
 *   - MySQL  : localhost:3306 (DB: autpr_test)
 *   - Redis  : localhost:6379
 *   - API    : localhost:3000  (npm run dev in apps/api)
 *   - Worker : localhost (app context — npm run dev in apps/worker)
 *   - Admin  : localhost:3001  (npm run dev in apps/admin-web)
 *   - Widget : localhost:3002  (npm run dev in apps/widget-app)
 *
 * GitHub / Anthropic API 는 globalSetup 의 nock mock 서버로 대체됨.
 */
export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,          // E2E는 순서 의존성 있음 — 직렬 실행
  reporter: [['html', { outputFolder: 'playwright-report' }], ['line']],

  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  use: {
    baseURL: 'http://localhost:3001',   // admin-web
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
