import service from '@/api/common/axios-voyagerss';

// Types
export type AssetCategory = 'commodity' | 'index' | 'crypto' | 'forex' | 'dollar_index' | 'real_estate';
export type TimePeriod = '1M' | '3M' | '6M' | '1Y';

export interface AssetInfo {
    code: string;
    name: string;
    ticker: string;
    category: AssetCategory;
}

export interface AssetPerformance {
    assetCode: string;
    assetName: string;
    category: AssetCategory;
    date: string;
    closePrice: number;
    change?: number;
    changePercent?: number;
    volume?: string;
    yearToDateReturn?: number;
    oneMonthReturn?: number;
    threeMonthReturn?: number;
    sixMonthReturn?: number;
    oneYearReturn?: number;
    volatility?: number;
}

export interface NormalizedAssetData {
    assetCode: string;
    assetName: string;
    category: AssetCategory;
    data: {
        date: string;
        normalizedValue: number;
        actualPrice: number;
        percentChange: number;
    }[];
}

export interface AssetCategory {
    category: string;
    assets: AssetInfo[];
    count: number;
}

export interface CorrelationMatrix {
    [asset1: string]: {
        [asset2: string]: number;
    };
}

export interface CollectionResult {
    success: boolean;
    message: string;
    data?: {
        assetsCollected: number;
        performanceSaved: number;
        errors: string[];
    };
}

export interface NormalizationResult {
    success: boolean;
    message: string;
    data?: {
        period: TimePeriod;
        baseDate: string;
        assetsNormalized: number;
        recordsSaved: number;
        errors: string[];
    };
}

export interface AssetStats {
    performanceRecords: number;
    normalizedRecords: number;
    correlationRecords: number;
    latestPerformanceDate?: string;
    latestNormalizedDate?: string;
}

/**
 * Global Asset API Client
 * Provides methods to interact with global asset data endpoints
 */
export const GlobalAssetApi = {
    /**
     * Get list of available assets
     */
    getAssetList() {
        return service.get<{
            success: boolean;
            data: AssetInfo[];
            count: number;
            categories: string[];
        }>('/investand/assets/list');
    },

    /**
     * Get assets grouped by category
     */
    getAssetsByCategory() {
        return service.get<{ success: boolean; data: AssetCategory[] }>(
            '/investand/assets/categories'
        );
    },

    /**
     * Get latest performance data for all assets or by category
     * @param category Optional category filter
     */
    getAllAssets(category?: AssetCategory) {
        return service.get<{ success: boolean; data: AssetPerformance[]; timestamp: string }>(
            '/investand/assets',
            { params: category ? { category } : {} }
        );
    },

    /**
     * Get performance data for a specific asset
     * @param code Asset code
     * @param days Number of days of history (default: 365)
     */
    getAssetHistory(code: string, days: number = 365) {
        return service.get<{
            success: boolean;
            data: {
                assetCode: string;
                assetName: string;
                category: AssetCategory;
                records: {
                    date: string;
                    closePrice: number;
                    openPrice?: number;
                    highPrice?: number;
                    lowPrice?: number;
                    volume?: string;
                    changePercent?: number;
                }[];
                count: number;
            };
            timestamp: string;
        }>(`/investand/assets/${code}`, { params: { days } });
    },

    /**
     * Get normalized asset data for comparison chart
     * @param period Time period (1M, 3M, 6M, 1Y)
     * @param options Optional filters (assetCodes or category)
     */
    getNormalizedData(
        period: TimePeriod,
        options?: { assetCodes?: string[]; category?: AssetCategory }
    ) {
        const params: any = {};
        if (options?.assetCodes) {
            params.assetCodes = options.assetCodes.join(',');
        }
        if (options?.category) {
            params.category = options.category;
        }

        return service.get<{
            success: boolean;
            data: NormalizedAssetData[];
            baseDate: string;
            period: TimePeriod;
            timestamp: string;
        }>(`/investand/assets/normalized/${period}`, { params });
    },

    /**
     * Get correlation matrix for assets
     * @param period Period in days (default: 30)
     */
    getCorrelationMatrix(period: number = 30) {
        return service.get<{
            success: boolean;
            data: CorrelationMatrix;
            period: number;
            timestamp: string;
        }>('/investand/assets/correlations/matrix', { params: { period } });
    },

    /**
     * Trigger asset data collection
     */
    collectAssetData() {
        return service.post<CollectionResult>('/investand/assets/collect');
    },

    /**
     * Trigger normalized data collection for specific period
     * @param period Time period (1M, 3M, 6M, 1Y)
     */
    normalizeAssetData(period: TimePeriod) {
        return service.post<NormalizationResult>(`/investand/assets/normalize/${period}`);
    },

    /**
     * Get asset data statistics
     */
    getAssetStats() {
        return service.get<{ success: boolean; data: AssetStats; timestamp: string }>(
            '/investand/assets/stats/database'
        );
    },
};
