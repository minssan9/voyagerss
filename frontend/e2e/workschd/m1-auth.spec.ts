import { test, expect, isAppHealthy, users } from './fixtures';

test.describe('M1 auth', () => {
  test('password login navigates away from login page', async ({ page, request }) => {
    const healthy = await isAppHealthy(request);
    test.skip(!healthy, 'App/backend not running');

    await page.goto('/login');

    await page.getByLabel(/이메일|email/i).fill(users.leader.email);
    await page.getByLabel(/비밀번호|password/i).fill(users.leader.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15000 });
    expect(page.url()).not.toContain('/login');
  });

  test('redirect query is honored after login', async ({ page, request }) => {
    const healthy = await isAppHealthy(request);
    test.skip(!healthy, 'App/backend not running');

    await page.goto('/login?redirect=/workschd');
    await page.getByLabel(/이메일|email/i).fill(users.leader.email);
    await page.getByLabel(/비밀번호|password/i).fill(users.leader.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => url.pathname.startsWith('/workschd'), { timeout: 15000 });
    expect(new URL(page.url()).pathname.startsWith('/workschd')).toBeTruthy();
  });
});
