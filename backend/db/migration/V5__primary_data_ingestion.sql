-- Primary-source market / macro data ingestion (portable relational model on shared DATABASE_URL).
-- Rollback: tables are additive; do not DROP in down migrations without archival.

CREATE TABLE IF NOT EXISTS `pd_ingestion_run` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `run_id` VARCHAR(64) NOT NULL,
    `mode` VARCHAR(32) NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,
    `status` VARCHAR(32) NOT NULL,
    `summary_json` JSON NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `pd_ingestion_run_run_id_key` (`run_id`),
    INDEX `pd_ingestion_run_started_at_idx` (`started_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pd_source_fetch` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `adapter_id` VARCHAR(64) NOT NULL,
    `request_fingerprint` VARCHAR(128) NOT NULL,
    `source_url` VARCHAR(1024) NOT NULL,
    `http_status` INTEGER NULL,
    `raw_body` MEDIUMTEXT NULL,
    `raw_checksum` CHAR(64) NOT NULL,
    `fetched_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `retrieval_timezone` VARCHAR(64) NOT NULL DEFAULT 'UTC',
    `observation_period_start` VARCHAR(32) NULL,
    `observation_period_end` VARCHAR(32) NULL,
    `error_code` VARCHAR(64) NULL,
    `error_message` VARCHAR(512) NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `pd_source_fetch_adapter_fingerprint_key` (`adapter_id`, `request_fingerprint`, `raw_checksum`),
    INDEX `pd_source_fetch_adapter_fetched_idx` (`adapter_id`, `fetched_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pd_observation` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `adapter_id` VARCHAR(64) NOT NULL,
    `series_key` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(64) NULL,
    `entity_name` VARCHAR(256) NULL,
    `metric` VARCHAR(128) NOT NULL,
    `period_type` VARCHAR(16) NOT NULL,
    `period_start` VARCHAR(32) NOT NULL,
    `period_end` VARCHAR(32) NOT NULL,
    `value_numeric` DECIMAL(28, 8) NULL,
    `value_json` JSON NULL,
    `unit` VARCHAR(64) NULL,
    `source_fetch_id` BIGINT NOT NULL,
    `source_identifier` VARCHAR(256) NULL,
    `revision_tag` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `pd_observation_natural_key` (
        `adapter_id`,
        `series_key`,
        `metric`,
        `period_start`,
        `period_end`,
        `entity_id`,
        `revision_tag`
    ),
    INDEX `pd_observation_series_period_idx` (`series_key`, `period_start`, `period_end`),
    INDEX `pd_observation_adapter_period_idx` (`adapter_id`, `period_start`),
    CONSTRAINT `pd_observation_source_fetch_fkey` FOREIGN KEY (`source_fetch_id`) REFERENCES `pd_source_fetch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pd_checkpoint` (
    `adapter_id` VARCHAR(64) NOT NULL,
    `checkpoint_key` VARCHAR(128) NOT NULL,
    `cursor_json` JSON NOT NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`adapter_id`, `checkpoint_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pd_ingestion_lock` (
    `lock_name` VARCHAR(64) NOT NULL,
    `holder` VARCHAR(64) NOT NULL,
    `acquired_at` DATETIME(3) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`lock_name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
