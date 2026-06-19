import axios from 'axios';
import { aiprPrisma as prisma } from '../../../config/prisma';
import { gitProviderService } from './GitProviderService';

export class RepositoriesService {
  async listRepositories(providerId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.repository.findMany({
        where: { providerId },
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
      }),
      prisma.repository.count({ where: { providerId } }),
    ]);
    return { items, total, page, limit };
  }

  async updateAutoPilot(repoId: number, autoPilot: boolean) {
    return prisma.repository.update({
      where: { id: repoId },
      data:  { autoPilot },
    });
  }

  async syncRepositories(providerId: number) {
    const provider = await gitProviderService.getProviderWithToken(providerId);
    let remoteRepos: Array<{
      remoteId: number | string;
      fullName: string;
      defaultBranch: string;
      isPrivate: boolean;
      description: string | null;
      webUrl: string;
    }> = [];

    if (provider.type === 'GITLAB') {
      remoteRepos = await this.fetchGitlabProjects(provider.baseUrl, provider.token);
    } else if (provider.type === 'GITHUB') {
      remoteRepos = await this.fetchGithubRepos(provider.token);
    } else {
      throw new Error(`Unsupported provider type: ${provider.type}`);
    }

    let upsertCount = 0;
    for (const repo of remoteRepos) {
      await prisma.repository.upsert({
        where: { providerId_remoteId: { providerId, remoteId: String(repo.remoteId) } },
        create: {
          providerId,
          remoteId: String(repo.remoteId),
          fullName: repo.fullName,
          defaultBranch: repo.defaultBranch || 'main',
          isPrivate: repo.isPrivate,
          description: repo.description || null,
          webUrl: repo.webUrl,
          syncedAt: new Date(),
        },
        update: {
          fullName: repo.fullName,
          defaultBranch: repo.defaultBranch || 'main',
          isPrivate: repo.isPrivate,
          description: repo.description || null,
          webUrl: repo.webUrl,
          syncedAt: new Date(),
        },
      });
      upsertCount++;
    }

    return { synced: upsertCount };
  }

  private async fetchGitlabProjects(baseUrl: string, token: string) {
    const results: any[] = [];
    let page = 1;
    while (true) {
      const { data: projects } = await axios.get(
        `${baseUrl}/api/v4/projects?membership=true&per_page=100&page=${page}`,
        { headers: { 'PRIVATE-TOKEN': token } },
      );
      if (!projects.length) break;
      for (const p of projects) {
        results.push({
          remoteId: p.id,
          fullName: p.path_with_namespace,
          defaultBranch: p.default_branch || 'main',
          isPrivate: p.visibility !== 'public',
          description: p.description,
          webUrl: p.web_url,
        });
      }
      if (projects.length < 100) break;
      page++;
    }
    return results;
  }

  private async fetchGithubRepos(token: string) {
    const results: any[] = [];
    let page = 1;
    while (true) {
      const { data: repos } = await axios.get(
        `https://api.github.com/user/repos?per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );
      if (!repos.length) break;
      for (const r of repos) {
        results.push({
          remoteId: r.id,
          fullName: r.full_name,
          defaultBranch: r.default_branch || 'main',
          isPrivate: r.private,
          description: r.description,
          webUrl: r.html_url,
        });
      }
      if (repos.length < 100) break;
      page++;
    }
    return results;
  }
}

export const repositoriesService = new RepositoriesService();
