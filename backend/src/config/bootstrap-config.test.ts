import { ConfigService } from './config-service';

jest.mock('./prisma', () => ({
  workschdPrisma: {
    systemConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { workschdPrisma } from './prisma';
import { seedConfig } from './seed-config';
import { configService } from './config-service';

describe('seedConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.JWT_SECRET;
    (configService as any).cache.clear();
  });

  it('should skip seeding when DB row already exists', async () => {
    process.env.JWT_SECRET = 'legacy-env-secret';
    (workschdPrisma.systemConfig.findUnique as jest.Mock).mockResolvedValue({ key: 'JWT_SECRET' });

    await seedConfig(false);

    expect(workschdPrisma.systemConfig.upsert).not.toHaveBeenCalled();
  });

  it('should seed when force=true even if row exists', async () => {
    process.env.JWT_SECRET = 'legacy-env-secret';
    (workschdPrisma.systemConfig.findUnique as jest.Mock).mockResolvedValue({ key: 'JWT_SECRET' });
    (workschdPrisma.systemConfig.upsert as jest.Mock).mockResolvedValue({});

    await seedConfig(true);

    expect(workschdPrisma.systemConfig.upsert).toHaveBeenCalled();
  });
});

describe('bootstrap config order', () => {
  let service: ConfigService;

  beforeEach(() => {
    service = ConfigService.getInstance();
    (service as any).cache.clear();
    (service as any)._initialized = false;
    jest.clearAllMocks();
    process.env.BOOTSTRAP_KEY = 'env-only';
  });

  afterEach(() => {
    delete process.env.BOOTSTRAP_KEY;
  });

  it('should read env before initialize and DB after initialize', async () => {
    expect(service.get('BOOTSTRAP_KEY')).toBe('env-only');

    (workschdPrisma.systemConfig.findMany as jest.Mock).mockResolvedValue([
      { key: 'BOOTSTRAP_KEY', value: 'db-value', isEncrypted: false },
    ]);

    await service.initialize();

    expect(service.get('BOOTSTRAP_KEY')).toBe('db-value');
  });
});
