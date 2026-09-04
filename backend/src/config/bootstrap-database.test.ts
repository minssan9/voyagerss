import { execFile } from 'node:child_process';
import { bootstrapDatabase, listWorkschdMigrationNames } from './bootstrap-database';
import { seedAiprConfig } from './seed-aipr-config';
import { seedConfig } from './seed-config';
import { isLocalEnvironment, seedLocalAll } from './seed-local';

jest.mock('node:child_process', () => ({
  execFile: jest.fn(),
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

const execFileMock = execFile as unknown as jest.Mock;

function mockExecSuccess() {
  execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
    cb(null, { stdout: 'ok', stderr: '' });
  });
}

describe('bootstrapDatabase', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'mysql://localhost:3306/voyagerss',
      DB_BOOTSTRAP_ENABLED: 'true',
    };
    mockExecSuccess();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should skip when DB_BOOTSTRAP_ENABLED=false', async () => {
    process.env.DB_BOOTSTRAP_ENABLED = 'false';

    await bootstrapDatabase();

    expect(execFileMock).not.toHaveBeenCalled();
    expect(seedConfig).not.toHaveBeenCalled();
  });

  it('should skip when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    await bootstrapDatabase();

    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('should baseline workschd when migrate deploy hits P3005', async () => {
    let migrateDeployCalls = 0;
    execFileMock.mockImplementation((_cmd, args, _opts, cb) => {
      const isMigrateDeploy = args[0] === 'migrate' && args[1] === 'deploy';
      if (isMigrateDeploy) {
        migrateDeployCalls++;
        if (migrateDeployCalls === 1) {
          const error = Object.assign(new Error('P3005'), {
            stderr: 'Error: P3005\nThe database schema is not empty.',
          });
          cb(error);
          return;
        }
      }
      cb(null, { stdout: 'ok', stderr: '' });
    });

    await bootstrapDatabase();

    const calls = execFileMock.mock.calls.map((call) => call[1]);
    expect(calls.filter((args: string[]) => args[0] === 'migrate' && args[1] === 'deploy')).toHaveLength(2);
    expect(calls.some((args: string[]) => args[0] === 'migrate' && args[1] === 'resolve')).toBe(true);
    expect(calls.some((args: string[]) => args[0] === 'db' && args[1] === 'execute')).toBe(true);
    expect(calls.some((args: string[]) => args.includes('push'))).toBe(false);
    expect(seedConfig).toHaveBeenCalledWith(false);
    expect(seedAiprConfig).toHaveBeenCalledWith(false);
  });

  it('should run migrate deploy and aipr SQL patches on a baselined database', async () => {
    await bootstrapDatabase();

    const calls = execFileMock.mock.calls.map((call) => call[1]);
    expect(calls[0]).toEqual(
      expect.arrayContaining(['migrate', 'deploy', '--schema=./prisma/workschd.prisma'])
    );
    expect(
      calls.some((args: string[]) =>
        args.some((arg) => typeof arg === 'string' && arg.includes('aipr-system-config.sql'))
      )
    ).toBe(true);
  });

  it('should run local seed only in local environment', async () => {
    (isLocalEnvironment as jest.Mock).mockReturnValue(true);

    await bootstrapDatabase();

    expect(seedLocalAll).toHaveBeenCalledWith(false);
  });
});

describe('listWorkschdMigrationNames', () => {
  it('should list sorted migration directories', () => {
    const names = listWorkschdMigrationNames();
    expect(names.length).toBeGreaterThan(0);
    expect(names).toEqual([...names].sort());
  });
});
