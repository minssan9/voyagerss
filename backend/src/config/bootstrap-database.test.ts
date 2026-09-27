import { bootstrapDatabase } from './bootstrap-database';
import { migrateDatabase } from './schema-migrator';
import { seedAiprConfig } from './seed-aipr-config';
import { seedConfig } from './seed-config';
import { isLocalEnvironment, seedLocalAll } from './seed-local';

jest.mock('./schema-migrator', () => ({
  migrateDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./seed-config', () => ({
  seedConfig: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./seed-aipr-config', () => ({
  seedAiprConfig: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./seed-local', () => ({
  isLocalEnvironment: jest.fn().mockReturnValue(false),
  seedLocalAll: jest.fn().mockResolvedValue(undefined),
}));

describe('bootstrapDatabase', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    (migrateDatabase as jest.Mock).mockResolvedValue(undefined);
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'mysql://localhost:3306/voyagers',
      DB_BOOTSTRAP_ENABLED: 'true',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should skip when DB_BOOTSTRAP_ENABLED=false', async () => {
    process.env.DB_BOOTSTRAP_ENABLED = 'false';

    await bootstrapDatabase();

    expect(migrateDatabase).not.toHaveBeenCalled();
    expect(seedConfig).not.toHaveBeenCalled();
  });

  it('should skip when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    await bootstrapDatabase();

    expect(migrateDatabase).not.toHaveBeenCalled();
  });

  it('should migrate the schema before seeding config', async () => {
    await bootstrapDatabase();

    expect(migrateDatabase).toHaveBeenCalledTimes(1);
    expect(seedConfig).toHaveBeenCalledWith(false);
    expect(seedAiprConfig).toHaveBeenCalledWith(false);
    const migrateOrder = (migrateDatabase as jest.Mock).mock.invocationCallOrder[0];
    const seedOrder = (seedConfig as jest.Mock).mock.invocationCallOrder[0];
    expect(migrateOrder).toBeLessThan(seedOrder);
  });

  it('should not seed when schema migration fails', async () => {
    (migrateDatabase as jest.Mock).mockRejectedValueOnce(new Error('checksum mismatch'));

    await expect(bootstrapDatabase()).rejects.toThrow('checksum mismatch');
    expect(seedConfig).not.toHaveBeenCalled();
    expect(seedAiprConfig).not.toHaveBeenCalled();
  });

  it('should run local seed only in local environment', async () => {
    (isLocalEnvironment as jest.Mock).mockReturnValue(true);

    await bootstrapDatabase();

    expect(seedLocalAll).toHaveBeenCalledWith(false);
  });
});
