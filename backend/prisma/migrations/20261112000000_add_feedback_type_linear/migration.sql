-- AlterTable: 불편사항/개선사항 유형 + Linear 이슈 연동
ALTER TABLE `feedback`
    ADD COLUMN `type` VARCHAR(20) NOT NULL DEFAULT 'IMPROVEMENT',
    ADD COLUMN `linear_issue_id` VARCHAR(64) NULL,
    ADD COLUMN `linear_issue_url` VARCHAR(500) NULL;
