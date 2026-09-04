-- AIPR database: run against DATABASE_URL_AIPR
-- npx prisma db execute --file=./prisma/sql/aipr-add-runner-mode.sql --schema=./prisma/aipr.prisma

ALTER TABLE `repositories`
    ADD COLUMN `planRunner` ENUM('CLI', 'SDK') NOT NULL DEFAULT 'SDK',
    ADD COLUMN `buildRunner` ENUM('CLI', 'SDK') NOT NULL DEFAULT 'CLI';
