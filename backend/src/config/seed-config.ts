/**
 * Seed script: populate system_config table from current .env values.
 * Idempotent — runs upsert so existing DB values are preserved unless --force flag is passed.
 *
 * Usage:
 *   npx ts-node src/config/seed-config.ts
 *   npx ts-node src/config/seed-config.ts --force   # overwrite existing DB values
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { configService } from './config-service';

interface SeedEntry {
  key: string;
  category: string;
  description: string;
}

export const SEED_KEYS: SeedEntry[] = [
  // JWT
  { key: 'JWT_SECRET',             category: 'jwt',      description: '공유 JWT 서명 시크릿 (workschd)' },
  { key: 'JWT_ACCESS_SECRET',      category: 'jwt',      description: 'Access 토큰 서명 시크릿' },
  { key: 'JWT_REFRESH_SECRET',     category: 'jwt',      description: 'Refresh 토큰 서명 시크릿' },
  { key: 'ACCESS_TOKEN_EXPIRY',    category: 'jwt',      description: 'Access 토큰 만료 시간 (예: 15m)' },
  { key: 'REFRESH_TOKEN_EXPIRY',   category: 'jwt',      description: 'Refresh 토큰 만료 시간 (예: 7d)' },
  // OAuth2
  { key: 'GOOGLE_CLIENT_ID',       category: 'oauth2',   description: 'Google OAuth2 클라이언트 ID' },
  { key: 'GOOGLE_CLIENT_SECRET',   category: 'oauth2',   description: 'Google OAuth2 클라이언트 시크릿' },
  { key: 'GOOGLE_REDIRECT_URI',    category: 'oauth2',   description: 'Google OAuth2 콜백 URI' },
  { key: 'KAKAO_REST_API_KEY',     category: 'oauth2',   description: 'Kakao REST API 키' },
  { key: 'KAKAO_CLIENT_SECRET',    category: 'oauth2',   description: 'Kakao 클라이언트 시크릿' },
  { key: 'KAKAO_REDIRECT_URI',     category: 'oauth2',   description: 'Kakao 콜백 URI' },
  // SMTP
  { key: 'SMTP_HOST',              category: 'smtp',     description: 'SMTP 서버 호스트' },
  { key: 'SMTP_PORT',              category: 'smtp',     description: 'SMTP 서버 포트' },
  { key: 'SMTP_USER',              category: 'smtp',     description: 'SMTP 인증 사용자명' },
  { key: 'SMTP_PASS',              category: 'smtp',     description: 'SMTP 인증 비밀번호' },
  { key: 'SMTP_FROM',              category: 'smtp',     description: 'SMTP 발신자 이메일' },
  // SMS (Solapi)
  { key: 'SOLAPI_API_KEY',         category: 'sms',      description: 'Solapi API 키' },
  { key: 'SOLAPI_API_SECRET',      category: 'sms',      description: 'Solapi API 시크릿' },
  { key: 'SOLAPI_SENDER_PHONE',    category: 'sms',      description: 'Solapi 발신 전화번호' },
  { key: 'SOLAPI_KAKAO_PFID',      category: 'sms',      description: 'Solapi 카카오 PF ID' },
  // Finance APIs
  { key: 'BOK_API_KEY',            category: 'finance',  description: '한국은행 ECOS API 키' },
  { key: 'DART_API_KEY',           category: 'finance',  description: 'DART (금융감독원) API 키' },
  { key: 'FRED_API_KEY',           category: 'finance',  description: 'FRED (St. Louis Fed) API 키' },
  { key: 'DATA_GO_KR_SERVICE_KEY', category: 'finance',  description: '공공데이터포털 인증키 (관세청 수출입 등)' },
  { key: 'KIS_API_KEY',            category: 'finance',  description: 'KIS (한국투자증권) API 키' },
  { key: 'KIS_API_SECRET',         category: 'finance',  description: 'KIS API 시크릿' },
  // App
  { key: 'FRONTEND_URL',           category: 'app',      description: '프론트엔드 기본 URL' },
  { key: 'ALLOWED_ORIGINS',        category: 'app',      description: '허용된 CORS origins (쉼표 구분)' },
  { key: 'BACKEND_PUBLIC_URL',     category: 'app',      description: '공개 백엔드 URL' },
  { key: 'CORS_ENABLED',           category: 'app',      description: 'CORS 활성화 (true/false)' },
  { key: 'HELMET_ENABLED',         category: 'app',      description: 'Helmet 활성화 (true/false)' },
  { key: 'BASE_PATH',              category: 'app',      description: '로컬 파일 저장 기본 경로 (aviation 등)' },
  // Scraper
  { key: 'WORKSCHD_SCRAPER_ENABLED',                     category: 'scraper', description: '스크래퍼 스케줄러 활성화 (true/false)' },
  { key: 'WORKSCHD_SCRAPER_CRON',                        category: 'scraper', description: '스크래퍼 cron 표현식' },
  // Primary-source macro / market data ingestion (official APIs only)
  { key: 'PD_INGESTION_ENABLED',       category: 'primary_data', description: '1차 출처 데이터 수집 스케줄러 (true/false)' },
  { key: 'PD_INGESTION_CRON',          category: 'primary_data', description: '수집 cron (KST 기본 06:30)' },
  { key: 'PD_INGESTION_TIMEZONE',      category: 'primary_data', description: '수집 스케줄 타임존' },
  { key: 'PD_ADAPTERS',                category: 'primary_data', description: '쉼표 구분 어댑터 ID 필터 (비우면 전체)' },
  { key: 'PD_TWSE_SYMBOLS',            category: 'primary_data', description: 'TWSE 월매출 종목 필터 (비우면 전체)' },
  { key: 'PD_TWSE_MASTER_LIMIT',       category: 'primary_data', description: 'TWSE 마스터 최대 행 (0=전체)' },
  { key: 'PD_FRED_CREDIT_SERIES',      category: 'primary_data', description: 'FRED 신용 스프레드 시리즈 ID 목록' },
  { key: 'PD_FRED_LOOKBACK_DAYS',      category: 'primary_data', description: 'FRED 조회 일수' },
  { key: 'PD_KOREA_TRADE_UNIVERSE_JSON', category: 'primary_data', description: '관세청 HS×국가 수집 유니버스 JSON' },
  { key: 'PD_KOREA_TRADE_MONTHS_BACK', category: 'primary_data', description: '관세청 조회 개월 수' },
  { key: 'PD_DART_CORP_LIMIT',         category: 'primary_data', description: 'DART corpCode 파싱 최대 건수' },
  { key: 'PD_DART_DISCLOSURE_DAYS',    category: 'primary_data', description: 'DART 공시 인덱스 조회 일수' },
  { key: 'WORKSCHD_SCRAPER_LISTING_URL_OVERRIDES_JSON',  category: 'scraper', description: '장례식장 URL 오버라이드 JSON' },
  // Telegram
  { key: 'TELEGRAM_BOT_TOKEN',     category: 'telegram', description: 'Telegram 봇 토큰' },
  { key: 'TELEGRAM_WEBHOOK_URL',   category: 'telegram', description: 'Telegram 웹훅 URL' },
  // AI
  { key: 'GEMINI_API_KEY',         category: 'ai',       description: 'Google Gemini API 키' },
  { key: 'CLAUDE_API_KEY',         category: 'ai',       description: 'Anthropic Claude API 키' },
  // Security
  { key: 'MFA_ENCRYPTION_KEY',     category: 'security', description: 'MFA 백업 코드 암호화 키' },
  { key: 'API_RATE_LIMIT_WINDOW_MS', category: 'security', description: 'API rate limit window (ms)' },
  { key: 'API_RATE_LIMIT_MAX_REQUESTS', category: 'security', description: 'API rate limit max requests per window' },
  // Notifications
  { key: 'SLACK_WEBHOOK_URL',      category: 'notifications', description: 'Slack incoming webhook URL' },
  { key: 'LINEAR_API_KEY',         category: 'notifications', description: 'Linear Personal API Key — 피드백 등록 시 이슈 생성 (미설정 시 생략)' },
  { key: 'LINEAR_TEAM_ID',         category: 'notifications', description: '피드백 이슈를 생성할 Linear 팀 ID(UUID)' },
  { key: 'LINEAR_BUG_LABEL_ID',    category: 'notifications', description: '불편사항(BUG) 이슈 Linear 라벨 ID (선택)' },
  { key: 'LINEAR_IMPROVEMENT_LABEL_ID', category: 'notifications', description: '개선사항(IMPROVEMENT) 이슈 Linear 라벨 ID (선택)' },
  // Scheduler
  { key: 'ENABLE_SCHEDULER',       category: 'scheduler', description: '데이터 수집 스케줄러 활성화' },
  { key: 'SCHEDULER_TIMEZONE',     category: 'scheduler', description: '스케줄러 타임존' },
  { key: 'DATA_COLLECTION_CRON',   category: 'scheduler', description: '데이터 수집 cron 표현식' },
  { key: 'WEEKEND_DATA_COLLECTION', category: 'scheduler', description: '주말 데이터 수집 (true/false)' },
  // Cache
  { key: 'ENABLE_CACHE',           category: 'cache',    description: '캐시 활성화 (true/false)' },
  { key: 'CACHE_TTL_MINUTES',      category: 'cache',    description: '캐시 TTL (분)' },
  // Logging
  { key: 'LOG_LEVEL',              category: 'logging',  description: '로그 레벨 (info/debug/warn/error)' },
  { key: 'LOG_FILE_PATH',          category: 'logging',  description: '로그 파일 경로' },
  // Swagger docs
  { key: 'SWAGGER_DEV_URL',        category: 'docs',     description: 'Swagger 개발 서버 URL' },
  { key: 'SWAGGER_PROD_URL',       category: 'docs',     description: 'Swagger 프로덕션 서버 URL' },
];

export async function seedConfig(force = false) {
  console.log(`[seed-config] Starting seed (force=${force})...`);

  // Initialize configService to connect to DB (no DB read needed for seeding)
  // We bypass initialize() and directly use set() which does upsert
  let seeded = 0;
  let skipped = 0;

  for (const entry of SEED_KEYS) {
    const envValue = process.env[entry.key];
    if (!envValue) {
      console.log(`  SKIP (not in .env): ${entry.key}`);
      skipped++;
      continue;
    }

    if (!force) {
      // Check if already exists in DB
      const { workschdPrisma } = await import('./prisma');
      const existing = await workschdPrisma.systemConfig.findUnique({ where: { key: entry.key } });
      if (existing) {
        console.log(`  SKIP (already in DB): ${entry.key}`);
        skipped++;
        continue;
      }
    }

    await configService.set(entry.key, envValue, {
      description: entry.description,
      category: entry.category,
      updatedBy: 'seed-script',
    });

    console.log(`  SEEDED: ${entry.key}`);
    seeded++;
  }

  console.log(`\n[seed-config] Done. seeded=${seeded}, skipped=${skipped}`);
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  seedConfig(force)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed-config] Failed:', err);
      process.exit(1);
    });
}

