import { simpleGit, type SimpleGit } from 'simple-git';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

function buildAuthUrl(webUrl: string, token: string): string {
  const parsed = new URL(webUrl);
  parsed.username = 'oauth2';
  parsed.password = encodeURIComponent(token);
  return parsed.toString().replace(/\.git$/, '') + '.git';
}

export async function cloneGitlabRepo(
  webUrl: string,
  token: string,
  runId: string,
  depth = 50,
): Promise<{ workdir: string; git: SimpleGit }> {
  const workdir = path.join('/tmp/workspaces', runId);
  await fs.mkdir(workdir, { recursive: true });
  const cloneUrl = buildAuthUrl(webUrl, token);
  const git = simpleGit();
  await git.clone(cloneUrl, workdir, ['--depth', String(depth)]);
  const repoGit = simpleGit(workdir);
  await repoGit.addConfig('user.email', 'auto-pr-bot@example.com');
  await repoGit.addConfig('user.name', 'Auto-PR Bot');
  await repoGit.remote(['set-url', 'origin', cloneUrl]);
  return { workdir, git: repoGit };
}

export async function createGitlabBranch(git: SimpleGit, branchName: string): Promise<void> {
  await git.checkoutLocalBranch(branchName);
}

export async function pushAndCreateMR(
  workdir: string,
  webUrl: string,
  token: string,
  repoFullName: string,
  branchName: string,
  baseBranch: string,
  title: string,
  body: string,
): Promise<{ prNumber: number; prUrl: string; headSha: string }> {
  const repoGit = simpleGit(workdir);
  const authUrl = buildAuthUrl(webUrl, token);
  await repoGit.remote(['set-url', 'origin', authUrl]);
  await repoGit.push('origin', branchName);

  const log = await repoGit.log(['-1']);
  const headSha = log.latest?.hash ?? '';

  const parsed = new URL(webUrl);
  const baseUrl = `${parsed.protocol}//${parsed.host}`;
  const encodedPath = encodeURIComponent(repoFullName);

  const { data: mr } = await axios.post(
    `${baseUrl}/api/v4/projects/${encodedPath}/merge_requests`,
    {
      source_branch: branchName,
      target_branch: baseBranch,
      title,
      description: body,
      remove_source_branch: true,
    },
    { headers: { 'PRIVATE-TOKEN': token } },
  );

  return { prNumber: mr.iid, prUrl: mr.web_url, headSha };
}

export async function cleanupGitlabWorkdir(runId: string): Promise<void> {
  await fs.rm(path.join('/tmp/workspaces', runId), { recursive: true, force: true });
}
