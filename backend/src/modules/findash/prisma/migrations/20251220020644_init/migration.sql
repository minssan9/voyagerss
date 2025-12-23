-- CreateTable
CREATE TABLE `MarketAsset` (
    `id` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assetId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `close` DOUBLE NOT NULL,
    `volume` BIGINT NOT NULL,

    INDEX `MarketHistory_assetId_date_idx`(`assetId`, `date`),
    UNIQUE INDEX `MarketHistory_assetId_date_key`(`assetId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MarketHistory` ADD CONSTRAINT `MarketHistory_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `MarketAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
