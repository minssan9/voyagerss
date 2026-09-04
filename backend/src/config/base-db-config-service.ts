import crypto from 'crypto';
import { ConfigSetOptions } from './config-service';

export interface ConfigRow {
  key: string;
  value: string;
  isEncrypted: boolean;
}

export abstract class BaseDbConfigService {
  protected cache: Map<string, string> = new Map();
  protected _initialized = false;

  protected abstract readonly serviceName: string;
  protected abstract readonly sensitiveKeys: Set<string>;
  protected abstract loadRows(): Promise<ConfigRow[]>;
  protected abstract persistRow(
    key: string,
    storedValue: string,
    options: ConfigSetOptions & { isEncrypted: boolean }
  ): Promise<void>;
  protected abstract deleteRow(key: string): Promise<void>;

  async initialize(): Promise<void> {
    try {
      const rows = await this.loadRows();
      this.cache.clear();
      for (const row of rows) {
        try {
          const value = row.isEncrypted ? this.decrypt(row.value) : row.value;
          this.cache.set(row.key, value);
        } catch (err) {
          console.warn(`[${this.serviceName}] Failed to decrypt key "${row.key}":`, err);
        }
      }
      this._initialized = true;
      console.log(`[${this.serviceName}] Initialized with ${this.cache.size} entries from DB`);
    } catch (err) {
      console.warn(`[${this.serviceName}] DB load failed, falling back to process.env:`, err);
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
    if (value === undefined) {
      throw new Error(`[${this.serviceName}] Required config key "${key}" is not set`);
    }
    return value;
  }

  async set(key: string, value: string, options: ConfigSetOptions = {}): Promise<void> {
    const shouldEncrypt = options.isEncrypted ?? this.sensitiveKeys.has(key);
    const storedValue = shouldEncrypt ? this.encrypt(value) : value;

    await this.persistRow(key, storedValue, {
      ...options,
      isEncrypted: shouldEncrypt,
    });

    this.cache.set(key, value);
  }

  removeFromCache(key: string): void {
    this.cache.delete(key);
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  protected deriveKey(): Buffer {
    const encKey = process.env.CONFIG_ENCRYPTION_KEY || 'default-config-encryption-key-change-me';
    return crypto.scryptSync(encKey, 'voyagerss-salt', 32);
  }

  protected encrypt(plaintext: string): string {
    const key = this.deriveKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  protected decrypt(ciphertext: string): string {
    const [ivHex, encHex] = ciphertext.split(':');
    if (!ivHex || !encHex) {
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
