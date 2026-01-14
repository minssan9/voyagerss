import yahooFinance from 'yahoo-finance2';

/**
 * Yahoo Finance Global Asset API Client
 * Fetches data for commodities, indices, crypto, forex, and other global assets
 */

export interface AssetData {
    assetCode: string;
    assetName: string;
    category: string;
    date: Date;
    closePrice: number;
    openPrice?: number;
    highPrice?: number;
    lowPrice?: number;
    volume?: number;
    change?: number;
    changePercent?: number;
}

export interface AssetQuote {
    assetCode: string;
    assetName: string;
    category: string;
    price: number;
    change: number;
    changePercent: number;
    volume?: number;
}

export type AssetCategory = 'commodity' | 'index' | 'crypto' | 'forex' | 'dollar_index' | 'real_estate';

/**
 * Global asset map with tickers and categories
 * Covers: Commodities, Global Indices, Crypto, Forex, Dollar Index, Real Estate
 */
export const GLOBAL_ASSET_MAP: Record<string, { name: string; ticker: string; category: AssetCategory }> = {
    // Commodities
    'GOLD': { name: 'Gold', ticker: 'GC=F', category: 'commodity' },
    'SILVER': { name: 'Silver', ticker: 'SI=F', category: 'commodity' },
    'COPPER': { name: 'Copper', ticker: 'HG=F', category: 'commodity' },
    'WTI': { name: 'Crude Oil WTI', ticker: 'CL=F', category: 'commodity' },
    'BRENT': { name: 'Brent Crude Oil', ticker: 'BZ=F', category: 'commodity' },
    'NATGAS': { name: 'Natural Gas', ticker: 'NG=F', category: 'commodity' },

    // Global Stock Indices
    'SPX': { name: 'S&P 500', ticker: '^GSPC', category: 'index' },
    'NDX': { name: 'NASDAQ', ticker: '^IXIC', category: 'index' },
    'DJI': { name: 'Dow Jones', ticker: '^DJI', category: 'index' },
    'KOSPI': { name: 'KOSPI', ticker: '^KS11', category: 'index' },
    'NIKKEI': { name: 'Nikkei 225', ticker: '^N225', category: 'index' },
    'FTSE': { name: 'FTSE 100', ticker: '^FTSE', category: 'index' },
    'DAX': { name: 'DAX', ticker: '^GDAXI', category: 'index' },
    'CAC': { name: 'CAC 40', ticker: '^FCHI', category: 'index' },
    'EUROSTOXX': { name: 'EURO STOXX 50', ticker: '^STOXX50E', category: 'index' },
    'HSI': { name: 'Hang Seng', ticker: '^HSI', category: 'index' },
    'SSE': { name: 'Shanghai Composite', ticker: '000001.SS', category: 'index' },

    // Cryptocurrency
    'BTC': { name: 'Bitcoin', ticker: 'BTC-USD', category: 'crypto' },
    'ETH': { name: 'Ethereum', ticker: 'ETH-USD', category: 'crypto' },

    // Forex (vs USD)
    'USDKRW': { name: 'USD/KRW', ticker: 'KRW=X', category: 'forex' },
    'EURUSD': { name: 'EUR/USD', ticker: 'EURUSD=X', category: 'forex' },
    'USDJPY': { name: 'USD/JPY', ticker: 'JPY=X', category: 'forex' },
    'GBPUSD': { name: 'GBP/USD', ticker: 'GBPUSD=X', category: 'forex' },
    'USDCNY': { name: 'USD/CNY', ticker: 'CNY=X', category: 'forex' },

    // Dollar Index
    'DXY': { name: 'US Dollar Index', ticker: 'DX-Y.NYB', category: 'dollar_index' },

    // Real Estate / Housing
    'REIT': { name: 'US Real Estate ETF', ticker: 'VNQ', category: 'real_estate' },
    'HOMZ': { name: 'US Housing ETF', ticker: 'HOMZ', category: 'real_estate' },
};

export const ALL_ASSETS = Object.keys(GLOBAL_ASSET_MAP);

