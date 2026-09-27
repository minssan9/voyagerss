import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const MIGRATION_FILENAME = /^V(\d+)__(.+)\.sql$/;

const CREATE_HISTORY_SQL = `
CREATE TABLE IF NOT EXISTS \`schema_history\` (
    \`installed_rank\` INTEGER NOT NULL,
    \`version\` VARCHAR(50) NOT NULL,
    \`description\` VARCHAR(200) NOT NULL,
    \`script\` VARCHAR(1000) NOT NULL,
    \`checksum\` CHAR(64) NOT NULL,
    \`installed_on\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`execution_time\` INTEGER NOT NULL,
    \`success\` BOOLEAN NOT NULL,

    PRIMARY KEY (\`installed_rank\`),
    UNIQUE INDEX \`schema_history_version_key\`(\`version\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`;

const SELECT_HISTORY_SQL = `
SELECT installed_rank, version, checksum, success
FROM schema_history
ORDER BY installed_rank
`;

const INSERT_HISTORY_SQL = `
INSERT INTO schema_history
    (installed_rank, version, description, script, checksum, execution_time, success)
VALUES (?, ?, ?, ?, ?, ?, ?)
`;

export interface SqlExecutor {
  query(sql: string, params?: readonly unknown[]): Promise<unknown>;
}

export interface MigrationScript {
  version: number;
  description: string;
  script: string;
  sql: string;
}

interface HistoryRow {
  installedRank: number;
  version: number;
  checksum: string;
  success: boolean;
}

export function defaultMigrationDir(): string {
  return path.resolve(__dirname, '../../db/migration');
}

export function parseMigrationScriptName(
  filename: string,
): { version: number; description: string } | null {
  const match = MIGRATION_FILENAME.exec(filename);
  if (!match) return null;
  return {
    version: Number(match[1]),
    description: match[2],
  };
}

export function sortMigrationScripts(migrations: MigrationScript[]): MigrationScript[] {
  return [...migrations].sort((left, right) => left.version - right.version);
}

export function checksumSql(sql: string): string {
  return crypto.createHash('sha256').update(sql, 'utf8').digest('hex');
}

/** Same comment stripping and semicolon split as seed-local. */
export function splitSqlStatements(sql: string): string[] {
  const withoutBlocks = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  const lines = withoutBlocks.split('\n').map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) return '';
    const commentIndex = line.indexOf('-- ');
    if (commentIndex !== -1) return line.slice(0, commentIndex);
    return line;
  });

  return lines
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export function parseDatabaseUrl(databaseUrl: string): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
} {
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!url.hostname || !database) {
    throw new Error('DATABASE_URL must include a host and database name');
  }
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}

export function loadMigrationScripts(dir = defaultMigrationDir()): MigrationScript[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`migration directory not found: ${dir}`);
  }

  const scripts: MigrationScript[] = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.sql')) continue;
    const parsed = parseMigrationScriptName(name);
    if (!parsed) {
      throw new Error(`invalid migration filename: ${name}`);
    }
    scripts.push({
      version: parsed.version,
      description: parsed.description,
      script: name,
      sql: fs.readFileSync(path.join(dir, name), 'utf8'),
    });
  }

  const versions = new Set<number>();
  for (const script of scripts) {
    if (versions.has(script.version)) {
      throw new Error(`duplicate migration version: V${script.version}`);
    }
    versions.add(script.version);
  }

  return sortMigrationScripts(scripts);
}

function isSuccessful(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'bigint') return value !== BigInt(0);
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return false;
}

function readHistory(rows: unknown): HistoryRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const record = row as Record<string, unknown>;
    return {
      installedRank: Number(record.installed_rank),
      version: Number(record.version),
      checksum: String(record.checksum),
      success: isSuccessful(record.success),
    };
  });
}

async function recordHistory(
  executor: SqlExecutor,
  rank: number,
  migration: MigrationScript,
  executionTime: number,
  success: boolean,
): Promise<void> {
  await executor.query(INSERT_HISTORY_SQL, [
    rank,
    String(migration.version),
    migration.description.slice(0, 200),
    migration.script,
    checksumSql(migration.sql),
    executionTime,
    success,
  ]);
}

/**
 * Apply versioned SQL once and record it in schema_history.
 * Uses one connection so prepared statements in a migration stay on that session.
 */
export async function applySchemaMigrations(
  executor: SqlExecutor,
  migrations: MigrationScript[],
): Promise<void> {
  await executor.query(CREATE_HISTORY_SQL);
  const history = readHistory(await executor.query(SELECT_HISTORY_SQL));

  const failed = history.find((row) => !row.success);
  if (failed) {
    throw new Error(
      `schema migration V${failed.version} failed previously. Fix the database and delete that schema_history row before retrying.`,
    );
  }

  const applied = new Map(history.map((row) => [row.version, row]));
  const maxApplied = history.reduce((max, row) => Math.max(max, row.version), 0);
  const ordered = sortMigrationScripts(migrations);

  const seen = new Set<number>();
  for (const migration of ordered) {
    if (seen.has(migration.version)) {
      throw new Error(`duplicate migration version: V${migration.version}`);
    }
    seen.add(migration.version);

    const existing = applied.get(migration.version);
    if (existing) {
      if (existing.checksum !== checksumSql(migration.sql)) {
        throw new Error(
          `checksum mismatch for ${migration.script}. Applied migrations cannot be edited.`,
        );
      }
      continue;
    }

    if (maxApplied > 0 && migration.version < maxApplied) {
      throw new Error(
        `migration ${migration.script} is not applied, but a higher version is already in schema_history.`,
      );
    }
  }

  let nextRank = history.reduce((max, row) => Math.max(max, row.installedRank), 0);

  for (const migration of ordered) {
    if (applied.has(migration.version)) {
      console.log(`[schema-migrator] skip ${migration.script} (already applied)`);
      continue;
    }

    const statements = splitSqlStatements(migration.sql);
    const started = Date.now();
    console.log(`[schema-migrator] applying ${migration.script}`);
    try {
      for (const statement of statements) {
        await executor.query(statement);
      }
    } catch (err) {
      nextRank += 1;
      try {
        await recordHistory(executor, nextRank, migration, Date.now() - started, false);
      } catch (insertErr) {
        console.error('[schema-migrator] failed to record migration failure:', insertErr);
      }
      throw err;
    }

    nextRank += 1;
    await recordHistory(executor, nextRank, migration, Date.now() - started, true);
    console.log(`[schema-migrator] applied ${migration.script}`);
  }
}

export async function migrateDatabase(databaseUrl = process.env.DATABASE_URL): Promise<void> {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const connection = await mysql.createConnection({
    ...parseDatabaseUrl(databaseUrl),
    charset: 'utf8mb4',
    multipleStatements: false,
  });

  try {
    await applySchemaMigrations(
      {
        query: async (sql, params) => {
          const [rows] = await connection.query(sql, params as never);
          return rows;
        },
      },
      loadMigrationScripts(),
    );
  } finally {
    await connection.end();
  }
}
