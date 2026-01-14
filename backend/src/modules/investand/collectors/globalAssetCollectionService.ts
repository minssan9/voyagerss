import { GlobalAssetClient, ALL_ASSETS, ASSETS_BY_CATEGORY, type AssetCategory } from '@investand/clients/yahoo/GlobalAssetClient';
import { GlobalAssetTypesMapper } from '@investand/clients/yahoo/GlobalAssetTypesMapper';
import { logger } from '@investand/utils/common/logger';

/**
 * Global Asset Collection Service
 * Handles collecting global asset performance data from Yahoo Finance
 * and normalizing it to 100-base scale for comparison
 */
export class GlobalAssetCollectionService {

    /**
     * Collects daily asset data for all global assets
     */
    static async collectDailyAssetData(date?: Date): Promise<{
        success: boolean;
        assetsCollected: number;
        errors: string[];
        data: Map<string, any>;
    }> {
        const targetDate = date || new Date();
        logger.info(`[Global Asset Collection] Collecting asset data for ${targetDate.toISOString().split('T')[0]}`);

        const results = {
            success: false,
            assetsCollected: 0,
            errors: [] as string[],
            data: new Map<string, any>(),
        };

        try {
            // 1. Fetch historical data for all assets (last 365 days)
            const historicalData = await GlobalAssetClient.fetchAllAssetsHistory(365);

            // 2. Fetch current quotes for additional metrics
            const quotes = await GlobalAssetClient.fetchAllAssetsQuotes();

            // 3. Process each asset's data
            for (const assetCode of ALL_ASSETS) {
                try {
                    const assetHistory = historicalData.get(assetCode);
                    const assetQuote = quotes.get(assetCode);

                    if (!assetHistory || assetHistory.length === 0) {
                        results.errors.push(`No historical data for ${assetCode}`);
                        continue;
                    }

                    // Calculate returns
                    const returns = GlobalAssetClient.calculateReturns(assetHistory);

                    // Calculate volatility
                    const volatility = GlobalAssetClient.calculateVolatility(assetHistory, 30);

                    // Get the latest data point
                    const latestData = assetHistory[assetHistory.length - 1];

                    // Map to performance model
                    const performanceModel = GlobalAssetTypesMapper.toPerformanceModel(
                        latestData,
                        returns,
                        volatility,
                        assetQuote || undefined
                    );

                    results.data.set(assetCode, {
                        performance: performanceModel,
                        volatility,
                        history: assetHistory,
                    });

                    results.assetsCollected++;
                } catch (error) {
                    const errorMsg = `Failed to process ${assetCode}: ${error}`;
                    logger.error(`[Global Asset Collection] ${errorMsg}`);
                    results.errors.push(errorMsg);
                }
            }

            results.success = results.assetsCollected > 0;
            logger.info(`[Global Asset Collection] Collected data for ${results.assetsCollected}/${ALL_ASSETS.length} assets`);

            return results;

        } catch (error) {
            logger.error('[Global Asset Collection] Failed to collect asset data:', error);
            results.errors.push(`Collection failed: ${error}`);
            return results;
        }
    }

    /**
     * Collects and normalizes asset data to 100-base scale
     * @param period Time period: '1M', '3M', '6M', '1Y'
     */
    static async collectNormalizedAssetData(
        period: '1M' | '3M' | '6M' | '1Y' = '1Y'
    ): Promise<{
        success: boolean;
        normalizedData: Map<string, any[]>;
        baseDate: Date;
        errors: string[];
    }> {
        logger.info(`[Normalized Asset Collection] Collecting normalized data for period: ${period}`);

        const results = {
            success: false,
            normalizedData: new Map<string, any[]>(),
            baseDate: new Date(),
            errors: [] as string[],
        };

        try {
            // Calculate days based on period
            const daysMap = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
            const days = daysMap[period];

            // Fetch historical data
            const historicalData = await GlobalAssetClient.fetchAllAssetsHistory(days);

            // Determine base date (earliest common date across all assets)
            let baseDate = new Date();
            for (const [assetCode, data] of historicalData.entries()) {
                if (data.length > 0 && data[0].date < baseDate) {
                    baseDate = data[0].date;
                }
            }

            results.baseDate = baseDate;

            // Normalize each asset's data
            for (const [assetCode, data] of historicalData.entries()) {
                try {
                    if (!data || data.length === 0) {
                        results.errors.push(`No data for ${assetCode}`);
                        continue;
                    }

                    // Normalize to 100-base scale
                    const normalized = GlobalAssetClient.normalizeToBase100(data, baseDate);

                    if (normalized.length > 0) {
                        results.normalizedData.set(assetCode, normalized);
                    }
                } catch (error) {
                    const errorMsg = `Failed to normalize ${assetCode}: ${error}`;
                    logger.error(`[Normalized Asset Collection] ${errorMsg}`);
                    results.errors.push(errorMsg);
                }
            }

            results.success = results.normalizedData.size > 0;
            logger.info(`[Normalized Asset Collection] Normalized ${results.normalizedData.size} assets`);

            return results;

        } catch (error) {
            logger.error('[Normalized Asset Collection] Failed to collect normalized data:', error);
            results.errors.push(`Normalization failed: ${error}`);
            return results;
        }
    }

