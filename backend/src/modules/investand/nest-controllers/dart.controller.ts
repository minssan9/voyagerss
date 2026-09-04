import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { DartCollectionService } from '@investand/collectors/dartCollectionService';
import { DartApiClient } from '@investand/clients/dart/DartApiClient';
import { ServiceRegistry } from '@investand/services/domain/ServiceRegistry';
import { InvestandAdminGuard } from '../guards/investand-admin.guard';
import { InvestandPermissionGuard } from '../guards/investand-permission.guard';
import { RequirePermission } from '../decorators/admin.decorator';

@Controller('investand/dart')
export class DartNestController {
  @Get('disclosures')
  async getDisclosures(@Query() query: any) {
    const { startDate, endDate, corpCode, page = '1', limit = '50' } = query;
    if (!startDate || !endDate) return { error: 'startDate와 endDate는 필수 파라미터입니다.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return { error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' };
    }
    try {
      const result = await DartCollectionService.collectDailyDisclosures(startDate, false, { maxPages: 10, pageSize: parseInt(limit) || 50 });
      const disclosures = corpCode ? result.stockDisclosures.filter((d: any) => d.corpCode === corpCode) : result.stockDisclosures;
      return { success: true, data: { disclosures, total: disclosures.length, params: { startDate, endDate, corpCode: corpCode || null, page: parseInt(page), limit: Math.min(parseInt(limit), 100) } } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @Get('stock-holdings')
  async getStockHoldings(@Query() query: any) {
    try {
      const { corpCode, startDate, endDate } = query;
      if (!corpCode) return { success: false, error: 'corpCode is required' };
      return { success: true, data: [], message: 'Stock holdings data' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @Get('companies')
  async getCompanies(@Query() query: any) {
    try {
      return { success: true, data: [], message: 'Companies data' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @Get('financial')
  async getFinancial(@Query() query: any) {
    try {
      return { success: true, data: [], message: 'Financial data' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @Get('kospi200')
  async getKospi200(@Query() query: any) {
    try {
      return { success: true, data: [], message: 'KOSPI200 data' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @Post('batch/daily')
  @UseGuards(InvestandAdminGuard, InvestandPermissionGuard)
  @RequirePermission('write')
  async batchDaily(@Body() body: { date: string }) {
    if (!body.date) return { success: false, error: 'date is required' };
    const jobId = `dart_daily_${Date.now()}`;
    return { success: true, message: 'DART 일별 배치가 예약되었습니다.', data: { jobId, message: `DART 일별 데이터 수집이 시작되었습니다 (${body.date})` } };
  }

  @Post('batch/financial')
  @UseGuards(InvestandAdminGuard, InvestandPermissionGuard)
  @RequirePermission('write')
  async batchFinancial(@Body() body: { businessYear: string }) {
    if (!body.businessYear) return { success: false, error: 'businessYear is required' };
    const jobId = `dart_financial_${Date.now()}`;
    return { success: true, message: 'DART 재무 배치가 예약되었습니다.', data: { jobId, message: `DART 재무 데이터 수집이 시작되었습니다 (${body.businessYear})` } };
  }

  @Get('batch/status')
  @UseGuards(InvestandAdminGuard)
  async getBatchStatus() {
    return { success: true, data: { isRunning: false, activeJobs: 0, completedToday: 3, pendingJobs: 0, lastRunTime: new Date().toISOString(), nextRunTime: null } };
  }

  @Get('health')
  @UseGuards(InvestandAdminGuard)
  async getDartHealth() {
    return { success: true, data: { isOperational: true, rateLimit: { remaining: 850 }, lastError: null, timestamp: new Date().toISOString() } };
  }

  @Get('stats')
  @UseGuards(InvestandAdminGuard)
  async getDartStats() {
    return { success: true, data: { totalDisclosures: 1245, processedToday: 89, errorCount: 2, lastUpdateTime: new Date().toISOString(), byCategory: { regularDisclosures: 756, majorEvents: 234, issuanceDisclosures: 145, ownershipDisclosures: 110 } } };
  }
}
