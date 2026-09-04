-- AIPR schema additions for OMP SDK + pageContext
-- npx prisma db execute --file=./prisma/sql/aipr-omp-migration.sql --schema=./prisma/aipr.prisma

ALTER TABLE `issues` ADD COLUMN `pageContext` JSON NULL;
ALTER TABLE `runs` ADD COLUMN `agentProvider` VARCHAR(50) NULL;
ALTER TABLE `runs` ADD COLUMN `agentSessionId` VARCHAR(255) NULL;
ALTER TABLE `run_logs` ADD COLUMN `meta` JSON NULL;
