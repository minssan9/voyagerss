import { workschdPrisma } from './prisma';
import { BaseDbConfigService, ConfigRow } from './base-db-config-service';
import { WORKSCHD_SENSITIVE_KEYS } from './sensitive-keys';

export interface ConfigSetOptions {
  isEncrypted?: boolean;
  description?: string;
  category?: string;
  updatedBy?: string;
}

export class ConfigService extends BaseDbConfigService {
  private static instance: ConfigService;

  protected readonly serviceName = 'ConfigService';
  protected readonly sensitiveKeys = WORKSCHD_SENSITIVE_KEYS;

  private constructor() {
    super();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  protected async loadRows(): Promise<ConfigRow[]> {
    const rows = await workschdPrisma.systemConfig.findMany();
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
    await workschdPrisma.systemConfig.upsert({
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
    await workschdPrisma.systemConfig.delete({ where: { key } });
  }

  async delete(key: string): Promise<void> {
    await this.deleteRow(key);
    this.removeFromCache(key);
  }
}

export const configService = ConfigService.getInstance();
