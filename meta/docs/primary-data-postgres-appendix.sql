-- Optional PostgreSQL / Supabase variant of V5 tables (run manually on Postgres targets).
-- Shared MySQL migration remains canonical for Voyagerss DO deploy.

CREATE TABLE IF NOT EXISTS pd_ingestion_run (
  id BIGSERIAL PRIMARY KEY,
  run_id VARCHAR(64) NOT NULL UNIQUE,
  mode VARCHAR(32) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status VARCHAR(32) NOT NULL,
  summary_json JSONB
);

CREATE TABLE IF NOT EXISTS pd_source_fetch (
  id BIGSERIAL PRIMARY KEY,
  adapter_id VARCHAR(64) NOT NULL,
  request_fingerprint VARCHAR(128) NOT NULL,
  source_url VARCHAR(1024) NOT NULL,
  http_status INTEGER,
  raw_body TEXT,
  raw_checksum CHAR(64) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retrieval_timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  observation_period_start VARCHAR(32),
  observation_period_end VARCHAR(32),
  error_code VARCHAR(64),
  error_message VARCHAR(512),
  UNIQUE (adapter_id, request_fingerprint, raw_checksum)
);

CREATE TABLE IF NOT EXISTS pd_observation (
  id BIGSERIAL PRIMARY KEY,
  adapter_id VARCHAR(64) NOT NULL,
  series_key VARCHAR(191) NOT NULL,
  entity_id VARCHAR(64),
  entity_name VARCHAR(256),
  metric VARCHAR(128) NOT NULL,
  period_type VARCHAR(16) NOT NULL,
  period_start VARCHAR(32) NOT NULL,
  period_end VARCHAR(32) NOT NULL,
  value_numeric NUMERIC(28, 8),
  value_json JSONB,
  unit VARCHAR(64),
  source_fetch_id BIGINT NOT NULL REFERENCES pd_source_fetch(id),
  source_identifier VARCHAR(256),
  revision_tag VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (
    adapter_id, series_key, metric, period_start, period_end, entity_id, revision_tag
  )
);

CREATE TABLE IF NOT EXISTS pd_checkpoint (
  adapter_id VARCHAR(64) NOT NULL,
  checkpoint_key VARCHAR(128) NOT NULL,
  cursor_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (adapter_id, checkpoint_key)
);

CREATE TABLE IF NOT EXISTS pd_ingestion_lock (
  lock_name VARCHAR(64) PRIMARY KEY,
  holder VARCHAR(64) NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
