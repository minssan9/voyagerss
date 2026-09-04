import { simpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import axios from 'axios';

jest.mock('simple-git');
jest.mock('fs/promises');
jest.mock('axios');

const mockGit = {
  clone: jest.fn().mockResolvedValue(undefined),
  addConfig: jest.fn().mockResolvedValue(undefined),
  remote: jest.fn().mockResolvedValue(undefined),
  push: jest.fn().mockResolvedValue(undefined),
  log: jest.fn().mockResolvedValue({ latest: { hash: 'abc1234567890' } }),
  raw: jest.fn().mockResolvedValue('src/foo.ts\0src/bar.ts\0'),
  checkoutLocalBranch: jest.fn().mockResolvedValue(undefined),
};
(simpleGit as jest.Mock).mockReturnValue(mockGit);

import {
  cloneGitlabRepo,
  createGitlabBranch,
  pushAndCreateMR,
  cleanupGitlabWorkdir,
} from './gitlab-client';

beforeEach(() => {
  jest.clearAllMocks();
  (simpleGit as jest.Mock).mockReturnValue(mockGit);
  (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
  (fs.rm as jest.Mock).mockResolvedValue(undefined);
});

describe('cloneGitlabRepo', () => {
  it('clones with oauth2 PAT embedded in URL', async () => {
    await cloneGitlabRepo('https://gitlab.com/group/repo', 'glpat-secret', 'run-001');

    expect(mockGit.clone).toHaveBeenCalledTimes(1);
    const cloneUrl = mockGit.clone.mock.calls[0][0] as string;
    expect(cloneUrl).toMatch(/oauth2:/);
    expect(cloneUrl).toMatch(/glpat-secret/);
    expect(cloneUrl).toMatch(/\.git$/);
  });

  it('creates workdir and returns workdir + git', async () => {
    const result = await cloneGitlabRepo('https://gitlab.com/group/repo', 'token', 'run-002');

    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('run-002'), { recursive: true });
    expect(result.workdir).toContain('run-002');
    expect(result.git).toBeDefined();
  });

  it('configures git user identity', async () => {
    await cloneGitlabRepo('https://gitlab.com/group/repo', 'token', 'run-003');
    expect(mockGit.addConfig).toHaveBeenCalledWith('user.email', 'auto-pr-bot@example.com');
    expect(mockGit.addConfig).toHaveBeenCalledWith('user.name', 'Auto-PR Bot');
  });
});

describe('createGitlabBranch', () => {
  it('checks out a local branch', async () => {
    await createGitlabBranch(mockGit as any, 'feat/my-branch');
    expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('feat/my-branch');
  });
});

describe('pushAndCreateMR', () => {
  it('POSTs to GitLab MR endpoint and returns prNumber + prUrl', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { iid: 42, web_url: 'https://gitlab.com/group/repo/-/merge_requests/42' },
    });

    const result = await pushAndCreateMR(
      '/tmp/workspaces/run-004',
      'https://gitlab.com/group/repo',
      'glpat-token',
      'group/repo',
      'feat/issue-abc',
      'main',
      '[Auto-MR] fix bug',
      'Automated MR',
    );

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, , config] = (axios.post as jest.Mock).mock.calls[0];
    expect(url).toContain('/api/v4/projects/');
    expect(url).toContain('merge_requests');
    expect(config.headers['PRIVATE-TOKEN']).toBe('glpat-token');
    expect(result.prNumber).toBe(42);
    expect(result.prUrl).toContain('merge_requests/42');
  });

  it('propagates axios error on API failure', async () => {
    (axios.post as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Request failed with status code 422'), { response: { status: 422 } }),
    );

    await expect(
      pushAndCreateMR('/tmp/workspaces/run-005', 'https://gitlab.com/g/r', 'token', 'g/r', 'feat/x', 'main', 'title', 'body'),
    ).rejects.toThrow('422');
  });
});

describe('cleanupGitlabWorkdir', () => {
  it('removes workspace directory', async () => {
    await cleanupGitlabWorkdir('run-006');
    expect(fs.rm).toHaveBeenCalledWith(expect.stringContaining('run-006'), { recursive: true, force: true });
  });
});
