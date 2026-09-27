import { test, expect, isAppHealthy } from './fixtures';

test.describe('M0 harness', () => {
  test('health endpoint or login page loads', async ({ page, request }) => {
    const healthy = await isAppHealthy(request);

    if (healthy) {
      const response = await request.get('http://localhost:9002/health');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.status).toBe('ok');
    }

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /로그인|login/i })).toBeVisible();
  });
});
