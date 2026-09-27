import { migrateDatabase } from './schema-migrator';

migrateDatabase()
  .then(() => {
    console.log('[schema-migrator] complete');
  })
  .catch((err: unknown) => {
    console.error('[schema-migrator] failed:', err);
    process.exit(1);
  });
