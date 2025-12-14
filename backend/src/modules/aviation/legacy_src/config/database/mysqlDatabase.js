const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

class MySQLDatabase {
  constructor(config) {
    this.config = {
      host: config.DATABASE_HOST || 'localhost',
      port: config.DATABASE_PORT || 3306,
      user: config.DATABASE_USER || 'root',
      password: config.DATABASE_PASSWORD || '',
      database: config.DATABASE_NAME || 'aviation_bot',
      charset: 'utf8mb4',
      timezone: '+00:00'
    };

    // MySQL2 compatible pool options
    this.poolOptions = {
      waitForConnections: true,
      connectionLimit: config.dbOptions?.connectionLimit || 10,
      acquireTimeoutMillis: config.dbOptions?.acquireTimeoutMillis || 60000,
      connectTimeout: config.dbOptions?.connectTimeout || 60000,
      queueLimit: 0
    };

    this.pool = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🔌 Connecting to MySQL database...');

      // Connection pool 생성 (MySQL2 호환 설정)
      this.pool = mysql.createPool({
        ...this.config,
        ...this.poolOptions
      });

      // 연결 테스트
      const connection = await this.pool.getConnection();
      console.log(`✅ Connected to MySQL: ${this.config.host}:${this.config.port}/${this.config.database}`);
      connection.release();

      // Pool 생성 완료 후 초기화 플래그 설정 (마이그레이션 전)
      this.isInitialized = true;

      // 스키마 확인 & 생성
      await this.ensureDatabase();
      await this.runMigrations();

    } catch (error) {
      console.error('❌ MySQL connection failed:', error.message);
      throw error;
    }
  }

  async ensureDatabase() {
    try {
      // 데이터베이스 생성 (존재하지 않을 경우)
      const tempPool = mysql.createPool({
        ...this.config,
        database: undefined  // 데이터베이스 지정 안함
      });

      await tempPool.query(
        `CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` 
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );

      await tempPool.end();
      console.log(`✅ Database '${this.config.database}' ensured`);
    } catch (error) {
      console.error('❌ Failed to ensure database:', error);
      throw error;
    }
  }

  async runMigrations() {
    try {
      const migrationsDir = path.join(__dirname, '../../migrations-db');
      const migrationFiles = await this.getMigrationFiles(migrationsDir);

      // migrations 테이블 생성
      await this.createMigrationsTable();

      // 실행된 마이그레이션 조회
      const executedMigrations = await this.getExecutedMigrations();

      // 미실행 마이그레이션 실행
      for (const file of migrationFiles) {
        if (!executedMigrations.includes(file)) {
          await this.executeMigration(file, migrationsDir);
        }
      }

      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async getMigrationFiles(migrationsDir) {
    try {
      const files = await fs.readdir(migrationsDir);
      return files
        .filter(f => f.endsWith('.sql'))
        .sort();
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn('⚠️ Migrations directory not found, skipping migrations');
        return [];
      }
      throw error;
    }
  }

  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `;
    await this.query(sql);
  }

  async getExecutedMigrations() {
    try {
      const [rows] = await this.query('SELECT id FROM migrations ORDER BY executed_at');
      return rows.map(row => row.id);
    } catch (error) {
      return [];
    }
  }

  async executeMigration(filename, migrationsDir) {
    const filePath = path.join(migrationsDir, filename);
    const sql = await fs.readFile(filePath, 'utf8');

    console.log(`🔄 Executing migration: ${filename}`);

    // 트랜잭션으로 실행
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      // SQL 파일 실행 (여러 statements 지원)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await connection.query(statement);
          } catch (err) {
            // Ignore duplicate index/column errors
            if (err.code === 'ER_DUP_KEYNAME' || err.errno === 1061 ||
              err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060 ||
              (err.sqlState === '42000' && err.message.includes('Duplicate key name'))) {
              console.warn(`⚠️ Ignoring duplicate error: ${err.message}`);
            } else {
              throw err;
            }
          }
        }
      }

      // 마이그레이션 기록
      await connection.execute(
        'INSERT INTO migrations (id) VALUES (?)',
        [filename]
      );

      await connection.commit();
      console.log(`✅ Migration completed: ${filename}`);

    } catch (error) {
      await connection.rollback();
      console.error(`❌ Migration failed: ${filename}`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async query(sql, params = []) {
    if (!this.pool) {
      throw new Error('Database connection pool not available');
    }

    try {
      return await this.pool.query(sql, params);
    } catch (error) {
      console.error('❌ Query failed:', sql, params, error);
      throw error;
    }
  }

  async execute(sql, params = []) {
    if (!this.pool) {
      throw new Error('Database connection pool not available');
    }

    try {
      const [result] = await this.pool.execute(sql, params);
      return result;
    } catch (error) {
      console.error('❌ Execute failed:', sql, params, error);
      throw error;
    }
  }

  async get(sql, params = []) {
    const [rows] = await this.query(sql, params);
    return rows[0] || null;
  }

  async all(sql, params = []) {
    const [rows] = await this.query(sql, params);
    return rows;
  }

  async transaction(callback) {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      const result = await callback(connection);

      await connection.commit();
      return result;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ MySQL connection pool closed');
    }
  }

  getStats() {
    if (!this.pool) {
      return { connected: false, config: this.config };
    }

    return {
      connected: this.isInitialized,
      config: {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user
      },
      pool: {
        totalConnections: this.pool._allConnections?.length || 0,
        freeConnections: this.pool._freeConnections?.length || 0,
        acquiringConnections: this.pool._acquiringConnections?.length || 0
      }
    };
  }

  // Health check
  async healthCheck() {
    try {
      await this.query('SELECT 1 as health');
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = MySQLDatabase;