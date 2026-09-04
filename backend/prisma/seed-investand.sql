-- ============================================================================
-- Seed data for investand database schema
-- Password for admin: 'password123!' (bcrypt hash: $2b$10$EpJui0VBHxCqPNv9zR5theW6Z59nU29E3P9.Oq8n6Gz5g.cZ3EwqS)
-- ============================================================================

-- Admin User
INSERT IGNORE INTO `admin_users` (`id`, `username`, `email`, `passwordHash`, `role`, `permissions`, `isActive`, `isLocked`, `failedAttempts`, `passwordChangedAt`, `mustChangePassword`, `mfaEnabled`, `mfaBackupCodes`, `createdAt`, `updatedAt`) VALUES
('cuid-admin-1', 'admin', 'admin@investand.com', '$2b$10$EpJui0VBHxCqPNv9zR5theW6Z59nU29E3P9.Oq8n6Gz5g.cZ3EwqS', 'SUPER_ADMIN', '*', 1, 0, 0, NOW(), 0, 0, '[]', NOW(), NOW());

-- FearGreedIndex (past 5 days)
INSERT IGNORE INTO `sentiment_fear_greed_index` (`id`, `date`, `value`, `level`, `confidence`, `priceMomentum`, `investorSentiment`, `putCallRatio`, `volatilityIndex`, `safeHavenDemand`, `createdAt`, `updatedAt`) VALUES
(1, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 45, 'NEUTRAL', 75, 40, 50, 45, 42, 48, NOW(), NOW()),
(2, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 48, 'NEUTRAL', 78, 43, 53, 47, 40, 50, NOW(), NOW()),
(3, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 55, 'GREED', 80, 50, 60, 52, 38, 55, NOW(), NOW()),
(4, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 62, 'GREED', 82, 58, 65, 57, 35, 60, NOW(), NOW()),
(5, CURDATE(), 65, 'GREED', 85, 60, 70, 60, 32, 62, NOW(), NOW());

-- ExchangeRateData
INSERT IGNORE INTO `macro_exchange_rate_data` (`id`, `date`, `usdKrw`, `eurKrw`, `jpyKrw`, `cnyKrw`, `createdAt`, `updatedAt`) VALUES
(1, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 1320.50, 1425.20, 8.8500, 182.4000, NOW(), NOW()),
(2, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 1322.10, 1428.40, 8.8700, 182.6000, NOW(), NOW()),
(3, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 1318.90, 1422.10, 8.8300, 181.9000, NOW(), NOW()),
(4, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 1325.40, 1431.80, 8.9100, 183.1000, NOW(), NOW()),
(5, CURDATE(), 1328.00, 1435.00, 8.9300, 183.5000, NOW(), NOW());

-- InterestRateData
INSERT IGNORE INTO `macro_interest_rate_data` (`id`, `date`, `baseRate`, `callRate`, `cd91Rate`, `treasuryBond3Y`, `treasuryBond10Y`, `createdAt`, `updatedAt`) VALUES
(1, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 3.50, 3.52, 3.65, 3.42, 3.55, NOW(), NOW()),
(2, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 3.50, 3.51, 3.64, 3.40, 3.53, NOW(), NOW()),
(3, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 3.50, 3.53, 3.66, 3.45, 3.58, NOW(), NOW()),
(4, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 3.50, 3.52, 3.65, 3.41, 3.54, NOW(), NOW()),
(5, CURDATE(), 3.50, 3.50, 3.63, 3.39, 3.52, NOW(), NOW());
