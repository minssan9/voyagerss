import axios from 'axios';
import { aiprPrisma as prisma } from '../../../config/prisma';
import { ProviderType } from '@prisma/client-aipr';

export class GitProviderService {
  async listProviders() {
    const providers = await prisma.gitProvider.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { repositories: true } } },
    });
    return providers.map((p) => ({ ...p, token: this.maskToken(p.token) }));
  }

  async createProvider(dto: {
    type: string;
    displayName: string;
    baseUrl: string;
    token: string;
  }) {
    const { type, displayName, baseUrl, token } = dto;
    const provider = await prisma.gitProvider.create({
      data: {
        type: type as ProviderType,
        displayName,
        baseUrl: baseUrl.replace(/\/$/, ''),
        token,
      },
    });
    return { ...provider, token: this.maskToken(provider.token) };
  }

  async updateProvider(
    id: number,
    dto: Partial<{ displayName: string; baseUrl: string; token: string }>,
  ) {
    const provider = await prisma.gitProvider.update({ where: { id }, data: dto });
    return { ...provider, token: this.maskToken(provider.token) };
  }

  async deleteProvider(id: number) {
    await prisma.gitProvider.delete({ where: { id } });
  }

  async testConnection(id: number) {
    const provider = await prisma.gitProvider.findUniqueOrThrow({ where: { id } });

    if (provider.type === 'GITLAB') {
      const { data: user } = await axios.get(`${provider.baseUrl}/api/v4/user`, {
        headers: { 'PRIVATE-TOKEN': provider.token },
      });
      return { ok: true, login: user.username, name: user.name };
    }

    throw new Error(`Provider type ${provider.type} test not supported via PAT`);
  }

  async getProviderWithToken(id: number) {
    return prisma.gitProvider.findUniqueOrThrow({ where: { id } });
  }

  private maskToken(token: string): string {
    if (!token || token.length < 8) return '***';
    return token.slice(0, 4) + '****' + token.slice(-4);
  }
}

export const gitProviderService = new GitProviderService();
