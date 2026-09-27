import { test, expect, apiLogin, setAuthCookie, users } from './fixtures';

test.describe('M7 admin access', () => {
  test('non-admin blocked from RBAC page', async ({ page, request }) => {
    const workerToken = await apiLogin(request, users.worker.email, users.worker.password);
    await setAuthCookie(page, workerToken);

    await page.goto('/workschd/admin/rbac/roles');
    await page.waitForURL(
      (url) => url.pathname.includes('/403') || url.pathname.includes('/login'),
      { timeout: 15000 },
    );
    const path = new URL(page.url()).pathname;
    expect(path.includes('/403') || path.includes('/login')).toBeTruthy();
  });

  test('admin stays on the dashboard', async ({ page, request }) => {
    const adminToken = await apiLogin(request, users.admin.email, users.admin.password);
    await setAuthCookie(page, adminToken);

    await page.goto('/workschd/admin/dashboard');
    await page.waitForURL((url) => url.pathname.includes('/admin/dashboard'), { timeout: 15000 });
    expect(page.url()).toContain('/workschd/admin/dashboard');
    await expect(page.getByText('관리자 대시보드')).toBeVisible();
  });

  test('worker cannot open the admin dashboard', async ({ page, request }) => {
    const workerToken = await apiLogin(request, users.worker.email, users.worker.password);
    await setAuthCookie(page, workerToken);

    await page.goto('/workschd/admin/dashboard');
    await page.waitForURL(
      (url) => url.pathname.includes('/403') || url.pathname.includes('/login'),
      { timeout: 15000 },
    );
    const path = new URL(page.url()).pathname;
    expect(path.includes('/403') || path.includes('/login')).toBeTruthy();
  });
});
