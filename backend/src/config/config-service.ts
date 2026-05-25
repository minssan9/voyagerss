import crypto from 'crypto';
import { workschdPrisma } from './prisma';

export interface ConfigSetOptions {
  isEncrypted?: boolean;
  description?: string;
  category?: string;
  updatedBy?: string;
}

const SENSITIVE_KEYS = new Set([
  'JWT_SECRET',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'GOOGLE_CLIENT_SECRET',
  'KAKAO_CLIENT_SECRET',
  'SMTP_PASS',
  'SMTP_USER',
  'SOLAPI_API_KEY',
  'SOLAPI_API_SECRET',
  'BOK_API_KEY',
  'DART_API_KEY',
  'KIS_API_KEY',
  'KIS_API_SECRET',
  'TELEGRAM_BOT_TOKEN',
  'GEMINI_API_KEY',
  'MFA_ENCRYPTION_KEY',
]);

export class ConfigService {
  private static instance: ConfigService;
  private cache: Map<string, string> = new Map();
  private _initialized = false;

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const rows = await workschdPrisma.systemConfig.findMany();
      this.cache.clear();
      for (const row of rows) {
        try {
          const value = row.isEncrypted ? this.decrypt(row.value) : row.value;
          this.cache.set(row.key, value);
        } catch (err) {
          console.warn(`[ConfigService] Failed to decrypt key "${row.key}":`, err);
        }
      }
      this._initialized = true;
      console.log(`[ConfigService] Initialized with ${this.cache.size} entries from DB`);
    } catch (err) {
      console.warn('[ConfigService] DB load failed, falling back to process.env:', err);
      this._initialized = true;
    }
  }

  async reload(): Promise<void> {
    await this.initialize();
  }

  get(key: string, defaultValue?: string): string | undefined {
    if (this.cache.has(key)) return this.cache.get(key);
    if (process.env[key] !== undefined) return process.env[key];
    return defaultValue;
  }

  getRequired(key: string): string {
    const value = this.get(key);
    if (value === undefined) throw new Error(`[ConfigService] Required config key "${key}" is not set`);
    return value;
  }

  async set(key: string, value: string, options: ConfigSetOptions = {}): Promise<void> {
    const shouldEncrypt = options.isEncrypted ?? SENSITIVE_KEYS.has(key);
    const storedValue = shouldEncrypt ? this.encrypt(value) : value;

    await workschdPrisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: storedValue,
        isEncrypted: shouldEncrypt,
        description: options.description,
        category: options.category ?? 'general',
        updatedBy: options.updatedBy,
      },
      update: {
        value: storedValue,
        isEncrypted: shouldEncrypt,
        description: options.description,
        category: options.category,
        updatedBy: options.updatedBy,
      },
    });

    this.cache.set(key, value);
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  private deriveKey(): Buffer {
    const encKey = process.env.CONFIG_ENCRYPTION_KEY || 'default-config-encryption-key-change-me';
    return crypto.scryptSync(encKey, 'voyagerss-salt', 32);
  }

  private encrypt(plaintext: string): string {
    const key = this.deriveKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(ciphertext: string): string {
    const [ivHex, encHex] = ciphertext.split(':');
    if (!ivHex || !encHex) {
      // Not encrypted format — return as-is (plaintext stored before encryption was added)
      return ciphertext;
    }
    const key = this.deriveKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([
      decipher.update(Buffer.from(encHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }
}

export const configService = ConfigService.getInstance();
