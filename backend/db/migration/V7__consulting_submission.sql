-- AI 컨설팅 랜딩: 기업/시스템 분석용 문서 제출
CREATE TABLE IF NOT EXISTS `consulting_submission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(20) NOT NULL,
    `company_name` VARCHAR(200) NOT NULL,
    `contact_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `message` TEXT NULL,
    `locale` VARCHAR(10) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    `ip_address` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_consulting_submission_created`(`created_at`),
    INDEX `idx_consulting_submission_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consulting_submission_file` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `submission_id` INTEGER NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_mime` VARCHAR(150) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `file_data` LONGBLOB NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_consulting_submission_file_submission`(`submission_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_consulting_submission_file_submission` FOREIGN KEY (`submission_id`)
        REFERENCES `consulting_submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
