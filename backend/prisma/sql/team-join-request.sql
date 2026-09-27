CREATE TABLE IF NOT EXISTS `team_join_request` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `team_id` INT NOT NULL,
  `account_id` INT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `decided_at` DATETIME(3) NULL,
  `decided_by` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `team_join_request_team_id_account_id_key` (`team_id`, `account_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
