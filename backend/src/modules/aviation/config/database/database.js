const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/aviation_bot.db');
    this.db = null;
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection failed:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          this.setupTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async setupTables() {
    const createQuizzesTable = `
      CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic VARCHAR(100) NOT NULL,
        knowledge_area TEXT NOT NULL,
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer CHAR(1) NOT NULL,
        explanation TEXT,
        difficulty VARCHAR(20) DEFAULT 'intermediate',
        provider VARCHAR(20),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_quizzes_topic ON quizzes(topic)',
      'CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty ON quizzes(difficulty)',
      'CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at)'
    ];

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createQuizzesTable, (err) => {
          if (err) {
            console.error('❌ Failed to create quizzes table:', err);
            reject(err);
            return;
          }
          console.log('✅ Quizzes table ready');
          
          // Create indexes
          let indexCount = 0;
          createIndexes.forEach((indexSQL) => {
            this.db.run(indexSQL, (err) => {
              if (err) console.warn(`⚠️ Index creation warning:`, err);
              indexCount++;
              if (indexCount === createIndexes.length) {
                console.log('✅ Database indexes created');
                resolve();
              }
            });
          });
        });
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ Database close error:', err);
            reject(err);
          } else {
            console.log('✅ Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getStats() {
    return {
      path: this.dbPath,
      connected: this.db !== null,
      exists: fs.existsSync(this.dbPath)
    };
  }
}

module.exports = Database;