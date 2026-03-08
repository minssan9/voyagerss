import sqlite3 from 'sqlite3';
import path from 'path';
import { ScrapedFuneral } from './types';

const DB_PATH = process.env.SCRAPER_DB_PATH || path.resolve(__dirname, '../../../../../data/scraper.db');

let db: sqlite3.Database | null = null;

function getDb(): sqlite3.Database {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new sqlite3.Database(DB_PATH);
  }
  return db;
}

export async function initDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb().run(`
      CREATE TABLE IF NOT EXISTS scraped_funeral (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        funeral_home_name TEXT NOT NULL,
        funeral_home_url TEXT NOT NULL,
        region TEXT NOT NULL,
        deceased_name TEXT NOT NULL,
        room_number TEXT,
        chief_mourner TEXT,
        funeral_date TEXT,
        burial_date TEXT,
        burial_place TEXT,
        religion TEXT,
        raw_data TEXT,
        scraped_at TEXT NOT NULL,
        task_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function clearOldFunerals(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Keep only funerals scraped within last 7 days
    getDb().run(
      `DELETE FROM scraped_funeral WHERE scraped_at < datetime('now', '-7 days')`,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export async function insertFunerals(funerals: ScrapedFuneral[]): Promise<number> {
  if (funerals.length === 0) return 0;

  return new Promise((resolve, reject) => {
    const database = getDb();
    const stmt = database.prepare(`
      INSERT INTO scraped_funeral
        (funeral_home_name, funeral_home_url, region, deceased_name, room_number,
         chief_mourner, funeral_date, burial_date, burial_place, religion, raw_data, scraped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    database.serialize(() => {
      database.run('BEGIN TRANSACTION');
      for (const f of funerals) {
        stmt.run(
          f.funeralHomeName, f.funeralHomeUrl, f.region, f.deceasedName,
          f.roomNumber || null, f.chiefMourner || null, f.funeralDate || null,
          f.burialDate || null, f.burialPlace || null, f.religion || null,
          f.rawData || null, f.scrapedAt,
          (err: Error | null) => { if (!err) inserted++; }
        );
      }
      stmt.finalize();
      database.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve(inserted);
      });
    });
  });
}

export interface FuneralQueryParams {
  region?: 'INCHEON' | 'BUCHEON';
  funeralHomeName?: string;
  page?: number;
  size?: number;
}

export async function queryFunerals(params: FuneralQueryParams = {}): Promise<{
  content: any[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}> {
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const offset = page * size;

  const conditions: string[] = [];
  const args: any[] = [];

  if (params.region) {
    conditions.push('region = ?');
    args.push(params.region);
  }
  if (params.funeralHomeName) {
    conditions.push('funeral_home_name LIKE ?');
    args.push(`%${params.funeralHomeName}%`);
  }

  // Only show recently scraped (last 3 days)
  conditions.push(`scraped_at >= datetime('now', '-3 days')`);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return new Promise((resolve, reject) => {
    const database = getDb();
    database.get(
      `SELECT COUNT(*) as total FROM scraped_funeral ${whereClause}`,
      args,
      (err, row: any) => {
        if (err) return reject(err);
        const total = row?.total ?? 0;

        database.all(
          `SELECT * FROM scraped_funeral ${whereClause}
           ORDER BY scraped_at DESC, id DESC
           LIMIT ? OFFSET ?`,
          [...args, size, offset],
          (err2, rows) => {
            if (err2) return reject(err2);
            resolve({
              content: (rows as any[]).map(mapRow),
              totalElements: total,
              totalPages: Math.ceil(total / size),
              page,
              size
            });
          }
        );
      }
    );
  });
}

export async function linkFuneralToTask(funeralId: number, taskId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb().run(
      'UPDATE scraped_funeral SET task_id = ? WHERE id = ?',
      [taskId, funeralId],
      (err) => { if (err) reject(err); else resolve(); }
    );
  });
}

function mapRow(row: any) {
  return {
    id: row.id,
    funeralHomeName: row.funeral_home_name,
    funeralHomeUrl: row.funeral_home_url,
    region: row.region,
    deceasedName: row.deceased_name,
    roomNumber: row.room_number,
    chiefMourner: row.chief_mourner,
    funeralDate: row.funeral_date,
    burialDate: row.burial_date,
    burialPlace: row.burial_place,
    religion: row.religion,
    rawData: row.raw_data,
    scrapedAt: row.scraped_at,
    taskId: row.task_id,
    createdAt: row.created_at
  };
}
