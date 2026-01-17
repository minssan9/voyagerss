import { BaseRepository } from '@investand/repositories/core/BaseRepository';
import type {
    SectorPerformanceModel,
    SectorComparisonModel
} from '@investand/clients/yahoo/SectorTypesMapper';

/**
 * Sector Data Repository
 * Handles all database operations for sector performance and comparison data
 */
export class SectorRepository extends BaseRepository {

    // ================================
    // SECTOR PERFORMANCE OPERATIONS
    // ================================

    /**
     * Saves or updates sector performance data
     */
    static async saveSectorPerformance(data: SectorPerformanceModel): Promise<void> {
        this.validateRequired(data, ['date', 'sectorCode', 'sectorName', 'closePrice']);

        const { date, sectorCode, ...fields } = data;

        try {
            await this.prisma.sectorPerformance.upsert({
                where: {
                    date_sectorCode: {
                        date: this.validateAndFormatDate(date),
                        sectorCode,
                    },
                },
                update: {
                    ...fields,
                    updatedAt: new Date(),
                },
                create: {
                    date: this.validateAndFormatDate(date),
                    sectorCode,
                    ...fields,
                },
            });

            this.logSuccess(`Sector performance saved: ${sectorCode}`, date);
        } catch (error) {
            this.logError(`Failed to save sector performance: ${sectorCode}`, date, error);
            throw error;
        }
    }

    /**
     * Batch save sector performance data
     */
    static async saveSectorPerformanceBatch(
        data: SectorPerformanceModel[]
    ): Promise<{
        successCount: number;
        errorCount: number;
    }> {
        const results = { successCount: 0, errorCount: 0 };

        return this.measureTime(async () => {
            return this.executeTransaction(async (prisma) => {
                for (const sectorData of data) {
                    try {
                        const { date, sectorCode, ...fields } = sectorData;

                        await prisma.sectorPerformance.upsert({
                            where: {
                                date_sectorCode: {
                                    date: this.validateAndFormatDate(date),
                                    sectorCode,
                                },
                            },
                            update: {
                                ...fields,
                                updatedAt: new Date(),
                            },
                            create: {
                                date: this.validateAndFormatDate(date),
                                sectorCode,
                                ...fields,
                            },
                        });

                        results.successCount++;
                    } catch (error) {
                        this.logError(`Batch save failed for sector`, sectorData.sectorCode, error);
                        results.errorCount++;
                    }
                }

                this.logBatchResult(
                    'Sector performance batch save',
                    results.successCount,
                    data.length
                );

                return results;
            });
        }, `Sector performance batch (${data.length} records)`);
    }

    /**
     * Retrieves sector performance data for a specific date range
     */
    static async getSectorPerformance(
        sectorCode?: string,
        startDate?: Date,
        endDate?: Date,
        limit: number = 100
    ) {
        try {
            const where: any = {};

            if (sectorCode) {
                where.sectorCode = sectorCode;
            }

            if (startDate || endDate) {
                where.date = {};
                if (startDate) where.date.gte = this.validateAndFormatDate(startDate);
                if (endDate) where.date.lte = this.validateAndFormatDate(endDate);
            }

            const data = await this.prisma.sectorPerformance.findMany({
                where,
                orderBy: { date: 'desc' },
                take: limit,
            });

            return data;
        } catch (error) {
            this.logError('Failed to retrieve sector performance', sectorCode || 'all', error);
            throw error;
        }
    }

    /**
     * Get latest sector performance data for all sectors
     */
    static async getLatestSectorPerformances() {
        try {
            // Get the most recent date
            const latestDate = await this.prisma.sectorPerformance.findFirst({
                orderBy: { date: 'desc' },
                select: { date: true },
            });

            if (!latestDate) {
                return [];
            }

            // Get all sectors for that date
            const data = await this.prisma.sectorPerformance.findMany({
                where: { date: latestDate.date },
                orderBy: { sectorCode: 'asc' },
            });

            return data;
        } catch (error) {
            this.logError('Failed to retrieve latest sector performances', 'all', error);
            throw error;
        }
    }

