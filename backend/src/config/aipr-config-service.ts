import { aiprPrisma } from './prisma';
import { BaseDbConfigService, ConfigRow } from './base-db-config-service';
import { ConfigSetOptions } from './config-service';
import { AIPR_SENSITIVE_KEYS } from './sensitive-keys';

export class AiprConfigService extends BaseDbConfigService {
  private static instance: AiprConfigService;

  protected readonly serviceName = 'AiprConfigService';
  protected readonly sensitiveKeys = AIPR_SENSITIVE_KEYS;

  private constructor() {
    super();
  }

  static getInstance(): AiprConfigService {
    if (!AiprConfigService.instance) {
      AiprConfigService.instance = new AiprConfigService();
    }
    return AiprConfigService.instance;
  }

  protected async loadRows(): Promise<ConfigRow[]> {
    const rows = await aiprPrisma.systemConfig.findMany();
    return rows.map((row) => ({
      key: row.key,
      value: row.value,
      isEncrypted: row.isEncrypted,
    }));
  }

  protected async persistRow(
    key: string,
    storedValue: string,
    options: ConfigSetOptions & { isEncrypted: boolean }
  ): Promise<void> {
    await aiprPrisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: storedValue,
        isEncrypted: options.isEncrypted,
        description: options.description,
        category: options.category ?? 'general',
        updatedBy: options.updatedBy,
      },
      update: {
        value: storedValue,
        isEncrypted: options.isEncrypted,
        description: options.description,
        category: options.category,
        updatedBy: options.updatedBy,
      },
    });
  }

  protected async deleteRow(key: string): Promise<void> {
    await aiprPrisma.systemConfig.delete({ where: { key } });
  }

  async delete(key: string): Promise<void> {
    await this.deleteRow(key);
    this.removeFromCache(key);
  }
}

export const aiprConfigService = AiprConfigService.getInstance();
