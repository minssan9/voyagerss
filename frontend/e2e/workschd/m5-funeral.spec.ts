import { test, expect, apiLogin, authHeaders, mockScrapeApi, users } from './fixtures';

const apiBase = process.env.E2E_API_BASE_URL || 'http://localhost:9002';

test.describe('M5 funeral board', () => {
  test('board list with mocked scrape API and link-task', async ({ page, request }) => {
    const leaderToken = await apiLogin(request, users.leader.email, users.leader.password);
    const headers = await authHeaders(leaderToken);

    await mockScrapeApi(page);

    const funerals = await request.get(`${apiBase}/workschd/scraped-funerals`, { headers });
    expect(funerals.ok()).toBeTruthy();

    await page.goto('/workschd/m/board');
    await expect(page.getByText('빈소 현황')).toBeVisible();

    const linkRes = await request.post(`${apiBase}/workschd/scraped-funerals/101/link-task`, {
      headers,
      data: { taskId: 1 },
    });
    expect(linkRes.ok()).toBeTruthy();
  });
});
