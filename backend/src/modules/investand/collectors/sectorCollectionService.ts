import { SectorApiClient, ALL_SECTORS } from '@investand/clients/yahoo/SectorApiClient';
import { SectorTypesMapper } from '@investand/clients/yahoo/SectorTypesMapper';
import { logger } from '@investand/utils/common/logger';

/**
 * Sector Data Collection Service
 * Handles collecting sector performance data from Yahoo Finance
 * and preparing it for storage
 */
export class SectorCollectionService {

    /**
     * Collects daily sector data for all sectors
     */
    static async collectDailySectorData(date?: Date): Promise<{
        success: boolean;
        sectorsCollected: number;
        errors: string[];
        data: Map<string, any>;
    }> {
        const targetDate = date || new Date();
        logger.info(`[Sector Collection] Collecting sector data for ${targetDate.toISOString().split('T')[0]}`);

        const results = {
            success: false,
            sectorsCollected: 0,
            errors: [] as string[],
            data: new Map<string, any>(),
        };

        try {
            // 1. Fetch historical data for all sectors (last 365 days for calculations)
            const historicalData = await SectorApiClient.fetchAllSectorsHistory(365);

            // 2. Fetch current quotes for additional metrics
            const quotes = await SectorApiClient.fetchAllSectorsQuotes();

            // 3. Process each sector's data
            for (const sectorCode of ALL_SECTORS) {
                try {
                    const sectorHistory = historicalData.get(sectorCode);
                    const sectorQuote = quotes.get(sectorCode);

                    if (!sectorHistory || sectorHistory.length === 0) {
                        results.errors.push(`No historical data for ${sectorCode}`);
                        continue;
                    }

                    // Calculate returns
                    const returns = SectorApiClient.calculateReturns(sectorHistory);

                    // Calculate volatility
                    const volatility = SectorApiClient.calculateVolatility(sectorHistory, 30);

                    // Get the latest data point
                    const latestData = sectorHistory[sectorHistory.length - 1];

                    // Map to performance model
                    const performanceModel = SectorTypesMapper.toPerformanceModel(
                        latestData,
                        returns,
                        sectorQuote || undefined
                    );

                    results.data.set(sectorCode, {
                        performance: performanceModel,
                        volatility,
                        history: sectorHistory,
                    });

                    results.sectorsCollected++;
                } catch (error) {
                    const errorMsg = `Failed to process ${sectorCode}: ${error}`;
                    logger.error(`[Sector Collection] ${errorMsg}`);
                    results.errors.push(errorMsg);
                }
            }

            results.success = results.sectorsCollected > 0;
            logger.info(`[Sector Collection] Collected data for ${results.sectorsCollected}/${ALL_SECTORS.length} sectors`);

            return results;

        } catch (error) {
            logger.error('[Sector Collection] Failed to collect sector data:', error);
            results.errors.push(`Collection failed: ${error}`);
            return results;
        }
    }

