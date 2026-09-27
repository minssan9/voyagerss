-- ============================================================================
-- Seed data for workschd database schema
-- Passwords for accounts: 'password123!' (bcrypt hash: $2b$10$jsm2ltEER2WCncZkCpTFq.JbvSblPxkGRsLieVCdh/g7wpi3LnHRK)
-- ============================================================================

-- Accounts
INSERT IGNORE INTO `account` (`account_id`, `username`, `email`, `phone`, `password`, `status`, `created_at`, `updated_at`) VALUES
(1, 'leader', 'leader@example.com', '010-1234-5678', '$2b$10$jsm2ltEER2WCncZkCpTFq.JbvSblPxkGRsLieVCdh/g7wpi3LnHRK', 'ACTIVE', NOW(), NOW()),
(2, 'member', 'member@example.com', '010-8765-4321', '$2b$10$jsm2ltEER2WCncZkCpTFq.JbvSblPxkGRsLieVCdh/g7wpi3LnHRK', 'ACTIVE', NOW(), NOW()),
(3, 'admin', 'admin@workschd.test', '010-0000-0003', '$2b$10$jsm2ltEER2WCncZkCpTFq.JbvSblPxkGRsLieVCdh/g7wpi3LnHRK', 'ACTIVE', NOW(), NOW());

-- Account Roles
INSERT IGNORE INTO `account_role` (`id`, `account_id`, `role_type`) VALUES
(1, 1, 'TEAM_LEADER'),
(2, 2, 'MEMBER'),
(3, 3, 'ADMIN');

-- Teams
INSERT IGNORE INTO `team` (`id`, `name`, `region`, `schedule_type`, `created_at`, `updated_at`) VALUES
(1, '인천 지원 1팀', 'INCHEON', 'THREE_SHIFT', NOW(), NOW());

-- Team Members
INSERT IGNORE INTO `team_member` (`id`, `team_id`, `account_id`, `role`, `joined_at`) VALUES
(1, 1, 1, 'LEADER', NOW()),
(2, 1, 2, 'MEMBER', NOW());

-- Shops
INSERT IGNORE INTO `shop` (`id`, `team_id`, `name`, `district`, `status`, `address`, `phone`, `capacity`, `created_at`, `updated_at`) VALUES
(1, 1, '인천적십자병원 장례식장', '연수구', 'ACTIVE', '인천광역시 연수구 원인재로 263 (연수동,인천적십자병원장례식장)', NULL, 9, NOW(), NOW());

-- Tasks
INSERT IGNORE INTO `task` (`id`, `title`, `description`, `worker_count`, `current_worker_count`, `start_date_time`, `end_date_time`, `status`, `team_id`, `shop_id`, `created_by`, `created_at`, `updated_at`) VALUES
(1, '장례식장 일손 돕기', '조문객 안내 및 서빙 지원', 2, 0, DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), 'OPEN', 1, 1, 1, NOW(), NOW());

-- Funeral Homes
INSERT IGNORE INTO `funeral_home` (`id`, `name`, `home_url`, `listing_url`, `region`, `is_active`, `created_at`, `updated_at`) VALUES
(1, '인천적십자병원 장례식장', 'http://www.rchfuneral.co.kr', 'http://www.rchfuneral.co.kr', 'INCHEON', 1, NOW(), NOW());
