import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { seedAiprConfig } from './seed-aipr-config';
import { seedConfig } from './seed-config';
import { isLocalEnvironment, seedLocalAll } from './seed-local';

const execFileAsync = promisify(execFile);

const WORKSCHD_SCHEMA = 'prisma/workschd.prisma';
const AIPR_SCHEMA = 'prisma/aipr.prisma';

const AIPR_SQL_FILES = [
  'prisma/sql/aipr-system-config.sql',
  'prisma/sql/aipr-add-autopilot.sql',
  'prisma/sql/aipr-add-runner-mode.sql',
  'prisma/sql/aipr-omp-migration.sql',
];

function isBootstrapEnabled(): boolean {
  if (process.env.DB_BOOTSTRAP_ENABLED === 'false') return false;
  return true;
}

async function runPrisma(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const prismaBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'prisma');
  try {
    const { stdout, stderr } = await execFileAsync(prismaBin, args, {
      cwd: process.cwd(),
      env: process.env,
    });
    if (stdout.trim()) console.log(stdout.trim());
    if (stderr.trim()) console.warn(stderr.trim());
    return { stdout: stdout ?? '', stderr: stderr ?? '' };
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string };
    const stdout = execErr.stdout ?? '';
    const stderr = execErr.stderr ?? execErr.message ?? '';
    if (stdout.trim()) console.log(stdout.trim());
    if (stderr.trim()) console.warn(stderr.trim());
    throw Object.assign(new Error(stderr || execErr.message || 'prisma command failed'), {
      stdout,
      stderr,
    });
  }
}

function isUnbaselinedDatabaseError(stderr: string): boolean {
  return stderr.includes('P3005') || stderr.includes('database schema is not empty');
}

export function listWorkschdMigrationNames(): string[] {
  const dir = path.resolve(process.cwd(), 'prisma/migrations');
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((name) => {
      const entry = path.join(dir, name);
      return fs.statSync(entry).isDirectory() && fs.existsSync(path.join(entry, 'migration.sql'));
    })
    .sort();
}

async function executeSqlFile(schemaPath: string, sqlFile: string): Promise<void> {
  try {
    await runPrisma(['db', 'execute', `--file=./${sqlFile}`, `--schema=./${schemaPath}`]);
  } catch (err) {
    console.warn(`[bootstrap-db] SQL skipped or partial (${sqlFile}):`, (err as Error).message);
  }
}

async function baselineWorkschdMigrations(): Promise<void> {
  for (const name of listWorkschdMigrationNames()) {
    const sqlFile = `prisma/migrations/${name}/migration.sql`;
    console.log(`[bootstrap-db] applying workschd migration SQL: ${name}`);
    await executeSqlFile(WORKSCHD_SCHEMA, sqlFile);
    console.log(`[bootstrap-db] marking migration applied: ${name}`);
    await runPrisma(['migrate', 'resolve', '--applied', name, `--schema=./${WORKSCHD_SCHEMA}`]);
  }
}

async function syncWorkschdSchema(): Promise<void> {
  console.log('[bootstrap-db] prisma migrate deploy (workschd)');
  try {
    await runPrisma(['migrate', 'deploy', `--schema=./${WORKSCHD_SCHEMA}`]);
    return;
  } catch (err: unknown) {
    const stderr = (err as { stderr?: string }).stderr ?? '';
    if (!isUnbaselinedDatabaseError(stderr)) throw err;
    console.warn('[bootstrap-db] workschd: baselining existing shared database…');
  }

  await baselineWorkschdMigrations();
  await runPrisma(['migrate', 'deploy', `--schema=./${WORKSCHD_SCHEMA}`]);
}

async function syncAiprSqlPatches(): Promise<void> {
  for (const file of AIPR_SQL_FILES) {
    console.log(`[bootstrap-db] aipr SQL patch: ${file}`);
    await executeSqlFile(AIPR_SCHEMA, file);
  }
}

async function seedRuntimeConfig(): Promise<void> {
  console.log('[bootstrap-db] seeding workschd system_config from env');
  await seedConfig(false);

  console.log('[bootstrap-db] seeding aipr system_config from env');
  await seedAiprConfig(false);
}

/**
 * Apply Prisma migrations and idempotent SQL patches on a shared MySQL database.
 * Avoids per-schema db push, which would drop tables owned by other modules.
 */
export async function bootstrapDatabase(): Promise<void> {
  if (!isBootstrapEnabled()) {
    console.log('[bootstrap-db] Skipped (DB_BOOTSTRAP_ENABLED=false)');
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.warn('[bootstrap-db] DATABASE_URL is not set — skipping schema sync');
    return;
  }

  console.log('[bootstrap-db] Starting database bootstrap…');

  try {
    await syncWorkschdSchema();
    console.log('[bootstrap-db] workschd schema OK');
  } catch (err) {
    console.error('[bootstrap-db] workschd schema sync failed:', err);
    throw err;
  }

  try {
    await syncAiprSqlPatches();
    console.log('[bootstrap-db] aipr SQL patches OK');
  } catch (err) {
    console.error('[bootstrap-db] aipr SQL patch failed:', err);
    throw err;
  }

  try {
    await seedRuntimeConfig();
  } catch (err) {
    console.error('[bootstrap-db] config seed failed:', err);
    throw err;
  }

  if (isLocalEnvironment()) {
    try {
      console.log('[bootstrap-db] local environment detected — running local seed');
      await seedLocalAll(false);
    } catch (err) {
      console.error('[bootstrap-db] local seed failed:', err);
      throw err;
    }
  }

  console.log('[bootstrap-db] Database bootstrap complete');
}
