import fs from 'fs';
import path from 'path';
import { workschdPrisma, investandPrisma, aiprPrisma } from './prisma';
import { seedConfig } from './seed-config';
import { seedAiprConfig } from './seed-aipr-config';
import * as bcrypt from 'bcrypt';

function isLocalhostDb(url?: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('localhost') ||
    lowerUrl.includes('127.0.0.1') ||
    lowerUrl.startsWith('file:') ||
    lowerUrl.includes('sqlite')
  );
}

export function isLocalEnvironment(): boolean {
  return (
    isLocalhostDb(process.env.DATABASE_URL) ||
    isLocalhostDb(process.env.DATABASE_URL_WORKSCHD) ||
    isLocalhostDb(process.env.DATABASE_URL_INVESTAND) ||
    isLocalhostDb(process.env.DATABASE_URL_AIPR) ||
    process.env.NODE_ENV === 'development'
  );
}

function parseSqlFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Strip block comments
  let cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, '');
  // Split lines to remove line-by-line comments
  const lines = cleanContent.split('\n');
  const cleanLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) return '';
    const commentIndex = line.indexOf('-- ');
    if (commentIndex !== -1) {
      return line.slice(0, commentIndex);
    }
    return line;
  });
  cleanContent = cleanLines.join('\n');

  // Split statements by semicolon
  return cleanContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
}

export async function seedLocalAll(force = false) {
  if (!isLocalEnvironment()) {
    console.log('[seed-local] Not running in localhost DB environment. Skipping seeding.');
    return;
  }

  console.log('[seed-local] Localhost DB detected. Initializing seeding...');

  // 1. Seed workschd
  try {
    const workschdCount = await workschdPrisma.account.count();
    if (workschdCount === 0 || force) {
      console.log('[seed-local] Seeding workschd database with SQL...');
      const sqlPath = path.resolve(__dirname, '../../prisma/seed-workschd.sql');
      const statements = parseSqlFile(sqlPath);
      for (const stmt of statements) {
        await workschdPrisma.$executeRawUnsafe(stmt);
      }
      console.log('[seed-local] workschd database seeded.');
      
      // Seed system config
      console.log('[seed-local] Seeding workschd system configs...');
      await seedConfig(force);
    } else {
      console.log('[seed-local] workschd database already contains data. Skipping.');
    }
  } catch (err) {
    console.error('[seed-local] Error seeding workschd database:', err);
  }

  // 2. Seed investand
  try {
    const investandCount = await investandPrisma.adminUser.count();
    if (investandCount === 0 || force) {
      console.log('[seed-local] Seeding investand database with SQL...');
      const sqlPath = path.resolve(__dirname, '../../prisma/seed-investand.sql');
      const statements = parseSqlFile(sqlPath);
      for (const stmt of statements) {
        await investandPrisma.$executeRawUnsafe(stmt);
      }
      console.log('[seed-local] investand database seeded.');
    } else {
      console.log('[seed-local] investand database already contains data. Skipping.');
    }
  } catch (err) {
    console.error('[seed-local] Error seeding investand database:', err);
  }

  // 3. Seed aipr
  if (!process.env.DATABASE_URL_AIPR) {
    console.log('[seed-local] DATABASE_URL_AIPR environment variable is not defined. Skipping AIPR seeding.');
  } else {
    try {
      const aiprCount = await aiprPrisma.admin.count();
      if (aiprCount === 0 || force) {
        console.log('[seed-local] Seeding aipr database...');
        const passwordHash = await bcrypt.hash('admin1234!', 12);
        await aiprPrisma.admin.upsert({
          where: { email: 'admin@example.com' },
          update: {},
          create: {
            email: 'admin@example.com',
            role: 'SUPER',
            passwordHash,
          },
        });
        console.log('[seed-local] aipr database seeded.');

        console.log('[seed-local] Seeding aipr system configs...');
        await seedAiprConfig(force);
      } else {
        console.log('[seed-local] aipr database already contains data. Skipping.');
      }
    } catch (err) {
      console.error('[seed-local] Error seeding aipr database:', err);
    }
  }
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  seedLocalAll(force)
    .then(() => {
      console.log('[seed-local] Seeding execution finished.');
      process.exit(0);
    })
    .catch(err => {
      console.error('[seed-local] Seeding execution failed:', err);
      process.exit(1);
    });
}