    /**
     * Get sector performance summary (aggregated metrics)
     */
    static async getSectorPerformanceSummary(days: number = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const data = await this.prisma.sectorPerformance.findMany({
                where: {
                    date: { gte: startDate },
                },
                orderBy: [
                    { sectorCode: 'asc' },
                    { date: 'desc' },
                ],
            });

            // Group by sector
            const sectorGroups = data.reduce((acc, record) => {
                if (!acc[record.sectorCode]) {
                    acc[record.sectorCode] = [];
                }
                acc[record.sectorCode].push(record);
                return acc;
            }, {} as Record<string, any[]>);

            return sectorGroups;
        } catch (error) {
            this.logError('Failed to retrieve sector performance summary', days.toString(), error);
            throw error;
        }
    }

    // ================================
    // SECTOR COMPARISON OPERATIONS
    // ================================

    /**
     * Saves or updates sector comparison data
     */
    static async saveSectorComparison(data: SectorComparisonModel): Promise<void> {
        this.validateRequired(data, ['date', 'comparisonType', 'sectorCode', 'benchmarkCode']);

        const { date, comparisonType, sectorCode, benchmarkCode, ...fields } = data;

        try {
            await this.prisma.sectorComparison.upsert({
                where: {
                    date_comparisonType_sectorCode_benchmarkCode: {
                        date: this.validateAndFormatDate(date),
                        comparisonType,
                        sectorCode,
                        benchmarkCode,
                    },
                },
                update: {
                    ...fields,
                    updatedAt: new Date(),
                },
                create: {
                    date: this.validateAndFormatDate(date),
                    comparisonType,
                    sectorCode,
                    benchmarkCode,
                    ...fields,
                },
            });

            this.logSuccess(`Sector comparison saved: ${sectorCode} vs ${benchmarkCode}`, date);
        } catch (error) {
            this.logError(`Failed to save sector comparison: ${sectorCode}`, date, error);
            throw error;
        }
    }

    /**
     * Batch save sector comparison data
     */
    static async saveSectorComparisonBatch(
        data: SectorComparisonModel[]
    ): Promise<{
        successCount: number;
        errorCount: number;
    }> {
        const results = { successCount: 0, errorCount: 0 };

        return this.measureTime(async () => {
            return this.executeTransaction(async (prisma) => {
                for (const comparison of data) {
                    try {
                        const { date, comparisonType, sectorCode, benchmarkCode, ...fields } = comparison;

                        await prisma.sectorComparison.upsert({
                            where: {
                                date_comparisonType_sectorCode_benchmarkCode: {
                                    date: this.validateAndFormatDate(date),
                                    comparisonType,
                                    sectorCode,
                                    benchmarkCode,
                                },
                            },
                            update: {
                                ...fields,
                                updatedAt: new Date(),
                            },
                            create: {
                                date: this.validateAndFormatDate(date),
                                comparisonType,
                                sectorCode,
                                benchmarkCode,
                                ...fields,
                            },
                        });

                        results.successCount++;
                    } catch (error) {
                        this.logError(`Batch comparison save failed`, comparison.sectorCode, error);
                        results.errorCount++;
                    }
                }

                this.logBatchResult(
                    'Sector comparison batch save',
                    results.successCount,
                    data.length
                );

                return results;
            });
        }, `Sector comparison batch (${data.length} records)`);
    }

    /**
     * Get sector comparisons for a specific date and benchmark
     */
    static async getSectorComparisons(
        benchmarkCode: string = 'SPY',
        date?: Date,
        comparisonType: string = 'relative_strength'
    ) {
        try {
            const where: any = {
                benchmarkCode,
                comparisonType,
            };

            if (date) {
                where.date = this.validateAndFormatDate(date);
            }

            const data = await this.prisma.sectorComparison.findMany({
                where,
                orderBy: [
                    { date: 'desc' },
                    { rank: 'asc' },
                ],
            });

            return data;
        } catch (error) {
            this.logError('Failed to retrieve sector comparisons', benchmarkCode, error);
            throw error;
        }
    }

    /**
     * Get latest sector comparisons
     */
    static async getLatestSectorComparisons(
        benchmarkCode: string = 'SPY',
        comparisonType: string = 'relative_strength'
    ) {
        try {
            // Get the most recent date
            const latestDate = await this.prisma.sectorComparison.findFirst({
                where: { benchmarkCode, comparisonType },
                orderBy: { date: 'desc' },
                select: { date: true },
            });

            if (!latestDate) {
                return [];
            }

            // Get all comparisons for that date
            const data = await this.prisma.sectorComparison.findMany({
                where: {
                    date: latestDate.date,
                    benchmarkCode,
                    comparisonType,
                },
                orderBy: { rank: 'asc' },
            });

            return data;
        } catch (error) {
            this.logError('Failed to retrieve latest sector comparisons', benchmarkCode, error);
            throw error;
        }
    }

    /**
     * Get sector rankings over time
     */
    static async getSectorRankingHistory(
        sectorCode: string,
        days: number = 30
    ) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const data = await this.prisma.sectorComparison.findMany({
                where: {
                    sectorCode,
                    date: { gte: startDate },
                },
                orderBy: { date: 'desc' },
            });

            return data;
        } catch (error) {
            this.logError('Failed to retrieve sector ranking history', sectorCode, error);
            throw error;
        }
    }

    // ================================
    // UTILITY OPERATIONS
    // ================================

    /**
     * Delete old sector data (for maintenance)
     */
    static async deleteOldSectorData(daysToKeep: number = 365): Promise<void> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const [perfDeleted, compDeleted] = await Promise.all([
                this.prisma.sectorPerformance.deleteMany({
                    where: { date: { lt: cutoffDate } },
                }),
                this.prisma.sectorComparison.deleteMany({
                    where: { date: { lt: cutoffDate } },
                }),
            ]);

            this.logSuccess(
                `Deleted old sector data: ${perfDeleted.count} performance, ${compDeleted.count} comparison records`,
                cutoffDate
            );
        } catch (error) {
            this.logError('Failed to delete old sector data', daysToKeep.toString(), error);
            throw error;
        }
    }

    /**
     * Get sector data statistics
     */
    static async getSectorDataStats() {
        try {
            const [perfCount, compCount, latestPerf, latestComp] = await Promise.all([
                this.prisma.sectorPerformance.count(),
                this.prisma.sectorComparison.count(),
                this.prisma.sectorPerformance.findFirst({
                    orderBy: { date: 'desc' },
                    select: { date: true },
                }),
                this.prisma.sectorComparison.findFirst({
                    orderBy: { date: 'desc' },
                    select: { date: true },
                }),
            ]);

            return {
                performanceRecords: perfCount,
                comparisonRecords: compCount,
                latestPerformanceDate: latestPerf?.date,
                latestComparisonDate: latestComp?.date,
            };
        } catch (error) {
            this.logError('Failed to retrieve sector data stats', 'stats', error);
            throw error;
        }
    }
}
