import { ConfigService } from './config-service';

jest.mock('./prisma', () => ({
  workschdPrisma: {
    systemConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { workschdPrisma } from './prisma';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    service = ConfigService.getInstance();
    (service as any).cache.clear();
    (service as any)._initialized = false;
    jest.clearAllMocks();
    delete process.env.TEST_CONFIG_KEY;
  });

  it('should prefer DB cache over process.env', async () => {
    process.env.TEST_CONFIG_KEY = 'from-env';
    (workschdPrisma.systemConfig.findMany as jest.Mock).mockResolvedValue([
      { key: 'TEST_CONFIG_KEY', value: 'from-db', isEncrypted: false },
    ]);

    await service.initialize();

    expect(service.get('TEST_CONFIG_KEY')).toBe('from-db');
  });

  it('should fall back to process.env when key is not in DB cache', () => {
    process.env.TEST_CONFIG_KEY = 'from-env';
    expect(service.get('TEST_CONFIG_KEY')).toBe('from-env');
  });

  it('should return default when key is missing everywhere', () => {
    expect(service.get('MISSING_KEY', 'fallback')).toBe('fallback');
  });

  it('should round-trip encrypted values', async () => {
    process.env.CONFIG_ENCRYPTION_KEY = 'test-encryption-key-32chars-min';

    (workschdPrisma.systemConfig.upsert as jest.Mock).mockResolvedValue({});
    await service.set('JWT_SECRET', 'super-secret', {
      category: 'jwt',
      updatedBy: 'test',
    });

    const upsertCall = (workschdPrisma.systemConfig.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertCall.create.isEncrypted).toBe(true);
    expect(upsertCall.create.value).not.toBe('super-secret');
    expect(service.get('JWT_SECRET')).toBe('super-secret');
  });
});
