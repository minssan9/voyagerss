import { AiprConfigService } from './aipr-config-service';

jest.mock('./prisma', () => ({
  aiprPrisma: {
    systemConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { aiprPrisma } from './prisma';

describe('AiprConfigService', () => {
  let service: AiprConfigService;

  beforeEach(() => {
    service = AiprConfigService.getInstance();
    (service as any).cache.clear();
    (service as any)._initialized = false;
    jest.clearAllMocks();
    delete process.env.AIPR_ONLY_KEY;
  });

  it('should load values independently from workschd config cache', async () => {
    (aiprPrisma.systemConfig.findMany as jest.Mock).mockResolvedValue([
      { key: 'JWT_SECRET', value: 'aipr-jwt', isEncrypted: false },
    ]);

    await service.initialize();

    expect(service.get('JWT_SECRET')).toBe('aipr-jwt');
  });

  it('should encrypt AIPR sensitive keys on set', async () => {
    process.env.CONFIG_ENCRYPTION_KEY = 'test-encryption-key-32chars-min';
    (aiprPrisma.systemConfig.upsert as jest.Mock).mockResolvedValue({});

    await service.set('ANTHROPIC_API_KEY', 'sk-test', {
      category: 'ai',
      updatedBy: 'test',
    });

    const upsertCall = (aiprPrisma.systemConfig.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertCall.create.isEncrypted).toBe(true);
    expect(service.get('ANTHROPIC_API_KEY')).toBe('sk-test');
  });
});