    /**
     * Collects comparison data for sectors against S&P 500 benchmark
     */
    static async collectSectorComparisons(
        date?: Date,
        benchmarkCode: string = 'SPY'
    ): Promise<{
        success: boolean;
        comparisons: Map<string, any>;
        errors: string[];
    }> {
        const targetDate = date || new Date();
        logger.info(`[Sector Comparison] Comparing sectors against ${benchmarkCode}`);

        const results = {
            success: false,
            comparisons: new Map<string, any>(),
            errors: [] as string[],
        };

        try {
            // 1. Fetch benchmark data (S&P 500 ETF - SPY)
            const benchmarkData = await this.fetchBenchmarkData(benchmarkCode, 365);

            if (!benchmarkData || benchmarkData.length === 0) {
                throw new Error(`Failed to fetch benchmark data for ${benchmarkCode}`);
            }

            // 2. Fetch all sectors data
            const sectorsData = await SectorApiClient.fetchAllSectorsHistory(365);

            // 3. Calculate comparison metrics for each sector
            const sectorsReturns = new Map<string, { return: number; volatility: number }>();

            for (const sectorCode of ALL_SECTORS) {
                try {
                    const sectorHistory = sectorsData.get(sectorCode);

                    if (!sectorHistory || sectorHistory.length === 0) {
                        results.errors.push(`No data for sector ${sectorCode}`);
                        continue;
                    }

                    // Calculate metrics
                    const returns = SectorApiClient.calculateReturns(sectorHistory);
                    const volatility = SectorApiClient.calculateVolatility(sectorHistory, 30);
                    const beta = SectorApiClient.calculateBeta(sectorHistory, benchmarkData);
                    const correlation = SectorApiClient.calculateCorrelation(sectorHistory, benchmarkData);

                    // Calculate benchmark returns for relative strength
                    const benchmarkReturns = SectorApiClient.calculateReturns(benchmarkData);
                    const relativeStrength = SectorTypesMapper.calculateRelativeStrength(
                        returns.oneYear,
                        benchmarkReturns.oneYear
                    );

                    // Calculate Sharpe ratio
                    const sharpeRatio = SectorTypesMapper.calculateSharpeRatio(
                        returns.oneYear,
                        volatility
                    );

                    // Store for ranking
                    sectorsReturns.set(sectorCode, {
                        return: returns.oneYear,
                        volatility,
                    });

                    // Create comparison model
                    const comparisonModel = SectorTypesMapper.toComparisonModel(
                        targetDate,
                        sectorCode,
                        benchmarkCode,
                        {
                            relativeStrength,
                            beta,
                            correlation,
                            volatility,
                            sharpeRatio,
                        }
                    );

                    results.comparisons.set(sectorCode, comparisonModel);

                } catch (error) {
                    const errorMsg = `Failed to compare ${sectorCode}: ${error}`;
                    logger.error(`[Sector Comparison] ${errorMsg}`);
                    results.errors.push(errorMsg);
                }
            }

            // 4. Rank sectors by performance
            const rankings = SectorTypesMapper.rankSectors(sectorsReturns);
            rankings.forEach((rank, sectorCode) => {
                const comparison = results.comparisons.get(sectorCode);
                if (comparison) {
                    comparison.rank = rank;
                }
            });

            results.success = results.comparisons.size > 0;
            logger.info(`[Sector Comparison] Generated comparisons for ${results.comparisons.size} sectors`);

            return results;

        } catch (error) {
            logger.error('[Sector Comparison] Failed to generate comparisons:', error);
            results.errors.push(`Comparison failed: ${error}`);
            return results;
        }
    }

    /**
     * Collects data for a specific sector
     */
    static async collectSectorData(
        sectorCode: string,
        days: number = 365
    ): Promise<{
        success: boolean;
        data: any;
        error?: string;
    }> {
        logger.info(`[Sector Collection] Collecting data for ${sectorCode}`);

        try {
            const history = await SectorApiClient.fetchSectorHistory(sectorCode, days);
            const quote = await SectorApiClient.fetchSectorQuote(sectorCode);

            if (!history || history.length === 0) {
                throw new Error(`No historical data available for ${sectorCode}`);
            }

            const returns = SectorApiClient.calculateReturns(history);
            const volatility = SectorApiClient.calculateVolatility(history, 30);

            const latestData = history[history.length - 1];
            const performanceModel = SectorTypesMapper.toPerformanceModel(
                latestData,
                returns,
                quote || undefined
            );

            return {
                success: true,
                data: {
                    performance: performanceModel,
                    volatility,
                    history,
                    quote,
                },
            };

        } catch (error) {
            logger.error(`[Sector Collection] Failed to collect ${sectorCode}:`, error);
            return {
                success: false,
                data: null,
                error: String(error),
            };
        }
    }

    /**
     * Fetches benchmark data (e.g., SPY for S&P 500)
     */
    private static async fetchBenchmarkData(
        benchmarkCode: string,
        days: number
    ): Promise<any[]> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        try {
            const yahooFinance = require('yahoo-finance2').default;
            const result = await yahooFinance.historical(benchmarkCode, {
                period1: startDate.toISOString().split('T')[0],
                period2: endDate.toISOString().split('T')[0],
                interval: '1d'
            }) as any[];

            return result.map((quote: any) => ({
                date: new Date(quote.date),
                closePrice: quote.close,
                openPrice: quote.open,
                highPrice: quote.high,
                lowPrice: quote.low,
                volume: quote.volume,
            }));
        } catch (error) {
            logger.error(`Failed to fetch benchmark data for ${benchmarkCode}:`, error);
            throw error;
        }
    }

    /**
     * Validates if collection should run (market hours, holidays, etc.)
     */
    static shouldCollectData(): boolean {
        const now = new Date();
        const dayOfWeek = now.getDay();

        // Don't collect on weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            logger.info('[Sector Collection] Skipping collection on weekend');
            return false;
        }

        return true;
    }
}
