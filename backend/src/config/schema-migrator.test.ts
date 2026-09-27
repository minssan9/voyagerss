import {
  applySchemaMigrations,
  checksumSql,
  loadMigrationScripts,
  MigrationScript,
  parseDatabaseUrl,
  parseMigrationScriptName,
  sortMigrationScripts,
  splitSqlStatements,
  SqlExecutor,
} from './schema-migrator';

interface HistoryRecord {
  installed_rank: number;
  version: string;
  checksum: string;
  success: number;
}

function script(version: number, sql: string, description = `step_${version}`): MigrationScript {
  return {
    version,
    description,
    script: `V${version}__${description}.sql`,
    sql,
  };
}

function createExecutor(initial: HistoryRecord[] = [], failSqlIncluding?: string) {
  const history = initial.map((row) => ({ ...row }));
  const executed: string[] = [];
  const executor: SqlExecutor = {
    query: async (sql, params) => {
      const compact = sql.replace(/\s+/g, ' ').trim();
      if (compact.startsWith('CREATE TABLE IF NOT EXISTS `schema_history`')) return [];
      if (compact.startsWith('SELECT installed_rank')) return history;
      if (compact.startsWith('INSERT INTO schema_history')) {
        history.push({
          installed_rank: Number(params?.[0]),
          version: String(params?.[1]),
          checksum: String(params?.[4]),
          success: params?.[6] ? 1 : 0,
        });
        return [];
      }
      if (failSqlIncluding && sql.includes(failSqlIncluding)) {
        throw new Error('statement failed');
      }
      executed.push(sql);
      return [];
    },
  };
  return { executor, history, executed };
}

describe('schema migrator', () => {
  const v1 = script(1, 'CREATE TABLE t (id INT)');
  const v2 = script(2, 'DROP TABLE IF EXISTS old_table');
  const v10 = script(10, 'ALTER TABLE t ADD COLUMN n INT');

  it('sorts versions numerically so V10 follows V2', () => {
    expect(sortMigrationScripts([v10, v2, v1]).map((item) => item.version)).toEqual([1, 2, 10]);
    expect(parseMigrationScriptName('V10__later.sql')).toEqual({
      version: 10,
      description: 'later',
    });
    expect(parseMigrationScriptName('not-a-migration.sql')).toBeNull();
  });

  it('splits statements the same way as seed SQL files', () => {
    const statements = splitSqlStatements(`
      -- header
      SET FOREIGN_KEY_CHECKS = 0;
      DROP TABLE IF EXISTS \`old\`; /* block */
      SET FOREIGN_KEY_CHECKS = 1;
    `);
    expect(statements).toEqual([
      'SET FOREIGN_KEY_CHECKS = 0',
      'DROP TABLE IF EXISTS `old`',
      'SET FOREIGN_KEY_CHECKS = 1',
    ]);
  });

  it('parses a mysql DATABASE_URL', () => {
    expect(parseDatabaseUrl('mysql://app:p%40ss@127.0.0.1:3307/voyagers')).toEqual({
      host: '127.0.0.1',
      port: 3307,
      user: 'app',
      password: 'p@ss',
      database: 'voyagers',
    });
  });

  it('loads the committed migration files in version order', () => {
    const loaded = loadMigrationScripts();
    expect(loaded.map((item) => item.version)).toEqual([1, 2, 3]);
    expect(loaded[0].script).toBe('V1__baseline.sql');
    expect(loaded[1].script).toBe('V2__drop_investand_tables.sql');
    expect(loaded[2].script).toBe('V3__identity_rbac_team_join.sql');

    const baseline = splitSqlStatements(loaded[0].sql);
    expect(baseline.length).toBeGreaterThan(10);
    expect(baseline.some((statement) => statement.includes(';'))).toBe(false);
    expect(baseline.filter((statement) => statement.startsWith('PREPARE '))).toHaveLength(9);
    expect(baseline.filter((statement) => statement.startsWith('CREATE TABLE IF NOT EXISTS '))).toHaveLength(
      42,
    );
  });

  it('applies pending migrations in version order and skips a matching checksum', async () => {
    const first = createExecutor();
    await applySchemaMigrations(first.executor, [v10, v1]);

    expect(first.executed).toEqual([v1.sql, v10.sql]);
    expect(first.history.map((row) => [row.version, row.success])).toEqual([
      ['1', 1],
      ['10', 1],
    ]);

    const second = createExecutor(first.history);
    await applySchemaMigrations(second.executor, [v1, v10]);
    expect(second.executed).toEqual([]);
  });

  it('stops when an applied file checksum changes', async () => {
    const { executor, executed } = createExecutor([
      {
        installed_rank: 1,
        version: '1',
        checksum: 'not-the-file',
        success: 1,
      },
    ]);

    await expect(applySchemaMigrations(executor, [v1])).rejects.toThrow(/checksum mismatch/);
    expect(executed).toEqual([]);
  });

  it('rejects a lower unapplied version once a higher version is recorded', async () => {
    const { executor, executed } = createExecutor([
      {
        installed_rank: 1,
        version: '2',
        checksum: checksumSql(v2.sql),
        success: 1,
      },
    ]);

    await expect(applySchemaMigrations(executor, [v1, v2])).rejects.toThrow(/higher version/);
    expect(executed).toEqual([]);
  });

  it('does not continue when schema_history has a failed row', async () => {
    const { executor, executed } = createExecutor([
      {
        installed_rank: 1,
        version: '1',
        checksum: checksumSql(v1.sql),
        success: 0,
      },
    ]);

    await expect(applySchemaMigrations(executor, [v1, v2])).rejects.toThrow(/failed previously/);
    expect(executed).toEqual([]);
  });

  it('records success 0 when a statement fails', async () => {
    const { executor, history, executed } = createExecutor([], 'DROP TABLE');

    await expect(applySchemaMigrations(executor, [v1, v2])).rejects.toThrow('statement failed');
    expect(executed).toEqual([v1.sql]);
    expect(history.map((row) => [row.version, row.success])).toEqual([
      ['1', 1],
      ['2', 0],
    ]);
  });
});
