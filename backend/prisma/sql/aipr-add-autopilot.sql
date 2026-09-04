-- AIPR database: run against DATABASE_URL_AIPR
-- npx prisma db execute --file=./prisma/sql/aipr-add-autopilot.sql --schema=./prisma/aipr.prisma

ALTER TABLE `repositories`
    ADD COLUMN `autoPilot` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `audit_log`
    MODIFY COLUMN `adminId` CHAR(36) NULL;
