-- V1 baseline for the shared voyagers database.
-- Generated from the Prisma schemas: workschd, identity, rbac, aipr, aviation.
-- CREATE TABLE IF NOT EXISTS so an existing database can record this version
-- without recreating tables. system_config is shared by workschd and aipr and
-- is created once. Later versions must be explicit ALTER or CREATE statements.

-- workschd
-- CreateTable
CREATE TABLE IF NOT EXISTS `account` (
    `account_id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL,
    `email` VARCHAR(512) NULL,
    `phone` VARCHAR(20) NULL,
    `password` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `access_token` TEXT NULL,
    `refresh_token` TEXT NULL,
    `profile_image_url` VARCHAR(191) NULL,
    `profile_video_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`account_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `account_oauth` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `account_id` INTEGER NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `provider_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `account_oauth_account_id_idx`(`account_id`),
    UNIQUE INDEX `account_oauth_provider_provider_id_key`(`provider`, `provider_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `account_role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `account_id` INTEGER NOT NULL,
    `role_type` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `account_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `account_id` INTEGER NOT NULL,

    UNIQUE INDEX `account_info_account_id_key`(`account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `team` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NOT NULL,
    `schedule_type` VARCHAR(191) NULL,
    `invitation_hash` VARCHAR(191) NULL,
    `invitation_created_at` DATETIME(3) NULL,
    `invitation_expire_at` DATETIME(3) NULL,
    `location` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `team_member` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `team_id` INTEGER NOT NULL,
    `account_id` INTEGER NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'MEMBER',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `team_join_request` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `team_id` INTEGER NOT NULL,
    `account_id` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decided_at` DATETIME(3) NULL,
    `decided_by` INTEGER NULL,

    UNIQUE INDEX `team_join_request_team_id_account_id_key`(`team_id`, `account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `shop` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `team_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(20) NULL,
    `capacity` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `task` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `worker_count` INTEGER NOT NULL,
    `current_worker_count` INTEGER NOT NULL DEFAULT 0,
    `start_date_time` DATETIME(3) NOT NULL,
    `end_date_time` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `team_id` INTEGER NOT NULL,
    `shop_id` INTEGER NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `task_employee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_id` INTEGER NOT NULL,
    `account_id` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `applied_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_at` DATETIME(3) NULL,
    `joined_at` DATETIME(3) NULL,
    `left_at` DATETIME(3) NULL,

    UNIQUE INDEX `task_employee_task_id_account_id_key`(`task_id`, `account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `account_id` INTEGER NOT NULL,
    `task_id` INTEGER NULL,
    `type` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `message` TEXT NOT NULL,
    `metadata` JSON NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `funeral_home` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `home_url` VARCHAR(512) NOT NULL,
    `listing_url` VARCHAR(512) NOT NULL,
    `region` VARCHAR(20) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_scraped_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_funeral_home_region`(`region`),
    UNIQUE INDEX `uq_funeral_home_name_region`(`name`, `region`),
    UNIQUE INDEX `uq_funeral_home_listing_url`(`listing_url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `funeral_event` (
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

    INDEX `idx_funeral_event_funeral_home_id`(`funeral_home_id`),
    INDEX `idx_funeral_event_scraped_at`(`scraped_at`),
    INDEX `idx_funeral_event_task_id`(`task_id`),
    UNIQUE INDEX `uq_funeral_event_source_hash`(`source_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `system_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `is_encrypted` BOOLEAN NOT NULL DEFAULT false,
    `description` VARCHAR(500) NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'general',
    `updated_by` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_config_key_key`(`key`),
    INDEX `idx_system_config_category`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `feedback` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `account_id` INTEGER NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `page_url` VARCHAR(500) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    `file_name` VARCHAR(255) NULL,
    `file_mime` VARCHAR(100) NULL,
    `file_data` LONGBLOB NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_feedback_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- identity
-- CreateTable
CREATE TABLE IF NOT EXISTS `identity_user` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `display_name` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `password_hash` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `identity_user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `identity_oauth_account` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `provider_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `identity_oauth_account_provider_provider_id_key`(`provider`, `provider_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `identity_module_link` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `identity_module_link_user_id_module_key`(`user_id`, `module`),
    UNIQUE INDEX `identity_module_link_module_subject_id_key`(`module`, `subject_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- rbac
-- CreateTable
CREATE TABLE IF NOT EXISTS `role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(200) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `resource` VARCHAR(500) NOT NULL,
    `description` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permission_code_key`(`code`),
    INDEX `idx_permission_module`(`module`),
    INDEX `idx_permission_type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `role_permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permission_role_id_idx`(`role_id`),
    INDEX `role_permission_permission_id_idx`(`permission_id`),
    UNIQUE INDEX `role_permission_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `subject_role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `module` VARCHAR(50) NOT NULL,
    `subjectId` VARCHAR(100) NOT NULL,
    `role_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `subject_role_module_subjectId_idx`(`module`, `subjectId`),
    INDEX `subject_role_role_id_idx`(`role_id`),
    UNIQUE INDEX `subject_role_module_subjectId_role_id_key`(`module`, `subjectId`, `role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- aipr
-- CreateTable
CREATE TABLE IF NOT EXISTS `issues` (
    `id` CHAR(36) NOT NULL,
    `status` ENUM('NEW', 'TRIAGED', 'QUEUED', 'PLAN_READY', 'BUILDING', 'PR_OPEN', 'MERGED', 'CLOSED', 'FAILED') NOT NULL DEFAULT 'NEW',
    `title` TEXT NOT NULL,
    `body` LONGTEXT NOT NULL,
    `reporterEmail` VARCHAR(255) NULL,
    `reporterUserId` CHAR(36) NULL,
    `sourceUrl` TEXT NULL,
    `userAgent` TEXT NULL,
    `repoFullName` VARCHAR(255) NULL,
    `baseBranch` VARCHAR(100) NOT NULL DEFAULT 'main',
    `labels` JSON NULL,
    `repositoryId` INTEGER NULL,
    `sourceIssueNumber` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `issues_status_idx`(`status`),
    INDEX `issues_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `attachments` (
    `id` CHAR(36) NOT NULL,
    `issueId` CHAR(36) NOT NULL,
    `s3Key` VARCHAR(512) NOT NULL,
    `mime` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,

    INDEX `attachments_issueId_idx`(`issueId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `planning_docs` (
    `id` CHAR(36) NOT NULL,
    `issueId` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `content` LONGTEXT NOT NULL,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `planning_docs_issueId_idx`(`issueId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `runs` (
    `id` CHAR(36) NOT NULL,
    `issueId` CHAR(36) NOT NULL,
    `kind` ENUM('PLAN', 'BUILD') NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `branchName` VARCHAR(255) NULL,
    `commitSha` CHAR(40) NULL,
    `prNumber` INTEGER NULL,
    `prUrl` TEXT NULL,
    `claudeSessionId` VARCHAR(255) NULL,
    `costUsd` DECIMAL(10, 4) NULL,
    `errorSummary` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `runs_issueId_idx`(`issueId`),
    INDEX `runs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `run_logs` (
    `id` CHAR(36) NOT NULL,
    `runId` CHAR(36) NOT NULL,
    `seq` INTEGER NOT NULL,
    `stream` ENUM('stdout', 'stderr', 'event') NOT NULL,
    `content` TEXT NOT NULL,
    `ts` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `run_logs_runId_seq_idx`(`runId`, `seq`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `pull_requests` (
    `id` CHAR(36) NOT NULL,
    `issueId` CHAR(36) NOT NULL,
    `prNumber` INTEGER NOT NULL,
    `prUrl` TEXT NOT NULL,
    `state` ENUM('open', 'merged', 'closed') NOT NULL DEFAULT 'open',
    `author` VARCHAR(255) NULL,
    `headSha` CHAR(40) NULL,
    `mergedAt` DATETIME(3) NULL,
    `lastEventAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pull_requests_issueId_idx`(`issueId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `admins` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `role` ENUM('SUPER', 'ADMIN') NOT NULL DEFAULT 'ADMIN',
    `passwordHash` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `feedback_rate` (
    `ip` VARCHAR(45) NOT NULL,
    `day` DATE NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`ip`, `day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `audit_log` (
    `id` CHAR(36) NOT NULL,
    `adminId` CHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `target` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_adminId_idx`(`adminId`),
    INDEX `audit_log_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `allowed_origins` (
    `id` CHAR(36) NOT NULL,
    `origin` VARCHAR(255) NOT NULL,
    `appId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `allowed_origins_origin_key`(`origin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `git_providers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('GITHUB', 'GITLAB') NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `baseUrl` VARCHAR(255) NOT NULL,
    `token` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `repositories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerId` INTEGER NOT NULL,
    `remoteId` VARCHAR(100) NOT NULL,
    `fullName` VARCHAR(255) NOT NULL,
    `defaultBranch` VARCHAR(100) NOT NULL DEFAULT 'main',
    `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `webUrl` TEXT NOT NULL,
    `autoPilot` BOOLEAN NOT NULL DEFAULT false,
    `planRunner` ENUM('CLI', 'SDK') NOT NULL DEFAULT 'SDK',
    `buildRunner` ENUM('CLI', 'SDK') NOT NULL DEFAULT 'CLI',
    `syncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `repositories_providerId_remoteId_key`(`providerId`, `remoteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey issues_repositoryId_fkey
SET @schema_history_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'issues' AND CONSTRAINT_NAME = 'issues_repositoryId_fkey');
SET @schema_history_sql = IF(@schema_history_fk = 0, 'ALTER TABLE `issues` ADD CONSTRAINT `issues_repositoryId_fkey` FOREIGN KEY (`repositoryId`) REFERENCES `repositories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE schema_history_stmt FROM @schema_history_sql;
EXECUTE schema_history_stmt;
DEALLOCATE PREPARE schema_history_stmt;

-- AddForeignKey attachments_issueId_fkey
SET @schema_history_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND CONSTRAINT_NAME = 'attachments_issueId_fkey');
SET @schema_history_sql = IF(@schema_history_fk = 0, 'ALTER TABLE `attachments` ADD CONSTRAINT `attachments_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `issues`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE schema_history_stmt FROM @schema_history_sql;
EXECUTE schema_history_stmt;
DEALLOCATE PREPARE schema_history_stmt;

-- AddForeignKey planning_docs_issueId_fkey
SET @schema_history_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'planning_docs' AND CONSTRAINT_NAME = 'planning_docs_issueId_fkey');
SET @schema_history_sql = IF(@schema_history_fk = 0, 'ALTER TABLE `planning_docs` ADD CONSTRAINT `planning_docs_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `issues`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE schema_history_stmt FROM @schema_history_sql;
EXECUTE schema_history_stmt;
DEALLOCATE PREPARE schema_history_stmt;

-- AddForeignKey runs_issueId_fkey
SET @schema_history_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'runs' AND CONSTRAINT_NAME = 'runs_issueId_fkey');
SET @schema_history_sql = IF(@schema_history_fk = 0, 'ALTER TABLE `runs` ADD CONSTRAINT `runs_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `issues`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE schema_history_stmt FROM @schema_history_sql;
EXECUTE schema_history_stmt;
DEALLOCATE PREPARE schema_history_stmt;

-- AddForeignKey run_logs_runId_fkey
SET @schema_history_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'run_logs' AND CONSTRAINT_NAME = 'run_logs_runId_fkey');
SET @schema_history_sql = IF(@schema_history_fk = 0, 'ALTER TABLE `run_logs` ADD CONSTRAINT `run_logs_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE schema_history_stmt FROM @schema_history_sql;
EXECUTE schema_history_stmt;
DEALLOCATE PREPARE schema_history_stmt;

-- AddForeignKey pull_requests_issueId_fkey
SET @schema_history_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'pull_requests' AND CONSTRAINT_NAME = 'pull_requests_issueId_fkey');
SET @schema_history_sql = IF(@schema_history_fk = 0, 'ALTER TABLE `pull_requests` ADD CONSTRAINT `pull_requests_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `issues`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE schema_history_stmt FROM @schema_history_sql;
EXECUTE schema_history_stmt;
DEALLOCATE PREPARE schema_history_stmt;

-- AddForeignKey audit_log_adminId_fkey
SET @schema_history_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log' AND CONSTRAINT_NAME = 'audit_log_adminId_fkey');
SET @schema_history_sql = IF(@schema_history_fk = 0, 'ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE schema_history_stmt FROM @schema_history_sql;
EXECUTE schema_history_stmt;
DEALLOCATE PREPARE schema_history_stmt;

-- AddForeignKey audit_log_target_fkey
SET @schema_history_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log' AND CONSTRAINT_NAME = 'audit_log_target_fkey');
SET @schema_history_sql = IF(@schema_history_fk = 0, 'ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_target_fkey` FOREIGN KEY (`target`) REFERENCES `issues`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE schema_history_stmt FROM @schema_history_sql;
EXECUTE schema_history_stmt;
DEALLOCATE PREPARE schema_history_stmt;

-- AddForeignKey repositories_providerId_fkey
SET @schema_history_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'repositories' AND CONSTRAINT_NAME = 'repositories_providerId_fkey');
SET @schema_history_sql = IF(@schema_history_fk = 0, 'ALTER TABLE `repositories` ADD CONSTRAINT `repositories_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `git_providers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE schema_history_stmt FROM @schema_history_sql;
EXECUTE schema_history_stmt;
DEALLOCATE PREPARE schema_history_stmt;

-- aviation
-- CreateTable
CREATE TABLE IF NOT EXISTS `nav_terminals` (
    `id` VARCHAR(10) NOT NULL,
    `name_ko` VARCHAR(100) NOT NULL,
    `name_en` VARCHAR(100) NOT NULL,
    `airport_code` VARCHAR(3) NOT NULL DEFAULT 'ICN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `nav_floors` (
    `id` VARCHAR(20) NOT NULL,
    `terminal_id` VARCHAR(10) NOT NULL,
    `floor_number` INTEGER NOT NULL,
    `map_svg_path` VARCHAR(500) NULL,
    `map_image_path` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nav_floors_terminal_id_floor_number_idx`(`terminal_id`, `floor_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `nav_waypoints` (
    `id` VARCHAR(50) NOT NULL,
    `terminal_id` VARCHAR(10) NOT NULL,
    `floor_number` INTEGER NOT NULL,
    `type` ENUM('COUNTER', 'GATE', 'IMMIGRATION', 'SECURITY', 'ELEVATOR', 'ESCALATOR', 'ENTRANCE', 'INFO', 'TRANSIT', 'RESTROOM', 'RESTAURANT', 'SHOP', 'LOUNGE') NOT NULL,
    `name_ko` VARCHAR(200) NOT NULL,
    `name_en` VARCHAR(200) NULL,
    `map_x` INTEGER NOT NULL,
    `map_y` INTEGER NOT NULL,
    `gps_lat` DECIMAL(10, 8) NULL,
    `gps_lon` DECIMAL(11, 8) NULL,
    `metadata` JSON NULL,
    `is_accessible` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nav_waypoints_type_idx`(`type`),
    INDEX `nav_waypoints_terminal_id_floor_number_idx`(`terminal_id`, `floor_number`),
    INDEX `nav_waypoints_is_accessible_idx`(`is_accessible`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `nav_waypoint_connections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `from_waypoint_id` VARCHAR(50) NOT NULL,
    `to_waypoint_id` VARCHAR(50) NOT NULL,
    `distance_meters` DECIMAL(6, 2) NOT NULL,
    `walking_time_seconds` INTEGER NOT NULL,
    `is_accessible` BOOLEAN NOT NULL DEFAULT true,
    `connection_type` ENUM('WALK', 'ELEVATOR', 'ESCALATOR', 'STAIRS') NOT NULL DEFAULT 'WALK',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nav_waypoint_connections_from_waypoint_id_idx`(`from_waypoint_id`),
    INDEX `nav_waypoint_connections_to_waypoint_id_idx`(`to_waypoint_id`),
    INDEX `nav_waypoint_connections_connection_type_idx`(`connection_type`),
    UNIQUE INDEX `unique_connection`(`from_waypoint_id`, `to_waypoint_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `nav_flight_gates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `flight_number` VARCHAR(10) NOT NULL,
    `airline_code` VARCHAR(3) NOT NULL,
    `airline_name_ko` VARCHAR(100) NULL,
    `airline_name_en` VARCHAR(100) NULL,
    `departure_time` DATETIME(3) NOT NULL,
    `destination_code` VARCHAR(3) NULL,
    `destination_name_ko` VARCHAR(100) NULL,
    `destination_name_en` VARCHAR(100) NULL,
    `terminal_id` VARCHAR(10) NOT NULL,
    `counter_zone` VARCHAR(5) NULL,
    `counter_numbers` VARCHAR(20) NULL,
    `gate_number` VARCHAR(10) NULL,
    `gate_waypoint_id` VARCHAR(50) NULL,
    `counter_waypoint_id` VARCHAR(50) NULL,
    `boarding_time` DATETIME(3) NULL,
    `last_call_time` DATETIME(3) NULL,
    `status` ENUM('SCHEDULED', 'BOARDING', 'DEPARTED', 'CANCELLED', 'DELAYED') NOT NULL DEFAULT 'SCHEDULED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nav_flight_gates_flight_number_departure_time_idx`(`flight_number`, `departure_time`),
    INDEX `nav_flight_gates_airline_code_idx`(`airline_code`),
    INDEX `nav_flight_gates_departure_time_idx`(`departure_time`),
    INDEX `nav_flight_gates_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `nav_user_locations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `telegram_user_id` BIGINT NOT NULL,
    `terminal_id` VARCHAR(10) NULL,
    `floor_number` INTEGER NULL,
    `nearest_waypoint_id` VARCHAR(50) NULL,
    `gps_lat` DECIMAL(10, 8) NULL,
    `gps_lon` DECIMAL(11, 8) NULL,
    `gps_accuracy_meters` INTEGER NULL,
    `location_source` ENUM('GPS', 'MANUAL', 'WIFI', 'BEACON') NOT NULL DEFAULT 'MANUAL',
    `timestamp` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `nav_user_locations_telegram_user_id_idx`(`telegram_user_id`),
    INDEX `nav_user_locations_timestamp_idx`(`timestamp`),
    INDEX `nav_user_locations_terminal_id_floor_number_idx`(`terminal_id`, `floor_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `nav_navigation_routes` (
    `id` VARCHAR(36) NOT NULL,
    `telegram_user_id` BIGINT NOT NULL,
    `flight_number` VARCHAR(10) NULL,
    `start_waypoint_id` VARCHAR(50) NOT NULL,
    `end_waypoint_id` VARCHAR(50) NOT NULL,
    `route_waypoints` JSON NOT NULL,
    `total_distance_meters` DECIMAL(7, 2) NULL,
    `estimated_time_minutes` INTEGER NULL,
    `map_image_path` VARCHAR(500) NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nav_navigation_routes_telegram_user_id_status_idx`(`telegram_user_id`, `status`),
    INDEX `nav_navigation_routes_flight_number_idx`(`flight_number`),
    INDEX `nav_navigation_routes_status_idx`(`status`),
    INDEX `nav_navigation_routes_started_at_idx`(`started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT NOT NULL,
    `username` VARCHAR(255) NULL,
    `first_name` VARCHAR(255) NULL,
    `last_name` VARCHAR(255) NULL,
    `language_code` VARCHAR(10) NULL DEFAULT 'en',
    `is_subscribed` BOOLEAN NULL DEFAULT true,
    `subscribed_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unsubscribed_at` DATETIME(3) NULL,
    `total_messages_received` INTEGER NULL DEFAULT 0,
    `last_activity` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `users_is_subscribed_idx`(`is_subscribed`),
    INDEX `users_last_activity_idx`(`last_activity`),
    INDEX `users_language_code_idx`(`language_code`),
    INDEX `users_username_idx`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
