import { aiprPrisma as prisma } from '../../../config/prisma';
import { aiprConfigService } from '../../../config/aipr-config-service';
import { ConfigSetOptions } from '../../../config/config-service';

export interface AiprConfigListItem {
  key: string;
  isEncrypted: boolean;
  description?: string | null;
  category: string;
  updatedBy?: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface AiprConfigDetailItem extends AiprConfigListItem {
  value: string;
}

export class AiprSystemConfigService {
  async listConfigs(category?: string): Promise<AiprConfigListItem[]> {
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

  async getConfig(key: string): Promise<AiprConfigDetailItem | null> {
    const row = await prisma.systemConfig.findUnique({ where: { key } });
    if (!row) return null;

    return {
      key: row.key,
      value: aiprConfigService.get(key) ?? '',
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
    await aiprConfigService.set(key, value, { ...options, updatedBy });
  }

  async deleteConfig(key: string): Promise<void> {
    await aiprConfigService.delete(key);
  }

  async reloadAll(): Promise<void> {
    await aiprConfigService.reload();
  }

  async getCategories(): Promise<string[]> {
    const rows = await prisma.systemConfig.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }
}

export const aiprSystemConfigService = new AiprSystemConfigService();
