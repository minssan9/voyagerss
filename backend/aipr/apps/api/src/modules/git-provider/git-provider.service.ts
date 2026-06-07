import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// @ts-ignore
import fetch from 'node-fetch';

@Injectable()
export class GitProviderService {
  constructor(private readonly prisma: PrismaService) {}

  async listProviders() {
    const providers = await this.prisma.gitProvider.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { repositories: true } } },
    });
    return providers.map((p) => ({ ...p, token: this._maskToken(p.token) }));
  }

  async createProvider(dto: { type: string; displayName: string; baseUrl: string; token: string }) {
    const { type, displayName, baseUrl, token } = dto;
    const provider = await this.prisma.gitProvider.create({
      data: { type: type as any, displayName, baseUrl: baseUrl.replace(/\/$/, ''), token },
    });
    return { ...provider, token: this._maskToken(provider.token) };
  }

  async updateProvider(id: number, dto: Partial<{ displayName: string; baseUrl: string; token: string }>) {
    const provider = await this.prisma.gitProvider.update({ where: { id }, data: dto });
    return { ...provider, token: this._maskToken(provider.token) };
  }

  async deleteProvider(id: number) {
    await this.prisma.gitProvider.delete({ where: { id } });
  }

  async testConnection(id: number) {
    const provider = await this.prisma.gitProvider.findUniqueOrThrow({ where: { id } });
    if (provider.type === 'GITLAB') {
      const url = `${provider.baseUrl}/api/v4/user`;
      const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': provider.token } });
      if (!res.ok) {
        const body = await res.text();
        throw new BadRequestException(`GitLab responded ${res.status}: ${body.slice(0, 200)}`);
      }
      const user = await res.json() as any;
      return { ok: true, login: user.username, name: user.name };
    }
    throw new BadRequestException(`Provider type ${provider.type} test not supported via PAT`);
  }

  async getProviderWithToken(id: number) {
    return this.prisma.gitProvider.findUniqueOrThrow({ where: { id } });
  }

  private _maskToken(token: string): string {
    if (!token || token.length < 8) return '***';
    return token.slice(0, 4) + '****' + token.slice(-4);
  }
}
