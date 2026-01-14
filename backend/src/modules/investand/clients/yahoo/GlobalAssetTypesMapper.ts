import { AssetData, AssetQuote } from './GlobalAssetClient';

/**
 * Maps Yahoo Finance global asset data to database models
 */

export interface GlobalAssetPerformanceModel {
    date: Date;
    assetCode: string;
    assetName: string;
    category: string;
    closePrice: number;
    openPrice?: number;
    highPrice?: number;
    lowPrice?: number;
    volume?: bigint;
    change?: number;
    changePercent?: number;
    yearToDateReturn?: number;
    oneMonthReturn?: number;
    threeMonthReturn?: number;
    sixMonthReturn?: number;
    oneYearReturn?: number;
    volatility?: number;
}

export interface NormalizedAssetDataModel {
    baseDate: Date;
    currentDate: Date;
    assetCode: string;
    assetName: string;
    category: string;
    normalizedValue: number;
    actualPrice: number;
    percentChange: number;
}

export interface AssetCorrelationModel {
    date: Date;
    asset1Code: string;
    asset2Code: string;
    correlation: number;
    period: number;
}

export class GlobalAssetTypesMapper {

    /**
     * Maps AssetData to GlobalAssetPerformanceModel for database insertion
     */
    static toPerformanceModel(
        data: AssetData,
        returns?: { ytd: number; oneMonth: number; threeMonth: number; sixMonth: number; oneYear: number },
        volatility?: number,
        quote?: AssetQuote
    ): GlobalAssetPerformanceModel {
        return {
            date: data.date,
            assetCode: data.assetCode,
            assetName: data.assetName,
            category: data.category,
            closePrice: data.closePrice,
            openPrice: data.openPrice,
            highPrice: data.highPrice,
            lowPrice: data.lowPrice,
            volume: data.volume ? BigInt(data.volume) : undefined,
            change: data.change,
            changePercent: data.changePercent,
            yearToDateReturn: returns?.ytd,
            oneMonthReturn: returns?.oneMonth,
            threeMonthReturn: returns?.threeMonth,
            sixMonthReturn: returns?.sixMonth,
            oneYearReturn: returns?.oneYear,
            volatility,
        };
    }

    /**
     * Maps multiple AssetData points to performance models
     */
    static toPerformanceModels(
        dataArray: AssetData[],
        returns?: { ytd: number; oneMonth: number; threeMonth: number; sixMonth: number; oneYear: number },
        volatility?: number,
        quote?: AssetQuote
    ): GlobalAssetPerformanceModel[] {
        return dataArray.map(data => this.toPerformanceModel(data, returns, volatility, quote));
    }

    /**
     * Maps normalized data to NormalizedAssetDataModel
     */
    static toNormalizedModel(
        baseDate: Date,
        currentDate: Date,
        assetCode: string,
        assetName: string,
        category: string,
        normalizedValue: number,
        actualPrice: number,
        percentChange: number
    ): NormalizedAssetDataModel {
        return {
            baseDate,
            currentDate,
            assetCode,
            assetName,
            category,
            normalizedValue,
            actualPrice,
            percentChange,
        };
    }

    /**
     * Maps normalized data array to models
     */
    static toNormalizedModels(
        baseDate: Date,
        assetCode: string,
        assetName: string,
        category: string,
        normalizedData: { date: Date; normalizedValue: number; actualPrice: number; percentChange: number }[]
    ): NormalizedAssetDataModel[] {
        return normalizedData.map(d =>
            this.toNormalizedModel(
                baseDate,
                d.date,
                assetCode,
                assetName,
                category,
                d.normalizedValue,
                d.actualPrice,
                d.percentChange
            )
        );
    }

    /**
     * Creates a correlation model
     */
    static toCorrelationModel(
        date: Date,
        asset1Code: string,
        asset2Code: string,
        correlation: number,
        period: number = 30
    ): AssetCorrelationModel {
        return {
            date,
            asset1Code,
            asset2Code,
            correlation,
            period,
        };
    }

    /**
     * Calculate correlation matrix for multiple assets
     */
    static calculateCorrelationMatrix(
        assetsData: Map<string, AssetData[]>,
        period: number = 30
    ): Map<string, Map<string, number>> {
        const matrix = new Map<string, Map<string, number>>();
        const assetCodes = Array.from(assetsData.keys());

        for (const asset1 of assetCodes) {
            const correlations = new Map<string, number>();

            for (const asset2 of assetCodes) {
                if (asset1 === asset2) {
                    correlations.set(asset2, 1.0);
                } else {
                    const data1 = assetsData.get(asset1) || [];
                    const data2 = assetsData.get(asset2) || [];

                    // Use only recent period
                    const recentData1 = data1.slice(-period);
                    const recentData2 = data2.slice(-period);

                    const correlation = this.calculateCorrelation(recentData1, recentData2);
                    correlations.set(asset2, correlation);
                }
            }

            matrix.set(asset1, correlations);
        }

        return matrix;
    }

    /**
     * Calculate correlation between two asset data series
     */
    private static calculateCorrelation(asset1Data: AssetData[], asset2Data: AssetData[]): number {
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

    /**
     * Format normalized data for chart display
     */
    static formatNormalizedDataForChart(
        normalizedData: Map<string, { date: Date; normalizedValue: number }[]>
    ): {
        labels: string[];
        datasets: { assetCode: string; data: number[] }[];
    } {
        // Get all unique dates and sort them
        const allDates = new Set<string>();
        normalizedData.forEach(data => {
            data.forEach(d => allDates.add(d.date.toISOString().split('T')[0]));
        });

        const labels = Array.from(allDates).sort();

        // Create datasets for each asset
        const datasets = Array.from(normalizedData.entries()).map(([assetCode, data]) => {
            const dataMap = new Map(data.map(d => [
                d.date.toISOString().split('T')[0],
                d.normalizedValue
            ]));

            return {
                assetCode,
                data: labels.map(label => dataMap.get(label) || 100),
            };
        });

        return { labels, datasets };
    }
}
