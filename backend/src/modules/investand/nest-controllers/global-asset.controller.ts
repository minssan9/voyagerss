import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { GlobalAssetRepository } from '@investand/repositories/market/GlobalAssetRepository';
import { GlobalAssetCollectionService } from '@investand/collectors/globalAssetCollectionService';
import { GlobalAssetTypesMapper } from '@investand/clients/yahoo/GlobalAssetTypesMapper';
import { GLOBAL_ASSET_MAP, ASSETS_BY_CATEGORY } from '@investand/clients/yahoo/GlobalAssetClient';

@Controller('investand/assets')
export class GlobalAssetNestController {
  @Get('list')
  getAssetList() {
    const assets = Object.entries(GLOBAL_ASSET_MAP).map(([code, info]) => ({ code, name: info.name, ticker: info.ticker, category: info.category }));
    return { success: true, data: assets, count: assets.length, categories: Object.keys(ASSETS_BY_CATEGORY) };
  }

  @Get('categories')
  getCategories() {
    const grouped = Object.entries(ASSETS_BY_CATEGORY).map(([category, codes]) => ({ category, assets: (codes as string[]).map(code => ({ code, ...GLOBAL_ASSET_MAP[code] })), count: (codes as string[]).length }));
    return { success: true, data: grouped };
  }

  @Get('correlations/matrix')
  async getCorrelationMatrix(@Query('period') period = '30') {
    try {
      const correlations = await GlobalAssetRepository.getCorrelationMatrix(undefined, parseInt(period));
      if (!correlations || correlations.length === 0) return { success: false, message: 'No correlation data available' };
      const matrix: Record<string, Record<string, number>> = {};
      correlations.forEach((corr: any) => {
        if (!matrix[corr.asset1Code]) matrix[corr.asset1Code] = {};
        matrix[corr.asset1Code][corr.asset2Code] = parseFloat(corr.correlation.toString());
      });
      return { success: true, data: matrix, period: parseInt(period), timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: 'Failed to retrieve correlation data' };
    }
  }

  @Get('normalized/:period')
  async getNormalizedData(@Param('period') period: string, @Query('assetCodes') assetCodes?: string, @Query('category') category?: string) {
    try {
      if (!['1M', '3M', '6M', '1Y'].includes(period)) return { success: false, message: 'Invalid period. Use: 1M, 3M, 6M, or 1Y' };
      const normalizedData = await GlobalAssetRepository.getLatestNormalizedDataForChart(period as any);
      if (!normalizedData || normalizedData.length === 0) {
        return { success: true, data: [], period, timestamp: new Date().toISOString(), isMock: true };
      }
      let filtered = normalizedData;
      if (assetCodes) filtered = normalizedData.filter((d: any) => assetCodes.split(',').includes(d.assetCode));
      else if (category) filtered = normalizedData.filter((d: any) => d.category === category);
      const grouped = filtered.reduce((acc: any, r: any) => {
        if (!acc[r.assetCode]) acc[r.assetCode] = { assetCode: r.assetCode, assetName: r.assetName, category: r.category, data: [] };
        acc[r.assetCode].data.push({ date: r.currentDate, normalizedValue: parseFloat(r.normalizedValue.toString()), actualPrice: parseFloat(r.actualPrice.toString()), percentChange: parseFloat(r.percentChange.toString()) });
        return acc;
      }, {});
      return { success: true, data: Object.values(grouped), baseDate: filtered[0]?.baseDate, period, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: 'Failed to retrieve normalized data' };
    }
  }

  @Get('stats/database')
  async getDatabaseStats() {
    try {
      const stats = await GlobalAssetRepository.getAssetDataStats();
      return { success: true, data: stats, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: 'Failed to retrieve statistics' };
    }
  }

  @Get(':code')
  async getAssetById(@Param('code') code: string, @Query('days') days = '365') {
    try {
      const assetData = await GlobalAssetRepository.getAssetPerformance(code, undefined, undefined, parseInt(days));
      if (!assetData || assetData.length === 0) return { success: false, message: `No data found for asset ${code}` };
      const formatted = assetData.map((r: any) => ({ date: r.date, closePrice: parseFloat(r.closePrice.toString()), openPrice: r.openPrice ? parseFloat(r.openPrice.toString()) : null, highPrice: r.highPrice ? parseFloat(r.highPrice.toString()) : null, lowPrice: r.lowPrice ? parseFloat(r.lowPrice.toString()) : null, volume: r.volume ? r.volume.toString() : null, changePercent: r.changePercent ? parseFloat(r.changePercent.toString()) : null }));
      return { success: true, data: { assetCode: code, assetName: assetData[0].assetName, category: assetData[0].category, records: formatted, count: formatted.length }, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: 'Failed to retrieve asset data' };
    }
  }

  @Get()
  async getAllAssets(@Query('category') category?: string) {
    try {
      const assets = await GlobalAssetRepository.getLatestAssetPerformances(category);
      if (!assets || assets.length === 0) {
        return { success: true, data: [{ assetCode: 'GC=F', assetName: 'Gold', category: 'commodity', date: new Date(), closePrice: 2050.50, changePercent: 0.5 }], timestamp: new Date().toISOString(), isMock: true };
      }
      const formatted = assets.map((a: any) => ({ assetCode: a.assetCode, assetName: a.assetName, category: a.category, date: a.date, closePrice: parseFloat(a.closePrice.toString()), change: a.change ? parseFloat(a.change.toString()) : null, changePercent: a.changePercent ? parseFloat(a.changePercent.toString()) : null }));
      return { success: true, data: formatted, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: 'Failed to retrieve asset data' };
    }
  }

  @Post('collect')
  async collectAssets() {
    try {
      if (!GlobalAssetCollectionService.shouldCollectData()) {
        return { success: false, message: 'Data collection skipped (weekend or invalid time)', timestamp: new Date().toISOString() };
      }
      const result = await GlobalAssetCollectionService.collectDailyAssetData();
      const performanceData = Array.from(result.data.values()).map((a: any) => a.performance);
      const saveResult = await GlobalAssetRepository.saveAssetPerformanceBatch(performanceData);
      return { success: true, message: 'Global asset data collection completed', data: { assetsCollected: result.assetsCollected, performanceSaved: saveResult.successCount, errors: result.errors }, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to collect global asset data', error: String(error) };
    }
  }

  @Post('normalize/:period')
  async normalizeAssets(@Param('period') period: string) {
    try {
      if (!['1M', '3M', '6M', '1Y'].includes(period)) return { success: false, message: 'Invalid period. Use: 1M, 3M, 6M, or 1Y' };
      const result = await GlobalAssetCollectionService.collectNormalizedAssetData(period as any);
      if (!result.success) return { success: false, message: 'Normalization failed', errors: result.errors };
      const models: any[] = [];
      for (const [assetCode, data] of result.normalizedData.entries()) {
        const info = GLOBAL_ASSET_MAP[assetCode];
        if (!info) continue;
        models.push(...GlobalAssetTypesMapper.toNormalizedModels(result.baseDate, assetCode, info.name, info.category, data));
      }
      const saveResult = await GlobalAssetRepository.saveNormalizedDataBatch(models);
      return { success: true, message: 'Normalized data collection completed', data: { period, baseDate: result.baseDate, assetsNormalized: result.normalizedData.size, recordsSaved: saveResult.successCount, errors: result.errors }, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to normalize asset data', error: String(error) };
    }
  }
}
