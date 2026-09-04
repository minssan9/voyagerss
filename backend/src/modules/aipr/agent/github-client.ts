import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { simpleGit, type SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { aiprConfigService } from '../../../config/aipr-config-service';

// ── Installation token cache (1h TTL) ────────────────────────────────────────
interface CachedToken { token: string; expiresAt: number; }
const tokenCache = new Map<number, CachedToken>();

function getAppAuth() {
  return createAppAuth({
    appId:      aiprConfigService.getRequired('GITHUB_APP_ID'),
    privateKey: Buffer.from(aiprConfigService.getRequired('GITHUB_APP_PRIVATE_KEY_BASE64'), 'base64').toString('utf8'),
    clientId:   aiprConfigService.get('GITHUB_APP_CLIENT_ID'),
    clientSecret: aiprConfigService.get('GITHUB_APP_CLIENT_SECRET'),
  });
}

async function getInstallationToken(installationId: number): Promise<string> {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const auth = getAppAuth();
  const { token, expiresAt } = await auth({ type: 'installation', installationId });
  tokenCache.set(installationId, { token, expiresAt: new Date(expiresAt).getTime() });
  return token;
}

function parseRepoFullName(repoFullName: string): { owner: string; repo: string } {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repoFullName: ${repoFullName}`);
  }
  return { owner, repo };
}

async function getInstallationId(repoFullName: string): Promise<number> {
  const auth = getAppAuth();
  const jwt  = await auth({ type: 'app' });
  const octokit = new Octokit({ auth: jwt.token });
  const { owner, repo } = parseRepoFullName(repoFullName);
  const { data } = await octokit.apps.getRepoInstallation({ owner, repo });
  return data.id;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface CloneResult { workdir: string; git: SimpleGit; }

export async function cloneRepo(
  repoFullName: string,
  runId: string,
  depth = 50,
): Promise<CloneResult> {
  const installationId = await getInstallationId(repoFullName);
  const token = await getInstallationToken(installationId);

  const workdir = path.join('/tmp/workspaces', runId);
  await fs.mkdir(workdir, { recursive: true });

  const cloneUrl = `https://x-access-token:${token}@github.com/${repoFullName}.git`;
  const git = simpleGit();
  await git.clone(cloneUrl, workdir, ['--depth', String(depth)]);

  const repoGit = simpleGit(workdir);
  await repoGit.addConfig('user.email', 'auto-pr-bot@example.com');
  await repoGit.addConfig('user.name',  'Auto-PR Bot');

  return { workdir, git: repoGit };
}

export async function createBranch(
  git: SimpleGit,
  branchName: string,
): Promise<void> {
  await git.checkoutLocalBranch(branchName);
}

export async function pushAndCreatePR(
  repoFullName: string,
  branchName: string,
  baseBranch: string,
  title: string,
  body: string,
  draft = false,
): Promise<{ prNumber: number; prUrl: string; headSha: string }> {
  const installationId = await getInstallationId(repoFullName);
  const token = await getInstallationToken(installationId);
  const { owner, repo } = parseRepoFullName(repoFullName);

  const octokit = new Octokit({ auth: token });

  // Get latest commit SHA
  const { data: ref } = await octokit.git.getRef({
    owner, repo, ref: `heads/${branchName}`,
  });
  const headSha = ref.object.sha;

  // Create PR
  const { data: pr } = await octokit.pulls.create({
    owner, repo,
    title,
    body,
    head: branchName,
    base: baseBranch,
    draft,
  });

  return { prNumber: pr.number, prUrl: pr.html_url, headSha };
}

export async function cleanupWorkdir(runId: string): Promise<void> {
  const workdir = path.join('/tmp/workspaces', runId);
  await fs.rm(workdir, { recursive: true, force: true });
}

export async function getRepoTree(workdir: string, maxFiles = 200): Promise<string> {
  const git = simpleGit(workdir);
  const result = await git.raw(['ls-files', '--cached', '-z']);
  const files = result.split('\0').filter(Boolean).slice(0, maxFiles);
  return files.join('\n');
}

export async function getRecentLog(workdir: string, n = 10): Promise<string> {
  const git = simpleGit(workdir);
  return git.log([`-${n}`, '--oneline']).then((l) => l.all.map((c) => `${c.hash.slice(0,7)} ${c.message}`).join('\n'));
}
