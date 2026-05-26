import { Controller, Get, Param, Query } from '@nestjs/common';
import { GlobalAssetRepository } from '@investand/repositories/market/GlobalAssetRepository';

@Controller('investand/findash')
export class FindashNestController {
  @Get('market/history/:symbol')
  async getMarketHistory(@Param('symbol') symbol: string, @Query('days') days = '365') {
    try {
      const symbolMap: Record<string, string> = { gold: 'GC=F', usdkrw: 'KRW=X', snp500: '^GSPC', nasdaq: '^IXIC', bitcoin: 'BTC-USD' };
      const assetCode = symbolMap[symbol.toLowerCase()] || symbol;
      const assetData = await GlobalAssetRepository.getAssetPerformance(assetCode, undefined, undefined, parseInt(days));
      if (!assetData || assetData.length === 0) {
        const mockData = Array.from({ length: parseInt(days) }, (_, i) => {
          const date = new Date(); date.setDate(date.getDate() - i);
          return { date: date.toISOString().split('T')[0], closePrice: 100 + Math.random() * 20, change: Math.random() * 2 - 1, changePercent: Math.random() * 2 - 1, volume: Math.floor(Math.random() * 1000000) };
        });
        return { success: true, data: mockData.reverse(), count: mockData.length, isMock: true };
      }
      const formatted = assetData.map((r: any) => ({ date: r.date.toISOString().split('T')[0], closePrice: parseFloat(r.closePrice.toString()), change: r.change ? parseFloat(r.change.toString()) : 0, changePercent: r.changePercent ? parseFloat(r.changePercent.toString()) : 0, volume: r.volume ? Number(r.volume) : 0 })).reverse();
      return { success: true, data: formatted, count: formatted.length };
    } catch {
      return { success: false, message: 'Failed to retrieve asset history' };
    }
  }
}
