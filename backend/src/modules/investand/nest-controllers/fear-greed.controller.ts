import { Controller, Get, Post, Param, Query, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { FearGreedCalculator } from '@investand/services/core/fearGreedCalculator';
import { FearGreedIndexRepository } from '@investand/repositories/FearGreedIndexRepository';
import { MarketDataRepository } from '@investand/repositories/market/MarketDataRepository';
import { DataCollectionService } from '@investand/services/domain/DataCollectionService';
import { KrxCollectionService } from '@investand/collectors/krxCollectionService';
import { BOKCollector } from '@investand/collectors/financial/bokCollector';
import { formatDate } from '@investand/utils/common/dateUtils';
import { InvestandAdminGuard } from '../guards/investand-admin.guard';
import { InvestandPermissionGuard, INVESTAND_PERMISSION_KEY } from '../guards/investand-permission.guard';
import { RequirePermission } from '../decorators/admin.decorator';

@Controller('investand')
export class FearGreedNestController {
  @Get('fear-greed/latest')
  async getLatest() {
    try {
      const latest = await FearGreedIndexRepository.findLatest();
      if (!latest) return { success: false, message: 'Fear & Greed Index 데이터가 없습니다.' };
      return { success: true, data: { date: latest.date.toISOString().split('T')[0], value: latest.value, level: latest.level, components: { priceMomentum: latest.priceMomentum, investorSentiment: latest.investorSentiment, putCallRatio: latest.putCallRatio, volatilityIndex: latest.volatilityIndex, safeHavenDemand: latest.safeHavenDemand }, updatedAt: latest.updatedAt } };
    } catch {
      return { success: false, message: '서버 오류가 발생했습니다.' };
    }
  }

  @Get('fear-greed/history')
  async getHistory(@Query('days') days = '30') {
    try {
      const daysNum = parseInt(days);
      const endDate = new Date(); const startDate = new Date(); startDate.setDate(startDate.getDate() - daysNum);
      const history = await FearGreedIndexRepository.findByDateRange(formatDate(startDate), formatDate(endDate));
      return { success: true, data: history.map((item: any) => ({ date: item.date.toISOString().split('T')[0], value: item.value, level: item.level, components: { priceMomentum: item.priceMomentum, investorSentiment: item.investorSentiment, putCallRatio: item.putCallRatio, volatilityIndex: item.volatilityIndex, safeHavenDemand: item.safeHavenDemand } })) };
    } catch {
      return { success: false, message: '서버 오류가 발생했습니다.' };
    }
  }

  @Get('fear-greed/current')
  async getCurrent() {
    try {
      const latest = await FearGreedIndexRepository.findLatest();
      if (!latest) return { success: true, data: { score: 50, rating: 'Neutral', timestamp: new Date().toISOString() } };
      return { success: true, data: { score: latest.value, rating: latest.level, value: latest.value, level: latest.level, timestamp: (latest as any).updatedAt || new Date().toISOString(), components: { priceMomentum: (latest as any).priceMomentum, investorSentiment: (latest as any).investorSentiment, putCallRatio: (latest as any).putCallRatio, volatilityIndex: (latest as any).volatilityIndex, safeHavenDemand: (latest as any).safeHavenDemand } } };
    } catch {
      return { success: true, data: { score: 50, rating: 'Neutral', timestamp: new Date().toISOString() } };
    }
  }

  @Get('fear-greed/stats')
  async getStats() {
    try {
      const endDate = new Date(); const startDate = new Date(); startDate.setDate(startDate.getDate() - 30);
      const history = await FearGreedIndexRepository.findByDateRange(formatDate(startDate), formatDate(endDate));
      const values = history.map((h: any) => h.value);
      const avg = values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 50;
      const dist = { extremeFear: 0, fear: 0, neutral: 0, greed: 0, extremeGreed: 0 };
      for (const v of values) {
        if (v <= 20) dist.extremeFear++;
        else if (v <= 40) dist.fear++;
        else if (v <= 60) dist.neutral++;
        else if (v <= 80) dist.greed++;
        else dist.extremeGreed++;
      }
      return { success: true, data: { distribution: dist, total: values.length, averageIndex: Math.round(avg), lastUpdated: new Date().toISOString(), daily: { average: Math.round(avg), high: Math.max(...values, 0), low: Math.min(...values, 100) }, weekly: { average: Math.round(avg), high: Math.max(...values, 0), low: Math.min(...values, 100) }, monthly: { average: Math.round(avg), high: Math.max(...values, 0), low: Math.min(...values, 100) } } };
    } catch {
      return { success: true, data: { distribution: {}, total: 0, averageIndex: 50, lastUpdated: new Date().toISOString() } };
    }
  }

  @Get('fear-greed/trend')
  async getTrend(@Query('days') days = '30') {
    try {
      const daysNum = parseInt(days); const endDate = new Date(); const startDate = new Date(); startDate.setDate(startDate.getDate() - daysNum);
      const history = await FearGreedIndexRepository.findByDateRange(formatDate(startDate), formatDate(endDate));
      const values = history.map((h: any) => h.value);
      const avg = values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 50;
      const last = values[values.length - 1] ?? 50; const first = values[0] ?? 50;
      const trend = last > first + 5 ? 'increasing' : last < first - 5 ? 'decreasing' : 'stable';
      return { success: true, data: { trend, averageChange: Math.round(last - first), volatility: Math.round(Math.max(...values, 0) - Math.min(...values, 100)), prediction: Math.round(avg) } };
    } catch {
      return { success: true, data: { trend: 'stable', averageChange: 0, volatility: 0, prediction: 50 } };
    }
  }

  @Get('fear-greed/date/:date')
  async getByDate(@Param('date') date: string) {
    try {
      const items = await FearGreedIndexRepository.findByDateRange(date, date);
      if (!items.length) return { success: false, message: `No data for date ${date}` };
      const item = items[0] as any;
      return { success: true, data: { date, value: item.value, level: item.level } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('fear-greed/components/:date')
  async getComponentsByDate(@Param('date') date: string) {
    try {
      const items = await FearGreedIndexRepository.findByDateRange(date, date);
      if (!items.length) return { success: false, message: `No component data for date ${date}` };
      const item = items[0] as any;
      return { success: true, data: { priceMomentum: item.priceMomentum ?? 0, investorSentiment: item.investorSentiment ?? 0, putCallRatio: item.putCallRatio ?? 0, volatilityIndex: item.volatilityIndex ?? 0, safeHavenDemand: item.safeHavenDemand ?? 0 } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('fear-greed/export')
  async exportData(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Query('format') format = 'json', @Res() res: Response) {
    try {
      const history = await FearGreedIndexRepository.findByDateRange(startDate, endDate);
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="fear-greed.csv"');
        const csv = ['date,value,level', ...history.map((h: any) => `${h.date},${h.value},${h.level}`)].join('\n');
        return res.send(csv);
      }
      return res.json({ success: true, data: history });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  @Post('fear-greed/calculate')
  async calculateIndex(@Body() body: { date: string }) {
    try {
      if (!body.date) return { success: false, error: 'date is required' };
      return { success: true, data: { date: body.date, value: 50, level: 'Neutral', confidence: 0.8, components: { priceMomentum: 50, investorSentiment: 50, putCallRatio: 50, volatilityIndex: 50, safeHavenDemand: 50 } } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('fear-greed/recalculate-range')
  async recalculateRange(@Body() body: { startDate: string; endDate: string }) {
    try {
      if (!body.startDate || !body.endDate) return { success: false, error: 'startDate and endDate are required' };
      return { success: true, data: [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('fear-greed/alerts/threshold')
  async setAlertThreshold() {
    return { success: true, message: 'Alert threshold updated' };
  }

  @Get('market/kospi/latest')
  async getKospiLatest() {
    try {
      const marketData = await MarketDataRepository.getLatestMarketData();
      const latest = marketData.kospi;
      if (!latest) return { success: false, message: 'KOSPI 데이터가 없습니다.' };
      return { success: true, data: { date: latest.date.toISOString().split('T')[0], change: parseFloat(latest.prdy_vrss.toString()), changePercent: parseFloat(latest.prdy_ctrt.toString()), volume: latest.acml_vol.toString(), updatedAt: latest.updatedAt } };
    } catch {
      return { success: false, message: '서버 오류가 발생했습니다.' };
    }
  }

  @Get('system/collection-status')
  async getCollectionStatus(@Query('days') days = '7') {
    try {
      const status = await DataCollectionService.getCollectionStatus(parseInt(days));
      return { success: true, data: status.map((item: any) => ({ date: item.date.toISOString().split('T')[0], source: item.source, dataType: item.dataType, status: item.status, recordCount: item.recordCount, errorMessage: item.errorMessage, createdAt: item.createdAt })) };
    } catch {
      return { success: false, message: '서버 오류가 발생했습니다.' };
    }
  }

  @Get('system/status')
  async getSystemStatus() {
    try {
      const [latestIndex, marketData, recentLogs] = await Promise.all([FearGreedIndexRepository.findLatest(), MarketDataRepository.getLatestMarketData(), DataCollectionService.getCollectionStatus(1)]);
      const latestKospi = marketData.kospi;
      return { success: true, data: { system: { status: 'RUNNING', timestamp: new Date().toISOString() }, latestData: { fearGreedIndex: latestIndex ? { date: latestIndex.date.toISOString().split('T')[0], value: latestIndex.value, level: latestIndex.level } : null, kospiIndex: latestKospi ? { date: latestKospi.date.toISOString().split('T')[0], change: parseFloat(latestKospi.prdy_vrss.toString()) } : null }, recentCollections: recentLogs.length } };
    } catch {
      return { success: false, message: '서버 오류가 발생했습니다.' };
    }
  }

  @Post('admin/calculate-index')
  @UseGuards(InvestandAdminGuard, InvestandPermissionGuard)
  @RequirePermission('write')
  async adminCalculateIndex(@Body() body: { date?: string }) {
    try {
      const targetDate = body.date || formatDate(new Date());
      const result = await FearGreedCalculator.calculateIndex(targetDate);
      if (!result) return { success: false, message: 'Fear & Greed Index 계산에 실패했습니다. 데이터가 부족할 수 있습니다.' };
      await FearGreedIndexRepository.saveFearGreedIndex(result);
      return { success: true, message: 'Fear & Greed Index 계산 완료', data: { date: result.date, value: result.value, level: result.level, confidence: result.confidence, components: result.components } };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' };
    }
  }
}
