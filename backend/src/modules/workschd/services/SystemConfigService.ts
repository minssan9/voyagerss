import { Injectable } from '@nestjs/common';
import { workschdPrisma as prisma } from '../../../config/prisma';
import { configService, ConfigSetOptions } from '../../../config/config-service';

export interface ConfigListItem {
  key: string;
  isEncrypted: boolean;
  description?: string | null;
  category: string;
  updatedBy?: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface ConfigDetailItem extends ConfigListItem {
  value: string;
}

@Injectable()
export class SystemConfigService {
  async listConfigs(category?: string): Promise<ConfigListItem[]> {
    const rows = await prisma.systemConfig.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return rows.map((r) => ({
      key: r.key,
      isEncrypted: r.isEncrypted,
      description: r.description,
      category: r.category,
      updatedBy: r.updatedBy,
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
    }));
  }

  async getConfig(key: string): Promise<ConfigDetailItem | null> {
    const row = await prisma.systemConfig.findUnique({ where: { key } });
    if (!row) return null;

    // Return the decrypted value from the in-memory cache (already decrypted by ConfigService)
    const value = configService.get(key) ?? '';

    return {
      key: row.key,
      value,
      isEncrypted: row.isEncrypted,
      description: row.description,
      category: row.category,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    };
  }

  async upsertConfig(
    key: string,
    value: string,
    options: ConfigSetOptions,
    updatedBy: string
  ): Promise<void> {
    await configService.set(key, value, { ...options, updatedBy });
  }

  async deleteConfig(key: string): Promise<void> {
    await configService.delete(key);
  }

  async reloadAll(): Promise<void> {
    await configService.reload();
  }

  async getCategories(): Promise<string[]> {
    const rows = await prisma.systemConfig.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  async getPublicFrontendConfig(): Promise<Record<string, string>> {
    const rows = await prisma.systemConfig.findMany({
      where: { category: 'frontend' },
      select: { key: true },
    });
    return Object.fromEntries(
      rows.map((r) => [r.key, configService.get(r.key) ?? ''])
    );
  }
}
