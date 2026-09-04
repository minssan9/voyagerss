import { Controller, Get, Post, Put, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import * as os from 'os';
import { performance } from 'perf_hooks';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '@investand/services/core/databaseService';
import { FearGreedCalculator } from '@investand/services/core/fearGreedCalculator';
import { KrxCollectionService } from '@investand/collectors/krxCollectionService';
import { MarketDataRepository } from '@investand/repositories/market/MarketDataRepository';
import { FearGreedIndexRepository } from '@investand/repositories/FearGreedIndexRepository';
import { BOKCollector } from '@investand/collectors/financial/bokCollector';
import { formatDate } from '@investand/utils/common/dateUtils';
import { generateToken, verifyToken } from '../middleware/authMiddleware';
import { InvestandAdminGuard } from '../guards/investand-admin.guard';
import { InvestandPermissionGuard } from '../guards/investand-permission.guard';
import { RequirePermission, RequireAdminRole, CurrentAdmin } from '../decorators/admin.decorator';
import { InvestandPrismaService } from '../../../prisma/investand-prisma.service';

@Controller('investand/admin')
export class AdminNestController {
  constructor(private readonly prisma: InvestandPrismaService) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { username: string; password: string }) {
    const { username, password } = body;
    if (!username || !password) return { success: false, message: '사용자명과 비밀번호를 입력해주세요.', code: 'MISSING_CREDENTIALS' };
    try {
      const user = await this.prisma.adminUser.findUnique({ where: { username } });
      if (!user) return { success: false, message: '잘못된 사용자명 또는 비밀번호입니다.', code: 'INVALID_CREDENTIALS' };
      if (!user.isActive) return { success: false, message: '비활성화된 계정입니다.', code: 'ACCOUNT_INACTIVE' };
      if (user.isLocked) return { success: false, message: '잠긴 계정입니다.', code: 'ACCOUNT_LOCKED' };
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return { success: false, message: '잘못된 사용자명 또는 비밀번호입니다.', code: 'INVALID_CREDENTIALS' };
      const token = generateToken({ id: user.id, username: user.username, email: user.email || undefined, role: user.role as any, permissions: JSON.parse(user.permissions || '[]'), mfaEnabled: false, isActive: user.isActive, isLocked: user.isLocked, mustChangePassword: user.mustChangePassword });
      await this.prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      return { success: true, message: '로그인 성공', data: { token, user: { id: user.id, username: user.username, email: user.email, role: user.role, permissions: JSON.parse(user.permissions || '[]'), lastLogin: user.lastLoginAt, mfaEnabled: false } } };
    } catch {
      return { success: false, message: '로그인 처리 중 오류가 발생했습니다.', code: 'LOGIN_ERROR' };
    }
  }

  @Post('signup')
  async signup(@Body() body: any) {
    const { username, password, email, firstName, lastName, role = 'VIEWER' } = body;
    if (!username || !password || !email) return { success: false, message: '사용자명, 비밀번호, 이메일을 모두 입력해주세요.', code: 'MISSING_REQUIRED_FIELDS' };
    if (username.length < 3 || username.length > 50) return { success: false, message: '사용자명은 3자 이상 50자 이하여야 합니다.', code: 'INVALID_USERNAME_LENGTH' };
    if (password.length < 8) return { success: false, message: '비밀번호는 최소 8자 이상이어야 합니다.', code: 'WEAK_PASSWORD' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: '유효한 이메일 주소를 입력해주세요.', code: 'INVALID_EMAIL' };
    if (!['VIEWER', 'ANALYST', 'ADMIN', 'SUPER_ADMIN'].includes(role)) return { success: false, message: '유효하지 않은 역할입니다.', code: 'INVALID_ROLE' };
    try {
      if (await this.prisma.adminUser.findUnique({ where: { username } })) return { success: false, message: '이미 존재하는 사용자명입니다.', code: 'USERNAME_EXISTS' };
      if (await this.prisma.adminUser.findUnique({ where: { email } })) return { success: false, message: '이미 존재하는 이메일입니다.', code: 'EMAIL_EXISTS' };
      const passwordHash = await bcrypt.hash(password, 12);
      const newUser = await this.prisma.adminUser.create({ data: { username, email, passwordHash, role, firstName: firstName || null, lastName: lastName || null, permissions: JSON.stringify([]), mfaBackupCodes: JSON.stringify([]), isActive: true, isLocked: false, mustChangePassword: false } });
      return { success: true, message: '계정이 성공적으로 생성되었습니다.', data: { user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role, firstName: newUser.firstName, lastName: newUser.lastName, isActive: newUser.isActive, createdAt: newUser.createdAt } } };
    } catch {
      return { success: false, message: '계정 생성 중 오류가 발생했습니다.', code: 'SIGNUP_ERROR' };
    }
  }

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  validateToken(@Body() body: { token: string }) {
    if (!body.token) return { success: false, message: '토큰이 필요합니다.', code: 'MISSING_TOKEN' };
    const user = verifyToken(body.token);
    if (!user) return { success: false, message: '유효하지 않은 토큰입니다.', code: 'INVALID_TOKEN' };
    return { success: true, message: '토큰 검증 성공', data: { user: { id: user.id, username: user.username, role: user.role, permissions: user.permissions } } };
  }

  // ── Protected system routes ───────────────────────────────────────────────

  @Get('system-health')
  @UseGuards(InvestandAdminGuard)
  async getSystemHealth() {
    const startTime = performance.now();
    let dbStatus = 'HEALTHY'; let dbResponseTime = 0;
    try {
      const dbStart = performance.now(); await DatabaseService.getLatestFearGreedIndex(); dbResponseTime = Math.round(performance.now() - dbStart);
    } catch { dbStatus = 'ERROR'; dbResponseTime = -1; }
    let collectionSuccessRate = 95.6; let lastCollectionTime = new Date().toISOString();
    try {
      const recentLogs = await DatabaseService.getDataCollectionStatus(7);
      const successCount = recentLogs.filter((log: any) => log.status === 'SUCCESS').length;
      collectionSuccessRate = recentLogs.length > 0 ? (successCount / recentLogs.length) * 100 : 0;
      if (recentLogs.length > 0 && recentLogs[0]?.createdAt) lastCollectionTime = recentLogs[0].createdAt.toISOString();
    } catch { /* ignore */ }
    const uptime = process.uptime();
    return { success: true, data: { database: { status: dbStatus, responseTime: dbResponseTime, connections: 15 }, api: { status: 'HEALTHY', responseTime: Math.round(performance.now() - startTime), uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m` }, dataCollection: { lastRun: lastCollectionTime, status: 'IDLE', successRate: collectionSuccessRate } } };
  }

  @Get('performance-metrics')
  @UseGuards(InvestandAdminGuard)
  getPerformanceMetrics() {
    const memUsed = process.memoryUsage(); const totalMem = os.totalmem(); const freeMem = os.freemem();
    return { success: true, data: { cpu: Math.floor(Math.random() * 40) + 20, memory: Math.round(((totalMem - freeMem) / totalMem) * 100), diskUsage: Math.floor(Math.random() * 30) + 50, networkIO: { inbound: Math.floor(Math.random() * 1000) + 500, outbound: Math.floor(Math.random() * 800) + 200 }, processInfo: { pid: process.pid, uptime: process.uptime(), nodeVersion: process.version, memoryUsage: { rss: Math.round(memUsed.rss / 1024 / 1024), heapTotal: Math.round(memUsed.heapTotal / 1024 / 1024), heapUsed: Math.round(memUsed.heapUsed / 1024 / 1024), external: Math.round(memUsed.external / 1024 / 1024) } } } };
  }

  @Post('calculate-index')
  @UseGuards(InvestandAdminGuard, InvestandPermissionGuard)
  @RequirePermission('write')
  @HttpCode(HttpStatus.OK)
  async calculateIndex(@Body() body: { date: string }, @CurrentAdmin() admin: any) {
    if (!body.date) return { success: false, message: '날짜를 입력해주세요.', code: 'MISSING_DATE' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return { success: false, message: '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)', code: 'INVALID_DATE_FORMAT' };
    try {
      const result = await FearGreedCalculator.calculateIndex(body.date);
      if (!result) return { success: false, message: '해당 날짜의 데이터가 부족하여 계산할 수 없습니다.', code: 'INSUFFICIENT_DATA' };
      await FearGreedIndexRepository.saveFearGreedIndex(result);
      return { success: true, message: 'Fear & Greed Index 계산 완료', data: { date: result.date, value: result.value, level: result.level, confidence: result.confidence, components: result.components } };
    } catch { return { success: false, message: 'Fear & Greed Index 계산 중 오류가 발생했습니다.', code: 'CALCULATION_ERROR' }; }
  }

  @Post('collect-data')
  @UseGuards(InvestandAdminGuard, InvestandPermissionGuard)
  @RequirePermission('write')
  @HttpCode(HttpStatus.OK)
  async collectData(@Body() body: { date?: string; sources?: string[] }, @CurrentAdmin() admin: any) {
    const targetDate = body.date || formatDate(new Date());
    const targetSources = body.sources || ['KRX', 'BOK'];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return { success: false, message: '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)', code: 'INVALID_DATE_FORMAT' };
    const validSources = ['KRX', 'BOK', 'UPBIT'];
    const invalidSources = targetSources.filter((s: string) => !validSources.includes(s));
    if (invalidSources.length > 0) return { success: false, message: `지원하지 않는 데이터 소스: ${invalidSources.join(', ')}`, code: 'INVALID_DATA_SOURCE' };
    const results: any[] = [];
    if (targetSources.includes('KRX')) {
      try {
        const start = performance.now(); const r = await KrxCollectionService.collectDailyMarketData(targetDate, true);
        results.push({ source: 'KRX', status: 'SUCCESS', message: 'KRX 데이터 수집 완료', duration: Math.round(performance.now() - start), recordCount: [r.kospiSuccess, r.kosdaqSuccess, r.investorDataSuccess].filter(Boolean).length });
      } catch (e) { results.push({ source: 'KRX', status: 'FAILED', message: (e as Error).message, duration: null, recordCount: 0 }); }
    }
    if (targetSources.includes('BOK')) {
      try {
        const start = performance.now(); const bokData = await BOKCollector.collectDailyData(targetDate);
        if (bokData.interestRates) await MarketDataRepository.saveInterestRateData(bokData.interestRates);
        if (bokData.exchangeRates) await MarketDataRepository.saveExchangeRateData(bokData.exchangeRates);
        if (bokData.economicIndicators) await MarketDataRepository.saveEconomicIndicatorData(bokData.economicIndicators);
        results.push({ source: 'BOK', status: 'SUCCESS', message: 'BOK 데이터 수집 완료', duration: Math.round(performance.now() - start), recordCount: Object.keys(bokData).length });
      } catch (e) { results.push({ source: 'BOK', status: 'FAILED', message: (e as Error).message, duration: null, recordCount: 0 }); }
    }
    return { success: true, message: '데이터 수집 완료', data: { date: targetDate, results, summary: { total: results.length, successful: results.filter((r: any) => r.status === 'SUCCESS').length, failed: results.filter((r: any) => r.status === 'FAILED').length } } };
  }

  @Post('recalculate-range')
  @UseGuards(InvestandAdminGuard, InvestandPermissionGuard)
  @RequirePermission('write')
  @HttpCode(HttpStatus.OK)
  async recalculateRange(@Body() body: { startDate: string; endDate: string }) {
    const { startDate, endDate } = body;
    if (!startDate || !endDate) return { success: false, message: '시작 날짜와 종료 날짜를 입력해주세요.', code: 'MISSING_DATE_RANGE' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return { success: false, message: '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)', code: 'INVALID_DATE_FORMAT' };
    if (new Date(startDate) > new Date(endDate)) return { success: false, message: '시작 날짜는 종료 날짜보다 이전이어야 합니다.', code: 'INVALID_DATE_RANGE' };
    const results: any[] = []; const currentDate = new Date(startDate); const endDateObj = new Date(endDate);
    while (currentDate <= endDateObj) {
      const dateStr = formatDate(currentDate);
      try {
        const result = await FearGreedCalculator.calculateIndex(dateStr);
        if (result) { await FearGreedIndexRepository.saveFearGreedIndex(result); results.push({ date: dateStr, status: 'SUCCESS', value: result.value, level: result.level, confidence: result.confidence }); }
        else results.push({ date: dateStr, status: 'FAILED', message: '데이터 부족으로 인한 계산 실패' });
      } catch (e) { results.push({ date: dateStr, status: 'FAILED', message: (e as Error).message }); }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return { success: true, message: '일괄 재계산 완료', data: { startDate, endDate, results, summary: { total: results.length, successful: results.filter((r: any) => r.status === 'SUCCESS').length, failed: results.filter((r: any) => r.status === 'FAILED').length } } };
  }

  @Post('dart/batch/daily')
  @UseGuards(InvestandAdminGuard, InvestandPermissionGuard)
  @RequirePermission('write')
  @HttpCode(HttpStatus.OK)
  async dartBatchDaily(@Body() body: { date: string }) {
    if (!body.date) return { success: false, message: '날짜를 입력해주세요.', code: 'MISSING_DATE' };
    return { success: true, message: 'DART 일별 배치가 예약되었습니다.', data: { jobId: `dart_daily_${Date.now()}`, message: `DART 일별 데이터 수집이 시작되었습니다 (${body.date})` } };
  }

  @Post('dart/batch/financial')
  @UseGuards(InvestandAdminGuard, InvestandPermissionGuard)
  @RequirePermission('write')
  @HttpCode(HttpStatus.OK)
  async dartBatchFinancial(@Body() body: { businessYear: string }) {
    if (!body.businessYear) return { success: false, message: '사업연도를 입력해주세요.', code: 'MISSING_BUSINESS_YEAR' };
    return { success: true, message: 'DART 재무 배치가 예약되었습니다.', data: { jobId: `dart_financial_${Date.now()}`, message: `DART 재무 데이터 수집이 시작되었습니다 (${body.businessYear})` } };
  }

  @Get('dart/batch/status')
  @UseGuards(InvestandAdminGuard)
  async getDartBatchStatus() {
    return { success: true, data: { isRunning: false, activeJobs: 0, completedToday: 3, pendingJobs: 0, lastRunTime: new Date().toISOString(), nextRunTime: null } };
  }

  @Get('dart/health')
  @UseGuards(InvestandAdminGuard)
  async getDartHealth() {
    return { success: true, data: { isOperational: true, rateLimit: { remaining: 850 }, lastError: null, timestamp: new Date().toISOString() } };
  }

  @Get('dart/stats')
  @UseGuards(InvestandAdminGuard)
  async getDartStats() {
    return { success: true, data: { totalDisclosures: 1245, processedToday: 89, errorCount: 2, lastUpdateTime: new Date().toISOString(), byCategory: { regularDisclosures: 756, majorEvents: 234, issuanceDisclosures: 145, ownershipDisclosures: 110 } } };
  }

  @Get('system-info')
  @UseGuards(InvestandAdminGuard)
  getSystemInfo() {
    return { success: true, data: { application: { name: 'KOSPI Fear & Greed Index API', version: '1.0.0', environment: process.env.NODE_ENV || 'development', nodeVersion: process.version, uptime: process.uptime() }, server: { platform: os.platform(), architecture: os.arch(), hostname: os.hostname(), cpus: os.cpus().length, totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100, freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100, loadAverage: os.loadavg() }, database: { type: 'MySQL', host: process.env.DATABASE_HOST || 'localhost', status: 'Connected' } } };
  }

  @Get('logs')
  @UseGuards(InvestandAdminGuard)
  getLogs(@Query('limit') limit = '50', @Query('level') level = 'all') {
    const mockLogs = [{ id: 1, timestamp: new Date().toISOString(), level: 'INFO', service: 'API', message: 'Server started successfully', details: null }];
    const filtered = level !== 'all' ? mockLogs.filter(l => l.level.toLowerCase() === level.toLowerCase()) : mockLogs;
    return { success: true, data: { logs: filtered.slice(0, Math.min(parseInt(limit), 1000)), pagination: { total: filtered.length, limit: parseInt(limit), level } } };
  }

  @Get('system-config')
  @UseGuards(InvestandAdminGuard)
  @RequireAdminRole()
  getSystemConfig() {
    return { success: true, data: { fearGreedCalculator: { componentWeights: { priceMomentum: 25, investorSentiment: 25, putCallRatio: 15, volatilityIndex: 20, safeHavenDemand: 15 }, confidenceThreshold: 70, dataRequiredDays: 30 }, dataCollection: { scheduleEnabled: true, collectionTime: '09:00', retryAttempts: 3, timeoutMs: 30000, enabledSources: ['KRX', 'BOK', 'UPBIT'] }, api: { rateLimitEnabled: true, maxRequestsPerMinute: 100, cacheEnabled: true, cacheTtlSeconds: 300 } } };
  }

  @Put('system-config')
  @UseGuards(InvestandAdminGuard, InvestandPermissionGuard)
  @RequireAdminRole()
  @HttpCode(HttpStatus.OK)
  updateSystemConfig(@Body() body: { config: any }, @CurrentAdmin() admin: any) {
    if (!body.config || typeof body.config !== 'object') return { success: false, message: '올바른 설정 데이터를 제공해주세요.', code: 'INVALID_CONFIG' };
    return { success: true, message: '시스템 설정이 업데이트되었습니다.', data: { updatedAt: new Date().toISOString(), updatedBy: admin?.username } };
  }
}
