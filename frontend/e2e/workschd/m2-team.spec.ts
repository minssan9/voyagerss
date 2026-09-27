import { test, expect, apiLogin, authHeaders, users } from './fixtures';

const apiBase = process.env.E2E_API_BASE_URL || 'http://localhost:9002';

test.describe('M2 team join request flow', () => {
  test('invite pending, approve adds member, reject removes pending', async ({ request }) => {
    const leaderToken = await apiLogin(request, users.leader.email, users.leader.password);

    const teamsRes = await request.get(`${apiBase}/workschd/team`, {
      headers: await authHeaders(leaderToken),
    });
    expect(teamsRes.ok()).toBeTruthy();
    const teamsBody = await teamsRes.json();
    const team = teamsBody.content?.[0];
    expect(team).toBeTruthy();

    const inviteRes = await request.post(`${apiBase}/workschd/team/generate-invite`, {
      headers: await authHeaders(leaderToken),
      data: { teamId: team.id },
    });
    expect(inviteRes.ok()).toBeTruthy();
    const invite = await inviteRes.json();
    expect(invite.invitationHash).toBeTruthy();

    const joinEmail = `join-${Date.now()}@example.com`;
    await request.post(`${apiBase}/workschd/auth/signup`, {
      data: { email: joinEmail, password: users.worker.password, username: 'join-applicant' },
    });
    const applicantToken = await apiLogin(request, joinEmail, users.worker.password);

    const membersBefore = await request.get(`${apiBase}/workschd/team/${team.id}/members`, {
      headers: await authHeaders(leaderToken),
    });
    const membersBeforeBody = await membersBefore.json();
    const applicantMemberBefore = membersBeforeBody.content?.find(
      (m: { email: string }) => m.email === joinEmail,
    );
    expect(applicantMemberBefore).toBeFalsy();

    const joinRes = await request.get(`${apiBase}/workschd/team/join/${invite.invitationHash}`, {
      headers: await authHeaders(applicantToken),
    });
    expect(joinRes.ok()).toBeTruthy();
    const joinBody = await joinRes.json();
    expect(joinBody.result).toBe('SUCCESS');
    expect(joinBody.data.status).toBe('pending');

    const pendingRes = await request.get(`${apiBase}/workschd/team/${team.id}/join-requests`, {
      headers: await authHeaders(leaderToken),
    });
    expect(pendingRes.ok()).toBeTruthy();
    const pendingBody = await pendingRes.json();
    expect(pendingBody.data.some((r: { email: string }) => r.email === joinEmail)).toBeTruthy();

    const requestId = joinBody.data.requestId;
    const approveRes = await request.post(`${apiBase}/workschd/team/${team.id}/approve/${requestId}`, {
      headers: await authHeaders(leaderToken),
    });
    expect(approveRes.ok()).toBeTruthy();

    const membersAfter = await request.get(`${apiBase}/workschd/team/${team.id}/members`, {
      headers: await authHeaders(leaderToken),
    });
    const membersAfterBody = await membersAfter.json();
    expect(
      membersAfterBody.content?.some((m: { email: string }) => m.email === joinEmail),
    ).toBeTruthy();

    const invite2 = await request.post(`${apiBase}/workschd/team/generate-invite`, {
      headers: await authHeaders(leaderToken),
      data: { teamId: team.id },
    });
    const invite2Body = await invite2.json();

    const signupEmail = `reject-${Date.now()}@example.com`;
    const signupRes = await request.post(`${apiBase}/workschd/auth/signup`, {
      data: {
        email: signupEmail,
        password: users.worker.password,
        username: 'reject-user',
      },
    });
    expect(signupRes.ok()).toBeTruthy();
    const rejectUserToken = await apiLogin(request, signupEmail, users.worker.password);

    const join2 = await request.get(`${apiBase}/workschd/team/join/${invite2Body.invitationHash}`, {
      headers: await authHeaders(rejectUserToken),
    });
    expect(join2.ok()).toBeTruthy();
    const join2Body = await join2.json();

    const rejectRes = await request.post(
      `${apiBase}/workschd/team/${team.id}/reject/${join2Body.data.requestId}`,
      { headers: await authHeaders(leaderToken) },
    );
    expect(rejectRes.ok()).toBeTruthy();
    const rejectBody = await rejectRes.json();
    expect(rejectBody.data.status).toBe('REJECTED');
  });
});
