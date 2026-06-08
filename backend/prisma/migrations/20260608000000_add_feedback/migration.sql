-- CreateTable
CREATE TABLE `feedback` (
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
