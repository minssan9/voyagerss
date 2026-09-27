import { test, expect, apiLogin, authHeaders, users } from './fixtures';

const apiBase = process.env.E2E_API_BASE_URL || 'http://localhost:9002';

test.describe('M3 shop and schedule config', () => {
  test('shop CRUD and schedule config save/reload', async ({ request }) => {
    const leaderToken = await apiLogin(request, users.leader.email, users.leader.password);
    const headers = await authHeaders(leaderToken);

    const teamsRes = await request.get(`${apiBase}/workschd/team`, { headers });
    const team = (await teamsRes.json()).content[0];

    const createShop = await request.post(`${apiBase}/workschd/team/${team.id}/shop`, {
      headers,
      data: {
        name: `E2E Shop ${Date.now()}`,
        district: 'Test',
        status: 'ACTIVE',
        address: '123 Test St',
      },
    });
    expect(createShop.ok()).toBeTruthy();
    const shop = await createShop.json();

    const listShops = await request.get(`${apiBase}/workschd/team/${team.id}/shop`, { headers });
    expect(listShops.ok()).toBeTruthy();
    const shops = await listShops.json();
    expect(shops.some((s: { id: number }) => s.id === shop.id)).toBeTruthy();

    const updateShop = await request.put(`${apiBase}/workschd/team/${team.id}/shop/${shop.id}`, {
      headers,
      data: { ...shop, name: `${shop.name} Updated` },
    });
    expect(updateShop.ok()).toBeTruthy();

    const configPayload = {
      minStaffPerDay: { MONDAY: 2, TUESDAY: 2, WEDNESDAY: 2, THURSDAY: 2, FRIDAY: 2, SATURDAY: 1, SUNDAY: 1 },
      maxOffDaysPerMonth: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5, 10: 5, 11: 5, 12: 5 },
      additionalOptions: {
        allowWeekendWork: false,
        enforceMinimumRest: true,
        maxConsecutiveWorkDays: 4,
        scheduleGenerationFrequency: 'WEEKLY',
      },
    };

    const saveConfig = await request.post(`${apiBase}/workschd/team/${team.id}/schedule-config`, {
      headers,
      data: configPayload,
    });
    expect(saveConfig.ok()).toBeTruthy();

    const loadConfig = await request.get(`${apiBase}/workschd/team/${team.id}/schedule-config`, { headers });
    expect(loadConfig.ok()).toBeTruthy();
    const loaded = await loadConfig.json();
    expect(loaded.teamId).toBe(team.id);

    const deleteShop = await request.delete(`${apiBase}/workschd/team/${team.id}/shop/${shop.id}`, { headers });
    expect(deleteShop.ok()).toBeTruthy();
  });
});
