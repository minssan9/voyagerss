import { Controller, Get, Post, Body } from '@nestjs/common';
import { DatabaseService } from '@investand/services/core/databaseService';
import { KrxCollectionService } from '@investand/collectors/krxCollectionService';

@Controller('investand/data')
export class MarketDataNestController {
  @Get('kospi')
  async getKospi() {
    try {
      const kospi = await DatabaseService.getLatestKOSPIData();
      if (!kospi) {
        return { success: true, data: { current: 2500.50, change: 15.20, changePercent: 0.61, volume: 5000000, marketCap: 2000000000, isMock: true }, timestamp: new Date().toISOString() };
      }
      return { success: true, data: { current: parseFloat(kospi.stck_prpr.toString()), change: parseFloat(kospi.prdy_vrss.toString()), changePercent: parseFloat(kospi.prdy_ctrt.toString()), volume: Number(kospi.acml_vol), marketCap: Number(kospi.acml_tr_pbmn) }, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: '서버 오류가 발생했습니다.' };
    }
  }

  @Get('kosdaq')
  async getKosdaq() {
    try {
      const kosdaq = await DatabaseService.getLatestKOSDAQData();
      if (!kosdaq) {
        return { success: true, data: { current: 850.30, change: -5.10, changePercent: -0.60, volume: 2000000, marketCap: 1000000000, isMock: true }, timestamp: new Date().toISOString() };
      }
      return { success: true, data: { current: parseFloat(kosdaq.stck_prpr.toString()), change: parseFloat(kosdaq.prdy_vrss.toString()), changePercent: parseFloat(kosdaq.prdy_ctrt.toString()), volume: Number(kosdaq.acml_vol), marketCap: Number(kosdaq.acml_tr_pbmn) }, timestamp: new Date().toISOString() };
    } catch {
      return { success: false, message: '서버 오류가 발생했습니다.' };
    }
  }

  @Get('market')
  async getMarket() {
    try {
      const [kospi, kosdaq] = await Promise.all([DatabaseService.getLatestKOSPIData(), DatabaseService.getLatestKOSDAQData()]);
      if (!kospi && !kosdaq) return { success: false, message: '시장 데이터가 없습니다.' };
      return {
        success: true,
        data: {
          kospi: kospi ? { current: parseFloat(kospi.stck_prpr.toString()), change: parseFloat(kospi.prdy_vrss.toString()), changePercent: parseFloat(kospi.prdy_ctrt.toString()), volume: Number(kospi.acml_vol), marketCap: Number(kospi.acml_tr_pbmn) } : null,
          kosdaq: kosdaq ? { current: parseFloat(kosdaq.stck_prpr.toString()), change: parseFloat(kosdaq.prdy_vrss.toString()), changePercent: parseFloat(kosdaq.prdy_ctrt.toString()), volume: Number(kosdaq.acml_vol), marketCap: Number(kosdaq.acml_tr_pbmn) } : null,
        },
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { success: false, message: '서버 오류가 발생했습니다.' };
    }
  }

  @Post('collect')
  async collectMarketData(@Body() body: { date?: string }) {
    try {
      const targetDate = body.date || new Date().toISOString().split('T')[0];
      const result = await KrxCollectionService.collectDailyMarketData(targetDate);
      return { success: true, data: result, message: `${targetDate} 시장 데이터 수집 완료` };
    } catch (error) {
      return { success: false, message: '시장 데이터 수집 실패', error: (error as Error).message };
    }
  }
}
