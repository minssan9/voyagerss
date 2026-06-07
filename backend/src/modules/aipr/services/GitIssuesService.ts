import axios from 'axios';
import { aiprPrisma as prisma } from '../../../config/prisma';

export class GitIssuesService {
  async fetchRemoteIssues(repositoryId: number) {
    const repo = await prisma.repository.findUniqueOrThrow({
      where: { id: repositoryId },
      include: { provider: true },
    });
    const { provider } = repo;

    if (provider.type === 'GITLAB') {
      const encodedPath = encodeURIComponent(repo.fullName);
      const { data: issues } = await axios.get(
        `${provider.baseUrl}/api/v4/projects/${encodedPath}/issues?state=opened&per_page=50`,
        { headers: { 'PRIVATE-TOKEN': provider.token } },
      );
      return issues.map((i: any) => ({
        number: i.iid,
        title: i.title,
        body: i.description || '',
        state: i.state,
        labels: (i.labels || []).map((l: any) => l.name || l),
        author: i.author?.username,
        createdAt: i.created_at,
        url: i.web_url,
      }));
    }

    if (provider.type === 'GITHUB') {
      const [owner, repoName] = repo.fullName.split('/');
      const { data: issues } = await axios.get(
        `https://api.github.com/repos/${owner}/${repoName}/issues?state=open&per_page=50`,
        {
          headers: {
            Authorization: `Bearer ${provider.token}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );
      return issues
        .filter((i: any) => !i.pull_request)
        .map((i: any) => ({
          number: i.number,
          title: i.title,
          body: i.body || '',
          state: i.state,
          labels: (i.labels || []).map((l: any) => l.name),
          author: i.user?.login,
          createdAt: i.created_at,
          url: i.html_url,
        }));
    }

    throw new Error(`Unsupported provider type: ${provider.type}`);
  }

  async importIssue(repositoryId: number, issueNumber: number) {
    const repo = await prisma.repository.findUniqueOrThrow({
      where: { id: repositoryId },
      include: { provider: true },
    });

    const existing = await prisma.issue.findFirst({
      where: { repositoryId, sourceIssueNumber: issueNumber },
    });
    if (existing) {
      throw Object.assign(new Error(`Issue #${issueNumber} already imported as ${existing.id}`), {
        status: 409,
      });
    }

    const issues = await this.fetchRemoteIssues(repositoryId);
    const remoteIssue = issues.find((i: any) => i.number === issueNumber);
    if (!remoteIssue) {
      throw Object.assign(new Error(`Issue #${issueNumber} not found in ${repo.fullName}`), {
        status: 404,
      });
    }

    return prisma.issue.create({
      data: {
        title: remoteIssue.title,
        body: remoteIssue.body || '',
        repoFullName: repo.fullName,
        baseBranch: repo.defaultBranch,
        sourceUrl: remoteIssue.url,
        repositoryId,
        sourceIssueNumber: issueNumber,
        labels: remoteIssue.labels,
      },
    });
  }
}

export const gitIssuesService = new GitIssuesService();
