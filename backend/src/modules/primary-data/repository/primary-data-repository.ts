import mysql from 'mysql2/promise';
import { parseDatabaseUrl } from '../../../config/schema-migrator';
import type { ObservationUpsert, RawFetchRecord } from '../types';

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!pool) {
    const cfg = parseDatabaseUrl(url);
    pool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectionLimit: 5,
      timezone: 'Z',
    });
  }
  return pool;
}

export async function closePrimaryDataPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function tryAcquireLock(
  lockName: string,
  holder: string,
  ttlSeconds: number,
): Promise<boolean> {
  const p = getPool();
  const now = new Date();
  const expires = new Date(now.getTime() + ttlSeconds * 1000);
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      'SELECT lock_name, expires_at FROM pd_ingestion_lock WHERE lock_name = ? FOR UPDATE',
      [lockName],
    );
    if (rows.length > 0) {
      const exp = new Date(rows[0].expires_at as string);
      if (exp > now && rows[0].lock_name) {
        await conn.rollback();
        return false;
      }
      await conn.query(
        'UPDATE pd_ingestion_lock SET holder = ?, acquired_at = ?, expires_at = ? WHERE lock_name = ?',
        [holder, now, expires, lockName],
      );
    } else {
      await conn.query(
        'INSERT INTO pd_ingestion_lock (lock_name, holder, acquired_at, expires_at) VALUES (?, ?, ?, ?)',
        [lockName, holder, now, expires],
      );
    }
    await conn.commit();
    return true;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function releaseLock(lockName: string, holder: string): Promise<void> {
  await getPool().query(
    'DELETE FROM pd_ingestion_lock WHERE lock_name = ? AND holder = ?',
    [lockName, holder],
  );
}

export async function insertSourceFetch(record: RawFetchRecord): Promise<number> {
  const [result] = await getPool().query<mysql.ResultSetHeader>(
    `INSERT INTO pd_source_fetch
      (adapter_id, request_fingerprint, source_url, http_status, raw_body, raw_checksum,
       fetched_at, retrieval_timezone, observation_period_start, observation_period_end,
       error_code, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [
      record.adapterId,
      record.requestFingerprint,
      record.sourceUrl,
      record.httpStatus,
      record.rawBody,
      record.rawChecksum,
      record.fetchedAt,
      record.retrievalTimezone,
      record.observationPeriodStart,
      record.observationPeriodEnd,
      record.errorCode,
      record.errorMessage,
    ],
  );
  return result.insertId;
}

export async function upsertObservations(
  sourceFetchId: number,
  rows: ObservationUpsert[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const p = getPool();
  const conn = await p.getConnection();
  let written = 0;
  try {
    await conn.beginTransaction();
    for (const row of rows) {
      await conn.query(
        `INSERT INTO pd_observation
          (adapter_id, series_key, entity_id, entity_name, metric, period_type,
           period_start, period_end, value_numeric, value_json, unit,
           source_fetch_id, source_identifier, revision_tag)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           value_numeric = VALUES(value_numeric),
           value_json = VALUES(value_json),
           unit = VALUES(unit),
           source_fetch_id = VALUES(source_fetch_id),
           source_identifier = VALUES(source_identifier),
           revision_tag = VALUES(revision_tag),
           updated_at = CURRENT_TIMESTAMP(3)`,
        [
          row.adapterId,
          row.seriesKey,
          row.entityId,
          row.entityName,
          row.metric,
          row.periodType,
          row.periodStart,
          row.periodEnd,
          row.valueNumeric,
          row.valueJson ? JSON.stringify(row.valueJson) : null,
          row.unit,
          sourceFetchId,
          row.sourceIdentifier,
          row.revisionTag ?? '',
        ],
      );
      written += 1;
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return written;
}

export async function saveCheckpoint(
  adapterId: string,
  checkpointKey: string,
  cursor: Record<string, unknown>,
): Promise<void> {
  await getPool().query(
    `INSERT INTO pd_checkpoint (adapter_id, checkpoint_key, cursor_json)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE cursor_json = VALUES(cursor_json), updated_at = CURRENT_TIMESTAMP(3)`,
    [adapterId, checkpointKey, JSON.stringify(cursor)],
  );
}

export async function loadCheckpoint(
  adapterId: string,
  checkpointKey: string,
): Promise<Record<string, unknown> | null> {
  const [rows] = await getPool().query<mysql.RowDataPacket[]>(
    'SELECT cursor_json FROM pd_checkpoint WHERE adapter_id = ? AND checkpoint_key = ?',
    [adapterId, checkpointKey],
  );
  if (rows.length === 0) return null;
  const raw = rows[0].cursor_json;
  if (typeof raw === 'string') return JSON.parse(raw) as Record<string, unknown>;
  return raw as Record<string, unknown>;
}

export interface StoredObservationRow {
  value_numeric: number | null;
  value_json: unknown;
  unit: string | null;
  period_start: string;
  period_end: string;
  source_identifier: string | null;
  fetched_at: Date;
  source_url: string;
  adapter_id: string;
  series_key: string;
  metric: string;
}

export async function findObservationsForQuery(
  seriesKey: string,
  metric: string,
  asOfPeriod: string,
): Promise<StoredObservationRow[]> {
  const [rows] = await getPool().query<mysql.RowDataPacket[]>(
    `SELECT o.value_numeric, o.value_json, o.unit, o.period_start, o.period_end,
            o.source_identifier, o.adapter_id, o.series_key, o.metric,
            f.fetched_at, f.source_url
     FROM pd_observation o
     JOIN pd_source_fetch f ON f.id = o.source_fetch_id
     WHERE o.series_key = ? AND o.metric = ? AND o.period_start <= ?
     ORDER BY o.period_start DESC, f.fetched_at DESC
     LIMIT 50`,
    [seriesKey, metric, asOfPeriod],
  );
  return rows as StoredObservationRow[];
}

export async function findLatestObservation(
  seriesKey: string,
  metric: string,
): Promise<StoredObservationRow | null> {
  const [rows] = await getPool().query<mysql.RowDataPacket[]>(
    `SELECT o.value_numeric, o.value_json, o.unit, o.period_start, o.period_end,
            o.source_identifier, o.adapter_id, o.series_key, o.metric,
            f.fetched_at, f.source_url
     FROM pd_observation o
     JOIN pd_source_fetch f ON f.id = o.source_fetch_id
     WHERE o.series_key = ? AND o.metric = ?
     ORDER BY o.period_start DESC, f.fetched_at DESC
     LIMIT 1`,
    [seriesKey, metric],
  );
  if (rows.length === 0) return null;
  return rows[0] as StoredObservationRow;
}

export async function startIngestionRun(runId: string, mode: string): Promise<void> {
  await getPool().query(
    `INSERT INTO pd_ingestion_run (run_id, mode, status, started_at) VALUES (?, ?, 'running', CURRENT_TIMESTAMP(3))`,
    [runId, mode],
  );
}

export async function finishIngestionRun(
  runId: string,
  status: string,
  summary: Record<string, unknown>,
): Promise<void> {
  await getPool().query(
    `UPDATE pd_ingestion_run SET status = ?, finished_at = CURRENT_TIMESTAMP(3), summary_json = ? WHERE run_id = ?`,
    [status, JSON.stringify(summary), runId],
  );
}
