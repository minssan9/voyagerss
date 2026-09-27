import { test, expect, apiLogin, authHeaders, users } from './fixtures';

const apiBase = process.env.E2E_API_BASE_URL || 'http://localhost:9002';

test.describe('M6 notifications and account schedule', () => {
  test('mark notification read, save profile and schedule preferences', async ({ request }) => {
    const workerToken = await apiLogin(request, users.worker.email, users.worker.password);
    const headers = await authHeaders(workerToken);

    const notifications = await request.get(`${apiBase}/workschd/notifications`, { headers });
    expect(notifications.ok()).toBeTruthy();
    const list = await notifications.json();
    const content = list.content ?? list;

    if (Array.isArray(content) && content.length > 0) {
      const markRead = await request.put(`${apiBase}/workschd/notifications/${content[0].id}/read`, {
        headers,
      });
      expect(markRead.ok()).toBeTruthy();
    }

    const profileUpdate = await request.put(`${apiBase}/workschd/accounts/profile`, {
      headers,
      data: { name: 'E2E Worker', phone: '010-9999-8888' },
    });
    expect(profileUpdate.ok()).toBeTruthy();

    const schedulePayload = {
      preferredDays: ['MONDAY', 'WEDNESDAY'],
      maxTasksPerWeek: 3,
    };

    const saveSchedule = await request.post(
      `${apiBase}/workschd/account/${users.worker.accountId}/schedule-preferences`,
      { headers, data: schedulePayload },
    );
    expect(saveSchedule.ok()).toBeTruthy();

    const loadSchedule = await request.get(
      `${apiBase}/workschd/account/${users.worker.accountId}/schedule-preferences`,
      { headers },
    );
    expect(loadSchedule.ok()).toBeTruthy();
  });
});