    /**
     * Collects asset data by category
     */
    static async collectAssetDataByCategory(
        category: AssetCategory,
        days: number = 365
    ): Promise<{
        success: boolean;
        assetsCollected: number;
        data: Map<string, any>;
        errors: string[];
    }> {
        logger.info(`[Global Asset Collection] Collecting ${category} assets`);

        const results = {
            success: false,
            assetsCollected: 0,
            data: new Map<string, any>(),
            errors: [] as string[],
        };

        try {
            const assetCodes = ASSETS_BY_CATEGORY[category] || [];
            const historicalData = await GlobalAssetClient.fetchAssetsByCategory(category, days);

            for (const assetCode of assetCodes) {
                try {
                    const history = historicalData.get(assetCode);

                    if (!history || history.length === 0) {
                        results.errors.push(`No data for ${assetCode}`);
                        continue;
                    }

                    const returns = GlobalAssetClient.calculateReturns(history);
                    const volatility = GlobalAssetClient.calculateVolatility(history, 30);

                    results.data.set(assetCode, {
                        history,
                        returns,
                        volatility,
                    });

                    results.assetsCollected++;
                } catch (error) {
                    results.errors.push(`Failed to process ${assetCode}: ${error}`);
                }
            }

            results.success = results.assetsCollected > 0;
            return results;

        } catch (error) {
            logger.error(`[Global Asset Collection] Failed to collect ${category} assets:`, error);
            results.errors.push(`Collection failed: ${error}`);
            return results;
        }
    }

    /**
     * Calculates correlation matrix for all assets
     */
    static async calculateAssetCorrelations(
        period: number = 30
    ): Promise<{
        success: boolean;
        correlationMatrix: Map<string, Map<string, number>>;
        errors: string[];
    }> {
        logger.info('[Global Asset Collection] Calculating correlation matrix');

        const results = {
            success: false,
            correlationMatrix: new Map<string, Map<string, number>>(),
            errors: [] as string[],
        };

        try {
            // Fetch data for period
            const historicalData = await GlobalAssetClient.fetchAllAssetsHistory(period + 30);

            // Calculate correlation matrix
            results.correlationMatrix = GlobalAssetTypesMapper.calculateCorrelationMatrix(
                historicalData,
                period
            );

            results.success = results.correlationMatrix.size > 0;
            logger.info(`[Global Asset Collection] Calculated correlations for ${results.correlationMatrix.size} assets`);

            return results;

        } catch (error) {
            logger.error('[Global Asset Collection] Failed to calculate correlations:', error);
            results.errors.push(`Correlation calculation failed: ${error}`);
            return results;
        }
    }

    /**
     * Collects data for a specific asset
     */
    static async collectAssetData(
        assetCode: string,
        days: number = 365
    ): Promise<{
        success: boolean;
        data: any;
        error?: string;
    }> {
        logger.info(`[Global Asset Collection] Collecting data for ${assetCode}`);

        try {
            const history = await GlobalAssetClient.fetchAssetHistory(assetCode, days);
            const quote = await GlobalAssetClient.fetchAssetQuote(assetCode);

            if (!history || history.length === 0) {
                throw new Error(`No historical data available for ${assetCode}`);
            }

            const returns = GlobalAssetClient.calculateReturns(history);
            const volatility = GlobalAssetClient.calculateVolatility(history, 30);
            const normalized = GlobalAssetClient.normalizeToBase100(history);

            const latestData = history[history.length - 1];
            const performanceModel = GlobalAssetTypesMapper.toPerformanceModel(
                latestData,
                returns,
                volatility,
                quote || undefined
            );

            return {
                success: true,
                data: {
                    performance: performanceModel,
                    volatility,
                    history,
                    normalized,
                    quote,
                },
            };

        } catch (error) {
            logger.error(`[Global Asset Collection] Failed to collect ${assetCode}:`, error);
            return {
                success: false,
                data: null,
                error: String(error),
            };
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
            logger.info('[Global Asset Collection] Skipping collection on weekend');
            return false;
        }

        return true;
    }
}
