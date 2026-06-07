-- Frontend public config seed (workschd DB → system_config table, category='frontend')
-- Endpoint GET /api/workschd/config/public returns all rows in this category (no auth).
--
-- Run against workschd DB:
--   npx prisma db execute --file=./prisma/sql/seed-frontend-config.sql --schema=./prisma/workschd.prisma
--
-- Notes:
--   is_encrypted=1 키는 DB에 평문 저장됨.
--   암호화 원하면 seed script 재실행:
--     npx ts-node src/config/seed-config.ts --force
-- ============================================================

INSERT IGNORE INTO `system_config`
  (`key`, `value`, `is_encrypted`, `description`, `category`, `updated_by`, `created_at`, `updated_at`)
VALUES

-- CDN (not sensitive, used in Login.vue for social login button images)
('VITE_CDN_URL',
 'https://cdn.voyagerss.com',
 0,
 'CDN 기본 URL (프론트엔드 이미지/에셋)',
 'frontend', 'sql-seed', NOW(), NOW()),

-- Gemini AI (sensitive — browser-side key; consider server-side proxy instead)
('VITE_GEMINI_API_KEY',
 'AIzaSyCf7H4NgUhScGv7V6VThD5MXbZU5goVH10',
 1,
 'Google Gemini API 키 (프론트엔드용)',
 'frontend', 'sql-seed', NOW(), NOW()),

-- Kakao OAuth client ID
('VITE_KAKAO_CLIENT_ID',
 '',
 0,
 'Kakao OAuth2 클라이언트 ID',
 'frontend', 'sql-seed', NOW(), NOW()),

-- Channel.io plugin key
('VITE_CHANNEL_TALK_PLUGIN_KEY',
 '',
 0,
 'Channel.io 플러그인 키',
 'frontend', 'sql-seed', NOW(), NOW()),

-- Public data API keys
('VITE_DATA_ASSEMBLY_KEY',
 '',
 1,
 '공공데이터포털 국회 API 키',
 'frontend', 'sql-seed', NOW(), NOW()),

('VITE_DATA_PUBLIC_KEY',
 '',
 1,
 '공공데이터포털 공통 API 키',
 'frontend', 'sql-seed', NOW(), NOW());
