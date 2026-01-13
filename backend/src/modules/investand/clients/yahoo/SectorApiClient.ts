import yahooFinance from 'yahoo-finance2';

/**
 * Yahoo Finance Sector API Client
 * Uses Sector SPDR ETFs as proxies for sector performance
 */

export interface SectorData {
    sectorCode: string;
    sectorName: string;
    date: Date;
    closePrice: number;
    openPrice?: number;
    highPrice?: number;
    lowPrice?: number;
    volume?: number;
    change?: number;
    changePercent?: number;
}

export interface SectorQuote {
    sectorCode: string;
    sectorName: string;
    price: number;
    change: number;
    changePercent: number;
    volume?: number;
    marketCap?: number;
    averagePE?: number;
    dividendYield?: number;
}

/**
 * Map of sector ETFs (using Select Sector SPDR ETFs)
 * These ETFs track specific sectors of the S&P 500
 */
export const SECTOR_ETF_MAP: Record<string, { name: string; ticker: string }> = {
    'XLK': { name: 'Technology', ticker: 'XLK' },
    'XLF': { name: 'Financials', ticker: 'XLF' },
    'XLV': { name: 'Healthcare', ticker: 'XLV' },
    'XLE': { name: 'Energy', ticker: 'XLE' },
    'XLI': { name: 'Industrials', ticker: 'XLI' },
    'XLY': { name: 'Consumer Discretionary', ticker: 'XLY' },
    'XLP': { name: 'Consumer Staples', ticker: 'XLP' },
    'XLU': { name: 'Utilities', ticker: 'XLU' },
    'XLRE': { name: 'Real Estate', ticker: 'XLRE' },
    'XLB': { name: 'Materials', ticker: 'XLB' },
    'XLC': { name: 'Communication Services', ticker: 'XLC' },
};

export const ALL_SECTORS = Object.keys(SECTOR_ETF_MAP);

export class SectorApiClient {

