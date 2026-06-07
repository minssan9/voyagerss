-- AIPR database: run against DATABASE_URL_AIPR
-- npx prisma db execute --file=./prisma/sql/aipr-system-config.sql --schema=./prisma/aipr.prisma

CREATE TABLE IF NOT EXISTS `system_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `is_encrypted` BOOLEAN NOT NULL DEFAULT false,
    `description` VARCHAR(500) NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'general',
    `updated_by` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `system_config_key_key`(`key`),
    INDEX `idx_aipr_system_config_category`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
