import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { SectorRepository } from '@investand/repositories/market/SectorRepository';
import { SectorCollectionService } from '@investand/collectors/sectorCollectionService';
import { SECTOR_ETF_MAP } from '@investand/clients/yahoo/SectorApiClient';

@Controller('investand/sectors')
export class SectorNestController {
  @Get('list')
  getSectorList() {
    const sectors = Object.entries(SECTOR_ETF_MAP).map(([code, info]) => ({ code, name: info.name, ticker: info.ticker }));
    return { success: true, data: sectors, count: sectors.length };
  }

  @Get('comparisons/latest')
  async getComparisonsLatest(@Query('benchmark') benchmark = 'SPY') {
    try {
      const comparisons = await SectorRepository.getLatestSectorComparisons(benchmark);
      if (!comparisons || comparisons.length === 0) {
        const mock = [
          { sectorCode: 'XLK', relativeStrength: 1.05, beta: 1.2, correlation: 0.85, volatility: 0.18, sharpeRatio: 1.5, rank: 1 },
          { sectorCode: 'XLF', relativeStrength: 1.02, beta: 1.1, correlation: 0.90, volatility: 0.15, sharpeRatio: 1.2, rank: 2 },
        ].map(comp => ({ ...comp, benchmarkCode: benchmark, date: new Date() }));
        return { success: true, data: mock, benchmark, timestamp: new Date().toISOString(), isMock: true };
      }
      const formatted = comparisons.map((comp: any) => ({ sectorCode: comp.sectorCode, benchmarkCode: comp.benchmarkCode, date: comp.date, relativeStrength: comp.relativeStrength ? parseFloat(comp.relativeStrength.toString()) : null, beta: comp.beta ? parseFloat(comp.beta.toString()) : null, correlation: comp.correlation ? parseFloat(comp.correlation.toString()) : null, volatility: comp.volatility ? parseFloat(comp.volatility.toString()) : null, sharpeRatio: comp.sharpeRatio ? parseFloat(comp.sharpeRatio.toString()) : null, rank: comp.rank }));
      return { success: true, data: formatted, benchmark, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: 'Failed to retrieve comparison data' };
    }
  }

  @Get('comparisons/:code')
  async getComparisonHistory(@Param('code') code: string, @Query('days') days = '30') {
    try {
      const history = await SectorRepository.getSectorRankingHistory(code, parseInt(days));
      if (!history || history.length === 0) return { success: false, message: `No comparison history found for sector ${code}` };
      const formatted = history.map((r: any) => ({ date: r.date, rank: r.rank, relativeStrength: r.relativeStrength ? parseFloat(r.relativeStrength.toString()) : null, beta: r.beta ? parseFloat(r.beta.toString()) : null, volatility: r.volatility ? parseFloat(r.volatility.toString()) : null }));
      return { success: true, data: { sectorCode: code, records: formatted, count: formatted.length }, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: 'Failed to retrieve comparison history' };
    }
  }

  @Get('summary/performance')
  async getSummaryPerformance(@Query('days') days = '30') {
    try {
      const summary = await SectorRepository.getSectorPerformanceSummary(parseInt(days));
      return { success: true, data: summary, period: `${days} days`, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: 'Failed to retrieve sector summary' };
    }
  }

  @Get('stats/database')
  async getDatabaseStats() {
    try {
      const stats = await SectorRepository.getSectorDataStats();
      return { success: true, data: stats, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: 'Failed to retrieve statistics' };
    }
  }

  @Get(':code')
  async getSectorById(@Param('code') code: string, @Query('days') days = '30') {
    try {
      const sectorData = await SectorRepository.getSectorPerformance(code, undefined, undefined, parseInt(days));
      if (!sectorData || sectorData.length === 0) return { success: false, message: `No data found for sector ${code}` };
      const formatted = sectorData.map((r: any) => ({ date: r.date, closePrice: parseFloat(r.closePrice.toString()), openPrice: r.openPrice ? parseFloat(r.openPrice.toString()) : null, highPrice: r.highPrice ? parseFloat(r.highPrice.toString()) : null, lowPrice: r.lowPrice ? parseFloat(r.lowPrice.toString()) : null, volume: r.volume ? r.volume.toString() : null, changePercent: r.changePercent ? parseFloat(r.changePercent.toString()) : null }));
      return { success: true, data: { sectorCode: code, sectorName: sectorData[0].sectorName, records: formatted, count: formatted.length }, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: 'Failed to retrieve sector data' };
    }
  }

  @Get()
  async getAllSectors() {
    try {
      const sectors = await SectorRepository.getLatestSectorPerformances();
      if (!sectors || sectors.length === 0) {
        const mock = [{ sectorCode: 'XLK', sectorName: 'Technology', changePercent: 1.2 }, { sectorCode: 'XLF', sectorName: 'Financials', changePercent: 0.5 }].map(s => ({ ...s, date: new Date(), closePrice: 100, change: 1, volume: '1000000', yearToDateReturn: 5, oneMonthReturn: 1, threeMonthReturn: 3, oneYearReturn: 10, marketCap: '1000000000', averagePE: 22, dividendYield: 2 }));
        return { success: true, data: mock, timestamp: new Date().toISOString(), isMock: true };
      }
      const formatted = sectors.map((s: any) => ({ sectorCode: s.sectorCode, sectorName: s.sectorName, date: s.date, closePrice: parseFloat(s.closePrice.toString()), change: s.change ? parseFloat(s.change.toString()) : null, changePercent: s.changePercent ? parseFloat(s.changePercent.toString()) : null, volume: s.volume ? s.volume.toString() : null, yearToDateReturn: s.yearToDateReturn ? parseFloat(s.yearToDateReturn.toString()) : null }));
      return { success: true, data: formatted, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: 'Failed to retrieve sector data' };
    }
  }

  @Post('collect')
  async collectSectors() {
    try {
      if (!SectorCollectionService.shouldCollectData()) {
        return { success: false, message: 'Data collection skipped (weekend or invalid time)', timestamp: new Date().toISOString() };
      }
      const collectionResult = await SectorCollectionService.collectDailySectorData();
      const performanceData = Array.from(collectionResult.data.values()).map((s: any) => s.performance);
      const saveResult = await SectorRepository.saveSectorPerformanceBatch(performanceData);
      const compResult = await SectorCollectionService.collectSectorComparisons();
      const compData = Array.from(compResult.comparisons.values());
      const compSave = await SectorRepository.saveSectorComparisonBatch(compData);
      return { success: true, message: 'Sector data collection completed', data: { sectorsCollected: collectionResult.sectorsCollected, performanceSaved: saveResult.successCount, comparisonsSaved: compSave.successCount, errors: [...collectionResult.errors, ...compResult.errors] }, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to collect sector data', error: String(error) };
    }
  }
}
