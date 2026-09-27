import { test, expect, apiLogin, authHeaders, users } from './fixtures';

const apiBase = process.env.E2E_API_BASE_URL || 'http://localhost:9002';

test.describe('M4 task workflow', () => {
  test('apply, approve up to workerCount, overflow stays pending, check-in/out, complete', async ({ request }) => {
    const leaderToken = await apiLogin(request, users.leader.email, users.leader.password);
    const leaderHeaders = await authHeaders(leaderToken);

    const teamsRes = await request.get(`${apiBase}/workschd/team`, { headers: leaderHeaders });
    const team = (await teamsRes.json()).content[0];

    const shopsRes = await request.get(`${apiBase}/workschd/team/${team.id}/shop`, { headers: leaderHeaders });
    const shop = (await shopsRes.json())[0];

    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 172800000).toISOString();

    const createTask = await request.post(`${apiBase}/workschd/task`, {
      headers: leaderHeaders,
      data: {
        title: `E2E Task ${Date.now()}`,
        description: 'e2e',
        workerCount: 1,
        startDateTime: start,
        endDateTime: end,
        status: 'OPEN',
        teamId: team.id,
        shopId: shop.id,
      },
    });
    expect(createTask.ok()).toBeTruthy();
    const task = await createTask.json();

    const workerToken = await apiLogin(request, users.worker.email, users.worker.password);
    const workerHeaders = await authHeaders(workerToken);

    const applyRes = await request.post(`${apiBase}/workschd/task/${task.id}/request`, {
      headers: workerHeaders,
    });
    expect(applyRes.ok()).toBeTruthy();
    const application = await applyRes.json();
    expect(application.status).toBe('PENDING');

    const approveRes = await request.post(`${apiBase}/workschd/task/request/${application.id}/approve`, {
      headers: leaderHeaders,
    });
    expect(approveRes.ok()).toBeTruthy();

    const signupEmail = `extra-${Date.now()}@example.com`;
    await request.post(`${apiBase}/workschd/auth/signup`, {
      data: { email: signupEmail, password: users.worker.password, username: 'extra-worker' },
    });
    const extraToken = await apiLogin(request, signupEmail, users.worker.password);
    const extraHeaders = await authHeaders(extraToken);

    const extraApply = await request.post(`${apiBase}/workschd/task/${task.id}/request`, {
      headers: extraHeaders,
    });
    expect(extraApply.ok()).toBeTruthy();
    const extraApplication = await extraApply.json();

    const overflowApprove = await request.post(
      `${apiBase}/workschd/task/request/${extraApplication.id}/approve`,
      { headers: leaderHeaders },
    );
    expect(overflowApprove.status()).toBeGreaterThanOrEqual(400);

    const stillPending = await request.get(`${apiBase}/workschd/task/${task.id}/employees`, {
      headers: leaderHeaders,
    });
    const employees = await stillPending.json();
    const extraRow = employees.find((e: { id: number }) => e.id === extraApplication.id);
    expect(extraRow.status).toBe('PENDING');

    const checkIn = await request.post(`${apiBase}/workschd/task-employee/${application.id}/check-in`, {
      headers: workerHeaders,
    });
    expect(checkIn.ok()).toBeTruthy();
    expect((await checkIn.json()).joinedAt).toBeTruthy();

    const checkOut = await request.post(`${apiBase}/workschd/task-employee/${application.id}/check-out`, {
      headers: workerHeaders,
    });
    expect(checkOut.ok()).toBeTruthy();
    expect((await checkOut.json()).leftAt).toBeTruthy();

    const complete = await request.post(`${apiBase}/workschd/task/${task.id}/complete`, {
      headers: leaderHeaders,
    });
    expect(complete.ok()).toBeTruthy();
    expect((await complete.json()).status).toBe('COMPLETED');
  });
});
