/**
 * Seed script: populate aipr.system_config from current .env values.
 *
 * Usage:
 *   npm run seed:aipr-config
 *   npm run seed:aipr-config:force
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { aiprConfigService } from './aipr-config-service';

interface SeedEntry {
  key: string;
  category: string;
  description: string;
  /** Alternate env var names (e.g. JWT_SECRET_AIPR → JWT_SECRET) */
  envAliases?: string[];
}

const SEED_KEYS: SeedEntry[] = [
  { key: 'JWT_SECRET', category: 'jwt', description: 'AIPR JWT 서명 시크릿', envAliases: ['JWT_SECRET_AIPR'] },
  { key: 'JWT_REFRESH_TTL', category: 'jwt', description: 'Refresh 토큰 TTL (예: 7d)' },
  { key: 'GITHUB_APP_ID', category: 'github', description: 'GitHub App ID' },
  { key: 'GITHUB_APP_PRIVATE_KEY_BASE64', category: 'github', description: 'GitHub App private key (base64)' },
  { key: 'GITHUB_APP_CLIENT_ID', category: 'github', description: 'GitHub App OAuth client ID' },
  { key: 'GITHUB_APP_CLIENT_SECRET', category: 'github', description: 'GitHub App OAuth client secret' },
  { key: 'GITHUB_WEBHOOK_SECRET', category: 'github', description: 'GitHub webhook HMAC secret' },
  { key: 'ANTHROPIC_API_KEY', category: 'ai', description: 'Anthropic API key' },
  { key: 'S3_ENDPOINT', category: 'storage', description: 'S3-compatible endpoint URL' },
  { key: 'S3_BUCKET', category: 'storage', description: 'S3 bucket name' },
  { key: 'WIDGET_ORIGIN_ALLOWLIST', category: 'app', description: 'Widget CORS allowlist (comma-separated)' },
  { key: 'ADMIN_URL', category: 'app', description: 'AIPR admin UI URL' },
  { key: 'API_URL', category: 'app', description: 'AIPR public API URL' },
  { key: 'GITLAB_WEBHOOK_SECRET', category: 'gitlab', description: 'GitLab webhook 검증 토큰' },
];

function resolveEnvValue(entry: SeedEntry): string | undefined {
  if (process.env[entry.key]) return process.env[entry.key];
  for (const alias of entry.envAliases ?? []) {
    if (process.env[alias]) return process.env[alias];
  }
  return undefined;
}

export async function seedAiprConfig(force = false) {
  console.log(`[seed-aipr-config] Starting seed (force=${force})...`);

  let seeded = 0;
  let skipped = 0;

  for (const entry of SEED_KEYS) {
    const envValue = resolveEnvValue(entry);
    if (!envValue) {
      console.log(`  SKIP (not in .env): ${entry.key}`);
      skipped++;
      continue;
    }

    if (!force) {
      const { aiprPrisma } = await import('./prisma');
      const existing = await aiprPrisma.systemConfig.findUnique({ where: { key: entry.key } });
      if (existing) {
        console.log(`  SKIP (already in DB): ${entry.key}`);
        skipped++;
        continue;
      }
    }

    await aiprConfigService.set(entry.key, envValue, {
      description: entry.description,
      category: entry.category,
      updatedBy: 'seed-script',
    });

    console.log(`  SEEDED: ${entry.key}`);
    seeded++;
  }

  console.log(`\n[seed-aipr-config] Done. seeded=${seeded}, skipped=${skipped}`);
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  seedAiprConfig(force)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed-aipr-config] Failed:', err);
      process.exit(1);
    });
}
