import { type SimpleGit } from 'simple-git';
import {
  cloneRepo as githubClone,
  createBranch as githubBranch,
  pushAndCreatePR as githubPushPR,
  cleanupWorkdir as githubCleanup,
  getRepoTree,
  getRecentLog,
} from './github-client';
import {
  cloneGitlabRepo,
  createGitlabBranch,
  pushAndCreateMR,
  cleanupGitlabWorkdir,
} from './gitlab-client';

export interface ProviderClient {
  cloneRepo(repoFullName: string, webUrl: string, runId: string): Promise<{ workdir: string; git: SimpleGit }>;
  createBranch(git: SimpleGit, branchName: string): Promise<void>;
  pushAndCreate(
    workdir: string,
    repoFullName: string,
    webUrl: string,
    branchName: string,
    baseBranch: string,
    title: string,
    body: string,
  ): Promise<{ prNumber: number; prUrl: string; headSha: string }>;
  cleanupWorkdir(runId: string): Promise<void>;
  getRepoTree(workdir: string): Promise<string>;
  getRecentLog(workdir: string): Promise<string>;
}

export function getProviderClient(
  provider: { type: string; baseUrl: string; token: string } | null,
): ProviderClient {
  if (provider?.type === 'GITLAB') {
    const { token } = provider;
    return {
      cloneRepo:      (_fullName, webUrl, runId) => cloneGitlabRepo(webUrl, token, runId),
      createBranch:   (git, branch) => createGitlabBranch(git, branch),
      pushAndCreate:  (workdir, fullName, webUrl, branch, base, title, body) =>
                        pushAndCreateMR(workdir, webUrl, token, fullName, branch, base, title, body),
      cleanupWorkdir: (runId) => cleanupGitlabWorkdir(runId),
      getRepoTree:    (workdir) => getRepoTree(workdir),
      getRecentLog:   (workdir) => getRecentLog(workdir),
    };
  }

  // Default: GitHub App auth (existing behaviour, untouched)
  return {
    cloneRepo:      (fullName, _webUrl, runId) => githubClone(fullName, runId),
    createBranch:   (git, branch) => githubBranch(git, branch),
    pushAndCreate:  (_workdir, fullName, _webUrl, branch, base, title, body) =>
                      githubPushPR(fullName, branch, base, title, body),
    cleanupWorkdir: (runId) => githubCleanup(runId),
    getRepoTree:    (workdir) => getRepoTree(workdir),
    getRecentLog:   (workdir) => getRecentLog(workdir),
  };
}
