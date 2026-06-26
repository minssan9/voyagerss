import dotenv from 'dotenv';
import path from 'path';

function unifyDatabaseUrl(): void {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  const legacyKeys = [
    'DATABASE_URL_WORKSCHD',
    'DATABASE_URL_INVESTAND',
    'DATABASE_URL_AVIATION',
    'DATABASE_URL_AIPR',
    'DATABASE_URL_RBAC',
  ];

  for (const key of legacyKeys) {
    if (!process.env[key]) {
      process.env[key] = url;
    }
  }
}

dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
unifyDatabaseUrl();
