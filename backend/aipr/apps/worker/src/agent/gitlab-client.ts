import { simpleGit } from 'simple-git';
// @ts-ignore
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import { URL } from 'url';

function buildAuthUrl(webUrl: string, token: string): string {
  const parsed = new URL(webUrl);
  parsed.username = 'oauth2';
  parsed.password = encodeURIComponent(token);
  return parsed.toString().replace(/\.git$/, '') + '.git';
}

export async function cloneGitlabRepo(webUrl: string, token: string, runId: string, depth = 50) {
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

export async function createBranch(git: ReturnType<typeof simpleGit>, branchName: string) {
  await git.checkoutLocalBranch(branchName);
}

export async function pushAndCreateMR(
  workdir: string, webUrl: string, token: string,
  repoFullName: string, branchName: string, baseBranch: string,
  title: string, body: string,
) {
  const repoGit = simpleGit(workdir);
  await repoGit.remote(['set-url', 'origin', buildAuthUrl(webUrl, token)]);
  await repoGit.push('origin', branchName);
  const log = await repoGit.log(['-1']);
  const headSha = log.latest?.hash ?? '';
  const parsed = new URL(webUrl);
  const baseUrl = `${parsed.protocol}//${parsed.host}`;
  const encodedPath = encodeURIComponent(repoFullName);
  const res = await fetch(`${baseUrl}/api/v4/projects/${encodedPath}/merge_requests`, {
    method: 'POST',
    headers: { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_branch: branchName, target_branch: baseBranch,
      title, description: body, remove_source_branch: true,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GitLab MR creation failed (${res.status}): ${errBody.slice(0, 300)}`);
  }
  const mr = await res.json() as any;
  return { prNumber: mr.iid, prUrl: mr.web_url, headSha };
}

export async function cleanupWorkdir(runId: string) {
  await fs.rm(path.join('/tmp/workspaces', runId), { recursive: true, force: true });
}

export async function getRepoTree(workdir: string, maxFiles = 200) {
  const git = simpleGit(workdir);
  const result = await git.raw(['ls-files', '--cached', '-z']);
  return result.split('\0').filter(Boolean).slice(0, maxFiles).join('\n');
}

export async function getRecentLog(workdir: string, n = 10) {
  const git = simpleGit(workdir);
  const l = await git.log([`-${n}`, '--oneline']);
  return l.all.map((c) => `${c.hash.slice(0, 7)} ${c.message}`).join('\n');
}
