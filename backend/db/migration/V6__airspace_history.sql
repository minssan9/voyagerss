-- Airspace monitor history: alert events and per-track summaries from airspace_edge.

CREATE TABLE IF NOT EXISTS `airspace_event` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `session_id` VARCHAR(64) NOT NULL,
    `type` VARCHAR(16) NOT NULL,
    `track_id` INTEGER NOT NULL,
    `threat` VARCHAR(8) NULL,
    `label` VARCHAR(32) NULL,
    `azimuth` DOUBLE NULL,
    `elevation` DOUBLE NULL,
    `range_m` DOUBLE NULL,
    `occurred_at` DATETIME(3) NOT NULL,

    INDEX `airspace_event_occurred_at_idx`(`occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `airspace_track` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `session_id` VARCHAR(64) NOT NULL,
    `track_id` INTEGER NOT NULL,
    `label` VARCHAR(32) NOT NULL,
    `max_threat` VARCHAR(8) NOT NULL,
    `max_score` DOUBLE NOT NULL,
    `min_range_m` DOUBLE NULL,
    `sources` VARCHAR(32) NOT NULL,
    `last_azimuth` DOUBLE NOT NULL,
    `last_elevation` DOUBLE NOT NULL,
    `first_seen` DATETIME(3) NOT NULL,
    `last_seen` DATETIME(3) NOT NULL,

    UNIQUE INDEX `airspace_track_session_id_track_id_key`(`session_id`, `track_id`),
    INDEX `airspace_track_last_seen_idx`(`last_seen`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
