ALTER TABLE `funeral_home`
  ADD COLUMN `district` VARCHAR(50) NULL AFTER `region`,
  ADD COLUMN `address` VARCHAR(255) NULL AFTER `district`,
  ADD COLUMN `phone` VARCHAR(30) NULL AFTER `address`,
  ADD COLUMN `room_count` INTEGER NULL AFTER `phone`,
  ADD COLUMN `has_scraper` BOOLEAN NOT NULL DEFAULT 0 AFTER `room_count`;
