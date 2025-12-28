import yahooFinance from 'yahoo-finance2';

interface MarketDataPoint {
    symbol: string;
    date: Date;
    close: number;
    volume: number;
}

export const TICKER_MAP: Record<string, string> = {
    'gold': 'GC=F',
    'silver': 'SI=F',
    'copper': 'HG=F',
    'wti': 'CL=F',
    'usdkrw': 'KRW=X',
    'snp500': '^GSPC',
    'kospi': '^KS11',
    'nikkei': '^N225'
};

export class MarketDataService {

    /**
     * Fetches daily historical data for a given asset
     * @param assetId Internal asset ID (e.g., 'gold')
     * @param days Number of days to fetch
     */
    static async fetchHistory(assetId: string, days: number = 365): Promise<MarketDataPoint[]> {
        const ticker = TICKER_MAP[assetId];
        if (!ticker) throw new Error(`Unknown Asset ID: ${assetId}`);

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        try {
            const result = await yahooFinance.historical(ticker, {
                period1: startDate.toISOString().split('T')[0], // YYYY-MM-DD
                period2: endDate.toISOString().split('T')[0],
                interval: '1d'
            }) as any[];

            return result.map((quote: any) => ({
                symbol: assetId,
                date: quote.date,
                close: quote.close,
                volume: quote.volume
            }));
        } catch (error) {
            console.error(`Failed to fetch data for ${ticker}:`, error);
            return [];
        }
    }

    /**
     * Fetches the latest price snapshot
     */
    static async fetchSnapshot(assetId: string) {
        const ticker = TICKER_MAP[assetId];
        try {
            const quote = await yahooFinance.quote(ticker) as any;
            return {
                symbol: assetId,
                price: quote.regularMarketPrice,
                change: quote.regularMarketChange,
                changePercent: quote.regularMarketChangePercent
            };
        } catch (error) {
            console.error(`Quote failed for ${ticker}:`, error);
            return null;
        }
    }
}