    /**
     * Fetches historical data for a specific sector
     */
    static async fetchSectorHistory(
        sectorCode: string,
        days: number = 365
    ): Promise<SectorData[]> {
        const sector = SECTOR_ETF_MAP[sectorCode];
        if (!sector) {
            throw new Error(`Unknown sector code: ${sectorCode}`);
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        try {
            const result = await yahooFinance.historical(sector.ticker, {
                period1: startDate.toISOString().split('T')[0],
                period2: endDate.toISOString().split('T')[0],
                interval: '1d'
            }) as any[];

            return result.map((quote: any) => ({
                sectorCode,
                sectorName: sector.name,
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
            console.error(`Failed to fetch sector data for ${sectorCode}:`, error);
            throw error;
        }
    }

    /**
     * Fetches historical data for all sectors
     */
    static async fetchAllSectorsHistory(days: number = 365): Promise<Map<string, SectorData[]>> {
        const results = new Map<string, SectorData[]>();

        for (const sectorCode of ALL_SECTORS) {
            try {
                const data = await this.fetchSectorHistory(sectorCode, days);
                results.set(sectorCode, data);

                // Rate limiting - wait 100ms between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to fetch data for sector ${sectorCode}:`, error);
                results.set(sectorCode, []);
            }
        }

        return results;
    }

    /**
     * Fetches current quote for a specific sector
     */
    static async fetchSectorQuote(sectorCode: string): Promise<SectorQuote | null> {
        const sector = SECTOR_ETF_MAP[sectorCode];
        if (!sector) {
            throw new Error(`Unknown sector code: ${sectorCode}`);
        }

        try {
            const quote = await yahooFinance.quote(sector.ticker) as any;

            return {
                sectorCode,
                sectorName: sector.name,
                price: quote.regularMarketPrice,
                change: quote.regularMarketChange,
                changePercent: quote.regularMarketChangePercent,
                volume: quote.regularMarketVolume,
                marketCap: quote.marketCap,
                averagePE: quote.trailingPE,
                dividendYield: quote.trailingAnnualDividendYield,
            };
        } catch (error) {
            console.error(`Failed to fetch quote for ${sectorCode}:`, error);
            return null;
        }
    }

    /**
     * Fetches quotes for all sectors
     */
    static async fetchAllSectorsQuotes(): Promise<Map<string, SectorQuote>> {
        const results = new Map<string, SectorQuote>();

        for (const sectorCode of ALL_SECTORS) {
            try {
                const quote = await this.fetchSectorQuote(sectorCode);
                if (quote) {
                    results.set(sectorCode, quote);
                }

                // Rate limiting - wait 100ms between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to fetch quote for sector ${sectorCode}:`, error);
            }
        }

        return results;
    }

    /**
     * Calculate period returns for sector performance analysis
     */
    static calculateReturns(data: SectorData[]): {
        ytd: number;
        oneMonth: number;
        threeMonth: number;
        oneYear: number;
    } {
        if (data.length === 0) {
            return { ytd: 0, oneMonth: 0, threeMonth: 0, oneYear: 0 };
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

        // 1-year return
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearData = data.find(d => d.date >= oneYearAgo);
        const oneYear = oneYearData
            ? ((latestPrice - oneYearData.closePrice) / oneYearData.closePrice) * 100
            : 0;

        return { ytd, oneMonth, threeMonth, oneYear };
    }

    /**
     * Calculate volatility (standard deviation of returns)
     */
    static calculateVolatility(data: SectorData[], period: number = 30): number {
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
     * Calculate beta relative to a benchmark
     */
    static calculateBeta(
        sectorData: SectorData[],
        benchmarkData: SectorData[]
    ): number {
        const minLength = Math.min(sectorData.length, benchmarkData.length);
        if (minLength < 2) return 1.0;

        const sectorReturns = [];
        const benchmarkReturns = [];

        for (let i = 1; i < minLength; i++) {
            const sectorReturn = (sectorData[i].closePrice - sectorData[i - 1].closePrice)
                / sectorData[i - 1].closePrice;
            const benchmarkReturn = (benchmarkData[i].closePrice - benchmarkData[i - 1].closePrice)
                / benchmarkData[i - 1].closePrice;

            sectorReturns.push(sectorReturn);
            benchmarkReturns.push(benchmarkReturn);
        }

        // Calculate covariance and variance
        const meanSector = sectorReturns.reduce((sum, r) => sum + r, 0) / sectorReturns.length;
        const meanBenchmark = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;

        let covariance = 0;
        let benchmarkVariance = 0;

        for (let i = 0; i < sectorReturns.length; i++) {
            covariance += (sectorReturns[i] - meanSector) * (benchmarkReturns[i] - meanBenchmark);
            benchmarkVariance += Math.pow(benchmarkReturns[i] - meanBenchmark, 2);
        }

        covariance /= sectorReturns.length;
        benchmarkVariance /= benchmarkReturns.length;

        return benchmarkVariance !== 0 ? covariance / benchmarkVariance : 1.0;
    }

    /**
     * Calculate correlation coefficient between sector and benchmark
     */
    static calculateCorrelation(
        sectorData: SectorData[],
        benchmarkData: SectorData[]
    ): number {
        const minLength = Math.min(sectorData.length, benchmarkData.length);
        if (minLength < 2) return 0;

        const sectorReturns = [];
        const benchmarkReturns = [];

        for (let i = 1; i < minLength; i++) {
            sectorReturns.push(
                (sectorData[i].closePrice - sectorData[i - 1].closePrice) / sectorData[i - 1].closePrice
            );
            benchmarkReturns.push(
                (benchmarkData[i].closePrice - benchmarkData[i - 1].closePrice) / benchmarkData[i - 1].closePrice
            );
        }

        const meanSector = sectorReturns.reduce((sum, r) => sum + r, 0) / sectorReturns.length;
        const meanBenchmark = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;

        let numerator = 0;
        let sectorSumSq = 0;
        let benchmarkSumSq = 0;

        for (let i = 0; i < sectorReturns.length; i++) {
            const sectorDiff = sectorReturns[i] - meanSector;
            const benchmarkDiff = benchmarkReturns[i] - meanBenchmark;
            numerator += sectorDiff * benchmarkDiff;
            sectorSumSq += sectorDiff * sectorDiff;
            benchmarkSumSq += benchmarkDiff * benchmarkDiff;
        }

        const denominator = Math.sqrt(sectorSumSq * benchmarkSumSq);
        return denominator !== 0 ? numerator / denominator : 0;
    }
}
