/**
 * 외부 API mock — nock 으로 GitHub + Anthropic HTTP 요청을 인터셉트.
 *
 * globalSetup 에서 한 번 활성화, globalTeardown 에서 정리됨.
 * Worker 프로세스가 같은 Node.js 프로세스가 아닐 경우 nock 은 동작하지 않음에 주의.
 * → Worker 를 별도 프로세스로 구동한다면 GITHUB_BASE_URL / ANTHROPIC_BASE_URL 환경변수로
 *    mock HTTP 서버 주소를 주입하거나, Wiremock 등 외부 stub 서버를 사용한다.
 *
 * 이 파일은 integration 레벨(API + Worker 같은 프로세스) 테스트에서도 재사용 가능.
 */
import nock from 'nock';

export const MOCK_PR_NUMBER = 42;
export const MOCK_PR_URL    = 'https://github.com/test-owner/test-repo/pull/42';
export const MOCK_HEAD_SHA  = 'abc1234567890';
export const MOCK_PLAN_MD   = `# Plan\n\n## Goal\nFix reported bug.\n\n## Steps\n1. Edit src/index.ts\n2. Add test\n\n## Risk\nLow`;

/** GitHub App installation token */
export function mockGitHubInstallationToken() {
  nock('https://api.github.com')
    .post(/\/app\/installations\/\d+\/access_tokens/)
    .reply(201, {
      token:      'ghs_mock_installation_token',
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    })
    .persist();
}

/** GitHub: create branch (ref) */
export function mockGitHubCreateRef() {
  nock('https://api.github.com')
    .post(/\/repos\/.+\/.+\/git\/refs/)
    .reply(201, { ref: 'refs/heads/feat/issue-test-fix' })
    .persist();
}

/** GitHub: create pull request */
export function mockGitHubCreatePR() {
  nock('https://api.github.com')
    .post(/\/repos\/.+\/.+\/pulls/)
    .reply(201, {
      number:   MOCK_PR_NUMBER,
      html_url: MOCK_PR_URL,
      head:     { sha: MOCK_HEAD_SHA },
      state:    'open',
    })
    .persist();
}

/** GitHub: get repository tree */
export function mockGitHubRepoTree() {
  nock('https://api.github.com')
    .get(/\/repos\/.+\/.+\/git\/trees\/HEAD/)
    .query(true)
    .reply(200, {
      tree: [
        { path: 'src/index.ts',   type: 'blob' },
        { path: 'src/utils.ts',   type: 'blob' },
        { path: 'package.json',   type: 'blob' },
      ],
      truncated: false,
    })
    .persist();
}

/** GitHub: get recent commit log */
export function mockGitHubCommits() {
  nock('https://api.github.com')
    .get(/\/repos\/.+\/.+\/commits/)
    .query(true)
    .reply(200, [
      { sha: 'abc123', commit: { message: 'fix: previous bug\n' } },
    ])
    .persist();
}

/** Anthropic Messages API (Plan 생성) */
export function mockAnthropicMessages() {
  nock('https://api.anthropic.com')
    .post('/v1/messages')
    .reply(200, {
      id:      'msg_mock_plan',
      type:    'message',
      role:    'assistant',
      content: [{ type: 'text', text: MOCK_PLAN_MD }],
      model:   'claude-opus-4-6',
      usage:   { input_tokens: 500, output_tokens: 300 },
      stop_reason: 'end_turn',
    })
    .persist();
}

/** 모든 mock 활성화 */
export function activateAllMocks() {
  nock.cleanAll();
  mockGitHubInstallationToken();
  mockGitHubCreateRef();
  mockGitHubCreatePR();
  mockGitHubRepoTree();
  mockGitHubCommits();
  mockAnthropicMessages();
}

/** 모든 mock 정리 */
export function cleanupMocks() {
  nock.cleanAll();
  nock.restore();
}
