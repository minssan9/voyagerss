import { migrateDatabase } from './schema-migrator';
import { seedAiprConfig } from './seed-aipr-config';
import { seedConfig } from './seed-config';
import { isLocalEnvironment, seedLocalAll } from './seed-local';

function isBootstrapEnabled(): boolean {
  if (process.env.DB_BOOTSTRAP_ENABLED === 'false') return false;
  return true;
}

async function seedRuntimeConfig(): Promise<void> {
  console.log('[bootstrap-db] seeding workschd system_config from env');
  await seedConfig(false);

  console.log('[bootstrap-db] seeding aipr system_config from env');
  await seedAiprConfig(false);
}

/**
 * Apply versioned SQL from db/migration, then seed runtime config.
 * One schema_history table covers every module on the shared DATABASE_URL.
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
    await migrateDatabase();
    console.log('[bootstrap-db] schema migrations OK');
  } catch (err) {
    console.error('[bootstrap-db] schema migration failed:', err);
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
