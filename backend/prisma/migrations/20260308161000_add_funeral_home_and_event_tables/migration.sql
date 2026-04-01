CREATE TABLE `funeral_home` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `home_url` VARCHAR(512) NOT NULL,
  `listing_url` VARCHAR(512) NOT NULL,
  `region` VARCHAR(20) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `last_scraped_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `uq_funeral_home_name_region`(`name`, `region`),
  UNIQUE INDEX `uq_funeral_home_listing_url`(`listing_url`),
  INDEX `idx_funeral_home_region`(`region`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `funeral_event` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `funeral_home_id` INTEGER NOT NULL,
  `deceased_name` VARCHAR(100) NOT NULL,
  `room_number` VARCHAR(100) NULL,
  `chief_mourner` VARCHAR(255) NULL,
  `funeral_date` VARCHAR(255) NULL,
  `burial_date` VARCHAR(255) NULL,
  `burial_place` VARCHAR(255) NULL,
  `religion` VARCHAR(50) NULL,
  `raw_data` TEXT NULL,
  `scraped_at` DATETIME(3) NOT NULL,
  `source_hash` VARCHAR(64) NOT NULL,
  `task_id` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `uq_funeral_event_source_hash`(`source_hash`),
  INDEX `idx_funeral_event_funeral_home_id`(`funeral_home_id`),
  INDEX `idx_funeral_event_scraped_at`(`scraped_at`),
  INDEX `idx_funeral_event_task_id`(`task_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `funeral_event`
  ADD CONSTRAINT `funeral_event_funeral_home_id_fkey`
  FOREIGN KEY (`funeral_home_id`) REFERENCES `funeral_home`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- NOTE:
-- Existing production task.id type can differ (e.g. bigint), so this migration
-- intentionally does not add DB-level FK for task_id.
-- Prisma relationMode = "prisma" handles the logical relation in application layer.