export const ASSETS_BY_CATEGORY: Record<AssetCategory, string[]> = {
    commodity: ['GOLD', 'SILVER', 'COPPER', 'WTI', 'BRENT', 'NATGAS'],
    index: ['SPX', 'NDX', 'DJI', 'KOSPI', 'NIKKEI', 'FTSE', 'DAX', 'CAC', 'EUROSTOXX', 'HSI', 'SSE'],
    crypto: ['BTC', 'ETH'],
    forex: ['USDKRW', 'EURUSD', 'USDJPY', 'GBPUSD', 'USDCNY'],
    dollar_index: ['DXY'],
    real_estate: ['REIT', 'HOMZ'],
};

export class GlobalAssetClient {

    /**
     * Fetches historical data for a specific asset
     */
    static async fetchAssetHistory(
        assetCode: string,
        days: number = 365
    ): Promise<AssetData[]> {
        const asset = GLOBAL_ASSET_MAP[assetCode];
        if (!asset) {
            throw new Error(`Unknown asset code: ${assetCode}`);
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        try {
            const result = await yahooFinance.historical(asset.ticker, {
                period1: startDate.toISOString().split('T')[0],
                period2: endDate.toISOString().split('T')[0],
                interval: '1d'
            }) as any[];

            return result.map((quote: any) => ({
                assetCode,
                assetName: asset.name,
                category: asset.category,
                date: new Date(quote.date),
                closePrice: quote.close,
                openPrice: quote.open,
                highPrice: quote.high,
                lowPrice: quote.low,
                volume: quote.volume,
                change: undefined, // Will be calculated later
                changePercent: undefined,
            }));
        } catch (error) {
            console.error(`Failed to fetch asset data for ${assetCode}:`, error);
            throw error;
        }
    }

    /**
     * Fetches historical data for all assets
     */
    static async fetchAllAssetsHistory(days: number = 365): Promise<Map<string, AssetData[]>> {
        const results = new Map<string, AssetData[]>();

        for (const assetCode of ALL_ASSETS) {
            try {
                const data = await this.fetchAssetHistory(assetCode, days);
                results.set(assetCode, data);

                // Rate limiting - wait 100ms between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to fetch data for asset ${assetCode}:`, error);
                results.set(assetCode, []);
            }
        }

        return results;
    }

    /**
     * Fetches assets by category
     */
    static async fetchAssetsByCategory(
        category: AssetCategory,
        days: number = 365
    ): Promise<Map<string, AssetData[]>> {
        const results = new Map<string, AssetData[]>();
        const assetCodes = ASSETS_BY_CATEGORY[category] || [];

        for (const assetCode of assetCodes) {
            try {
                const data = await this.fetchAssetHistory(assetCode, days);
                results.set(assetCode, data);

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to fetch ${assetCode}:`, error);
                results.set(assetCode, []);
            }
        }

        return results;
    }

    /**
     * Fetches current quote for a specific asset
     */
    static async fetchAssetQuote(assetCode: string): Promise<AssetQuote | null> {
        const asset = GLOBAL_ASSET_MAP[assetCode];
        if (!asset) {
            throw new Error(`Unknown asset code: ${assetCode}`);
        }

        try {
            const quote = await yahooFinance.quote(asset.ticker) as any;

            return {
                assetCode,
                assetName: asset.name,
                category: asset.category,
                price: quote.regularMarketPrice,
                change: quote.regularMarketChange,
                changePercent: quote.regularMarketChangePercent,
                volume: quote.regularMarketVolume,
            };
        } catch (error) {
            console.error(`Failed to fetch quote for ${assetCode}:`, error);
            return null;
        }
    }

    /**
     * Fetches quotes for all assets
     */
    static async fetchAllAssetsQuotes(): Promise<Map<string, AssetQuote>> {
        const results = new Map<string, AssetQuote>();

        for (const assetCode of ALL_ASSETS) {
            try {
                const quote = await this.fetchAssetQuote(assetCode);
                if (quote) {
                    results.set(assetCode, quote);
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to fetch quote for asset ${assetCode}:`, error);
            }
        }

        return results;
    }

