import service from '@/api/common/axios-voyagerss';

// Types
export interface SectorInfo {
    code: string;
    name: string;
    ticker: string;
}

export interface SectorPerformance {
    sectorCode: string;
    sectorName: string;
    date: string;
    closePrice: number;
    change?: number;
    changePercent?: number;
    volume?: string;
    yearToDateReturn?: number;
    oneMonthReturn?: number;
    threeMonthReturn?: number;
    oneYearReturn?: number;
    marketCap?: string;
    averagePE?: number;
    dividendYield?: number;
}

export interface SectorHistoryRecord {
    date: string;
    closePrice: number;
    openPrice?: number;
    highPrice?: number;
    lowPrice?: number;
    volume?: string;
    changePercent?: number;
}

export interface SectorHistoryResponse {
    sectorCode: string;
    sectorName: string;
    records: SectorHistoryRecord[];
    count: number;
}

export interface SectorComparison {
    sectorCode: string;
    benchmarkCode: string;
    date: string;
    relativeStrength?: number;
    beta?: number;
    correlation?: number;
    volatility?: number;
    sharpeRatio?: number;
    rank?: number;
}

export interface SectorComparisonHistory {
    sectorCode: string;
    records: {
        date: string;
        rank?: number;
        relativeStrength?: number;
        beta?: number;
        volatility?: number;
    }[];
    count: number;
}

export interface CollectionResult {
    success: boolean;
    message: string;
    data?: {
        sectorsCollected: number;
        performanceSaved: number;
        comparisonsSaved: number;
        errors: string[];
    };
}

export interface SectorStats {
    performanceRecords: number;
    comparisonRecords: number;
    latestPerformanceDate?: string;
    latestComparisonDate?: string;
}

/**
 * Sector API Client
 * Provides methods to interact with sector data endpoints
 */
export const SectorApi = {
    /**
     * Get list of available sectors
     */
    getSectorList() {
        return service.get<{ success: boolean; data: SectorInfo[]; count: number }>(
            '/investand/sectors/list'
        );
    },

    /**
     * Get latest performance data for all sectors
     */
    getAllSectors() {
        return service.get<{ success: boolean; data: SectorPerformance[]; timestamp: string }>(
            '/investand/sectors'
        );
    },

    /**
     * Get performance data for a specific sector
     * @param code Sector code (e.g., 'XLK', 'XLF')
     * @param days Number of days of history to fetch (default: 30)
     */
    getSectorHistory(code: string, days: number = 30) {
        return service.get<{ success: boolean; data: SectorHistoryResponse; timestamp: string }>(
            `/investand/sectors/${code}`,
            { params: { days } }
        );
    },

    /**
     * Get latest sector comparisons against benchmark
     * @param benchmark Benchmark code (default: 'SPY' for S&P 500)
     */
    getLatestComparisons(benchmark: string = 'SPY') {
        return service.get<{
            success: boolean;
            data: SectorComparison[];
            benchmark: string;
            timestamp: string
        }>(
            '/investand/sectors/comparisons/latest',
            { params: { benchmark } }
        );
    },

    /**
     * Get comparison history for a specific sector
     * @param code Sector code
     * @param days Number of days of history (default: 30)
     */
    getSectorComparisonHistory(code: string, days: number = 30) {
        return service.get<{ success: boolean; data: SectorComparisonHistory; timestamp: string }>(
            `/investand/sectors/comparisons/${code}`,
            { params: { days } }
        );
    },

    /**
     * Get sector performance summary
     * @param days Number of days to summarize (default: 30)
     */
    getSectorSummary(days: number = 30) {
        return service.get<{
            success: boolean;
            data: Record<string, any[]>;
            period: string;
            timestamp: string
        }>(
            '/investand/sectors/summary/performance',
            { params: { days } }
        );
    },

    /**
     * Trigger sector data collection
     */
    collectSectorData() {
        return service.post<CollectionResult>('/investand/sectors/collect');
    },

    /**
     * Get sector data statistics
     */
    getSectorStats() {
        return service.get<{ success: boolean; data: SectorStats; timestamp: string }>(
            '/investand/sectors/stats/database'
        );
    },
};
