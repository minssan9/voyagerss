import { SectorData, SectorQuote } from './SectorApiClient';

/**
 * Maps Yahoo Finance sector data to database models
 */

export interface SectorPerformanceModel {
    date: Date;
    sectorCode: string;
    sectorName: string;
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
    oneYearReturn?: number;
    marketCap?: bigint;
    averagePE?: number;
    averagePB?: number;
    dividendYield?: number;
}

export interface SectorComparisonModel {
    date: Date;
    comparisonType: string;
    sectorCode: string;
    benchmarkCode: string;
    relativeStrength?: number;
    beta?: number;
    correlation?: number;
    volatility?: number;
    sharpeRatio?: number;
    rank?: number;
}

export class SectorTypesMapper {

    /**
     * Maps SectorData to SectorPerformanceModel for database insertion
     */
    static toPerformanceModel(
        data: SectorData,
        returns?: { ytd: number; oneMonth: number; threeMonth: number; oneYear: number },
        quote?: SectorQuote
    ): SectorPerformanceModel {
        return {
            date: data.date,
            sectorCode: data.sectorCode,
            sectorName: data.sectorName,
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
            oneYearReturn: returns?.oneYear,
            marketCap: quote?.marketCap ? BigInt(Math.round(quote.marketCap)) : undefined,
            averagePE: quote?.averagePE,
            averagePB: undefined, // P/B ratio not available from quote
            dividendYield: quote?.dividendYield,
        };
    }

    /**
     * Maps multiple SectorData points to performance models
     */
    static toPerformanceModels(
        dataArray: SectorData[],
        returns?: { ytd: number; oneMonth: number; threeMonth: number; oneYear: number },
        quote?: SectorQuote
    ): SectorPerformanceModel[] {
        return dataArray.map(data => this.toPerformanceModel(data, returns, quote));
    }

    /**
     * Creates a comparison model
     */
    static toComparisonModel(
        date: Date,
        sectorCode: string,
        benchmarkCode: string,
        metrics: {
            relativeStrength?: number;
            beta?: number;
            correlation?: number;
            volatility?: number;
            sharpeRatio?: number;
            rank?: number;
        }
    ): SectorComparisonModel {
        return {
            date,
            comparisonType: 'relative_strength',
            sectorCode,
            benchmarkCode,
            relativeStrength: metrics.relativeStrength,
            beta: metrics.beta,
            correlation: metrics.correlation,
            volatility: metrics.volatility,
            sharpeRatio: metrics.sharpeRatio,
            rank: metrics.rank,
        };
    }

    /**
     * Calculate relative strength (sector performance vs benchmark)
     */
    static calculateRelativeStrength(
        sectorReturn: number,
        benchmarkReturn: number
    ): number {
        return sectorReturn - benchmarkReturn;
    }

    /**
     * Calculate Sharpe ratio (risk-adjusted return)
     * Assumes risk-free rate of 4% (adjustable)
     */
    static calculateSharpeRatio(
        annualReturn: number,
        volatility: number,
        riskFreeRate: number = 4.0
    ): number {
        if (volatility === 0) return 0;
        return (annualReturn - riskFreeRate) / volatility;
    }

    /**
     * Rank sectors by performance
     */
    static rankSectors(
        sectorsData: Map<string, { return: number; volatility: number }>
    ): Map<string, number> {
        const rankings = new Map<string, number>();

        // Sort by return (descending)
        const sorted = Array.from(sectorsData.entries())
            .sort((a, b) => b[1].return - a[1].return);

        sorted.forEach(([sectorCode], index) => {
            rankings.set(sectorCode, index + 1);
        });

        return rankings;
    }
}