    /**
     * Calculate period returns for asset performance analysis
     */
    static calculateReturns(data: AssetData[]): {
        ytd: number;
        oneMonth: number;
        threeMonth: number;
        sixMonth: number;
        oneYear: number;
    } {
        if (data.length === 0) {
            return { ytd: 0, oneMonth: 0, threeMonth: 0, sixMonth: 0, oneYear: 0 };
        }

        const latestPrice = data[data.length - 1].closePrice;
        const now = new Date();

        // YTD return
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const ytdData = data.find(d => d.date >= yearStart);
        const ytd = ytdData
            ? ((latestPrice - ytdData.closePrice) / ytdData.closePrice) * 100
            : 0;

        // 1-month return
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const oneMonthData = data.find(d => d.date >= oneMonthAgo);
        const oneMonth = oneMonthData
            ? ((latestPrice - oneMonthData.closePrice) / oneMonthData.closePrice) * 100
            : 0;

        // 3-month return
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const threeMonthData = data.find(d => d.date >= threeMonthsAgo);
        const threeMonth = threeMonthData
            ? ((latestPrice - threeMonthData.closePrice) / threeMonthData.closePrice) * 100
            : 0;

        // 6-month return
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthData = data.find(d => d.date >= sixMonthsAgo);
        const sixMonth = sixMonthData
            ? ((latestPrice - sixMonthData.closePrice) / sixMonthData.closePrice) * 100
            : 0;

        // 1-year return
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearData = data.find(d => d.date >= oneYearAgo);
        const oneYear = oneYearData
            ? ((latestPrice - oneYearData.closePrice) / oneYearData.closePrice) * 100
            : 0;

        return { ytd, oneMonth, threeMonth, sixMonth, oneYear };
    }

    /**
     * Calculate volatility (standard deviation of returns)
     */
    static calculateVolatility(data: AssetData[], period: number = 30): number {
        if (data.length < period + 1) return 0;

        const recentData = data.slice(-period - 1);
        const returns = [];

        for (let i = 1; i < recentData.length; i++) {
            const dailyReturn = (recentData[i].closePrice - recentData[i - 1].closePrice)
                / recentData[i - 1].closePrice;
            returns.push(dailyReturn);
        }

        // Calculate standard deviation
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        // Annualized volatility (assuming 252 trading days)
        return stdDev * Math.sqrt(252) * 100;
    }

    /**
     * Normalize asset data to 100-base scale
     * @param data Historical asset data
     * @param baseDate The date to normalize to 100 (default: first date in data)
     * @returns Array of normalized data points
     */
    static normalizeToBase100(
        data: AssetData[],
        baseDate?: Date
    ): { date: Date; normalizedValue: number; actualPrice: number; percentChange: number }[] {
        if (data.length === 0) return [];

        // Determine base date and price
        const baseIndex = baseDate
            ? data.findIndex(d => d.date >= baseDate)
            : 0;

        if (baseIndex === -1) return [];

        const basePrice = data[baseIndex].closePrice;

        // Normalize all subsequent data points
        return data.slice(baseIndex).map(d => ({
            date: d.date,
            normalizedValue: (d.closePrice / basePrice) * 100,
            actualPrice: d.closePrice,
            percentChange: ((d.closePrice - basePrice) / basePrice) * 100,
        }));
    }

    /**
     * Calculate correlation between two assets
     */
    static calculateCorrelation(
        asset1Data: AssetData[],
        asset2Data: AssetData[]
    ): number {
        const minLength = Math.min(asset1Data.length, asset2Data.length);
        if (minLength < 2) return 0;

        const returns1 = [];
        const returns2 = [];

        for (let i = 1; i < minLength; i++) {
            returns1.push(
                (asset1Data[i].closePrice - asset1Data[i - 1].closePrice) / asset1Data[i - 1].closePrice
            );
            returns2.push(
                (asset2Data[i].closePrice - asset2Data[i - 1].closePrice) / asset2Data[i - 1].closePrice
            );
        }

        const mean1 = returns1.reduce((sum, r) => sum + r, 0) / returns1.length;
        const mean2 = returns2.reduce((sum, r) => sum + r, 0) / returns2.length;

        let numerator = 0;
        let sum1Sq = 0;
        let sum2Sq = 0;

        for (let i = 0; i < returns1.length; i++) {
            const diff1 = returns1[i] - mean1;
            const diff2 = returns2[i] - mean2;
            numerator += diff1 * diff2;
            sum1Sq += diff1 * diff1;
            sum2Sq += diff2 * diff2;
        }

        const denominator = Math.sqrt(sum1Sq * sum2Sq);
        return denominator !== 0 ? numerator / denominator : 0;
    }
}
