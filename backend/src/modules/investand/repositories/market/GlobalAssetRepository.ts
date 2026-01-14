import { BaseRepository } from '@investand/repositories/core/BaseRepository';
import type {
    GlobalAssetPerformanceModel,
    NormalizedAssetDataModel,
    AssetCorrelationModel
} from '@investand/clients/yahoo/GlobalAssetTypesMapper';

/**
 * Global Asset Repository
 * Handles all database operations for global asset performance and normalized data
 */
export class GlobalAssetRepository extends BaseRepository {

    // ================================
    // GLOBAL ASSET PERFORMANCE OPERATIONS
    // ================================

    /**
     * Saves or updates global asset performance data
     */
    static async saveAssetPerformance(data: GlobalAssetPerformanceModel): Promise<void> {
        this.validateRequired(data, ['date', 'assetCode', 'assetName', 'category', 'closePrice']);

        const { date, assetCode, ...fields } = data;

        try {
            await this.prisma.globalAssetPerformance.upsert({
                where: {
                    date_assetCode: {
                        date: this.validateAndFormatDate(date),
                        assetCode,
                    },
                },
                update: {
                    ...fields,
                    updatedAt: new Date(),
                },
                create: {
                    date: this.validateAndFormatDate(date),
                    assetCode,
                    ...fields,
                },
            });

            this.logSuccess(`Asset performance saved: ${assetCode}`, date);
        } catch (error) {
            this.logError(`Failed to save asset performance: ${assetCode}`, date, error);
            throw error;
        }
    }

    /**
     * Batch save asset performance data
     */
    static async saveAssetPerformanceBatch(
        data: GlobalAssetPerformanceModel[]
    ): Promise<{
        successCount: number;
        errorCount: number;
    }> {
        const results = { successCount: 0, errorCount: 0 };

        return this.measureTime(async () => {
            return this.executeTransaction(async (prisma) => {
                for (const assetData of data) {
                    try {
                        const { date, assetCode, ...fields } = assetData;

                        await prisma.globalAssetPerformance.upsert({
                            where: {
                                date_assetCode: {
                                    date: this.validateAndFormatDate(date),
                                    assetCode,
                                },
                            },
                            update: {
                                ...fields,
                                updatedAt: new Date(),
                            },
                            create: {
                                date: this.validateAndFormatDate(date),
                                assetCode,
                                ...fields,
                            },
                        });

                        results.successCount++;
                    } catch (error) {
                        this.logError(`Batch save failed for asset`, assetData.assetCode, error);
                        results.errorCount++;
                    }
                }

                this.logBatchResult(
                    'Asset performance batch save',
                    results.successCount,
                    data.length
                );

                return results;
            });
        }, `Asset performance batch (${data.length} records)`);
    }

    /**
     * Get latest asset performance for all assets or by category
     */
    static async getLatestAssetPerformances(category?: string) {
        try {
            const latestDate = await this.prisma.globalAssetPerformance.findFirst({
                orderBy: { date: 'desc' },
                select: { date: true },
            });

            if (!latestDate) {
                return [];
            }

            const where: any = { date: latestDate.date };
            if (category) {
                where.category = category;
            }

            const data = await this.prisma.globalAssetPerformance.findMany({
                where,
                orderBy: { assetCode: 'asc' },
            });

            return data;
        } catch (error) {
            this.logError('Failed to retrieve latest asset performances', category || 'all', error);
            throw error;
        }
    }

    /**
     * Get asset performance data for specific asset
     */
    static async getAssetPerformance(
        assetCode: string,
        startDate?: Date,
        endDate?: Date,
        limit: number = 365
    ) {
        try {
            const where: any = { assetCode };

            if (startDate || endDate) {
                where.date = {};
                if (startDate) where.date.gte = this.validateAndFormatDate(startDate);
                if (endDate) where.date.lte = this.validateAndFormatDate(endDate);
            }

            const data = await this.prisma.globalAssetPerformance.findMany({
                where,
                orderBy: { date: 'desc' },
                take: limit,
            });

            return data;
        } catch (error) {
            this.logError('Failed to retrieve asset performance', assetCode, error);
            throw error;
        }
    }

    // ================================
    // NORMALIZED ASSET DATA OPERATIONS
    // ================================

    /**
     * Save normalized asset data
     */
    static async saveNormalizedData(data: NormalizedAssetDataModel): Promise<void> {
        this.validateRequired(data, ['baseDate', 'currentDate', 'assetCode', 'normalizedValue']);

        const { baseDate, currentDate, assetCode, ...fields } = data;

        try {
            await this.prisma.normalizedAssetData.upsert({
                where: {
                    baseDate_currentDate_assetCode: {
                        baseDate: this.validateAndFormatDate(baseDate),
                        currentDate: this.validateAndFormatDate(currentDate),
                        assetCode,
                    },
                },
                update: {
                    ...fields,
                    updatedAt: new Date(),
                },
                create: {
                    baseDate: this.validateAndFormatDate(baseDate),
                    currentDate: this.validateAndFormatDate(currentDate),
                    assetCode,
                    ...fields,
                },
            });

            this.logSuccess(`Normalized data saved: ${assetCode}`, currentDate);
        } catch (error) {
            this.logError(`Failed to save normalized data: ${assetCode}`, currentDate, error);
            throw error;
        }
    }

    /**
     * Batch save normalized asset data
     */
    static async saveNormalizedDataBatch(
        data: NormalizedAssetDataModel[]
    ): Promise<{
        successCount: number;
        errorCount: number;
    }> {
        const results = { successCount: 0, errorCount: 0 };

        return this.measureTime(async () => {
            return this.executeTransaction(async (prisma) => {
                for (const normalizedData of data) {
                    try {
                        const { baseDate, currentDate, assetCode, ...fields } = normalizedData;

                        await prisma.normalizedAssetData.upsert({
                            where: {
                                baseDate_currentDate_assetCode: {
                                    baseDate: this.validateAndFormatDate(baseDate),
                                    currentDate: this.validateAndFormatDate(currentDate),
                                    assetCode,
                                },
                            },
                            update: {
                                ...fields,
                                updatedAt: new Date(),
                            },
                            create: {
                                baseDate: this.validateAndFormatDate(baseDate),
                                currentDate: this.validateAndFormatDate(currentDate),
                                assetCode,
                                ...fields,
                            },
                        });

                        results.successCount++;
                    } catch (error) {
                        this.logError(`Batch normalized save failed`, normalizedData.assetCode, error);
                        results.errorCount++;
                    }
                }

                this.logBatchResult(
                    'Normalized data batch save',
                    results.successCount,
                    data.length
                );

                return results;
            });
        }, `Normalized data batch (${data.length} records)`);
    }

    /**
     * Get normalized data for specific period and assets
     */
    static async getNormalizedData(
        baseDate: Date,
        assetCodes?: string[],
        category?: string
    ) {
        try {
            const where: any = { baseDate: this.validateAndFormatDate(baseDate) };

            if (assetCodes && assetCodes.length > 0) {
                where.assetCode = { in: assetCodes };
            }

            if (category) {
                where.category = category;
            }

            const data = await this.prisma.normalizedAssetData.findMany({
                where,
                orderBy: [
                    { assetCode: 'asc' },
                    { currentDate: 'asc' },
                ],
            });

            return data;
        } catch (error) {
            this.logError('Failed to retrieve normalized data', baseDate.toISOString(), error);
            throw error;
        }
    }

    /**
     * Get latest normalized data for chart display
     */
    static async getLatestNormalizedDataForChart(
        period: '1M' | '3M' | '6M' | '1Y' = '1Y'
    ) {
        try {
            // Calculate base date based on period
            const daysMap = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
            const days = daysMap[period];

            const baseDate = new Date();
            baseDate.setDate(baseDate.getDate() - days);

            // Get the most recent normalized data batch
            const latestBaseDate = await this.prisma.normalizedAssetData.findFirst({
                where: { baseDate: { gte: baseDate } },
                orderBy: { baseDate: 'desc' },
                select: { baseDate: true },
            });

            if (!latestBaseDate) {
                return [];
            }

            const data = await this.prisma.normalizedAssetData.findMany({
                where: { baseDate: latestBaseDate.baseDate },
                orderBy: [
                    { assetCode: 'asc' },
                    { currentDate: 'asc' },
                ],
            });

            return data;
        } catch (error) {
            this.logError('Failed to retrieve chart data', period, error);
            throw error;
        }
    }

    // ================================
    // ASSET CORRELATION OPERATIONS
    // ================================

    /**
     * Save asset correlation data
     */
    static async saveCorrelation(data: AssetCorrelationModel): Promise<void> {
        this.validateRequired(data, ['date', 'asset1Code', 'asset2Code', 'correlation', 'period']);

        const { date, asset1Code, asset2Code, period, ...fields } = data;

        try {
            await this.prisma.assetCorrelation.upsert({
                where: {
                    date_asset1Code_asset2Code_period: {
                        date: this.validateAndFormatDate(date),
                        asset1Code,
                        asset2Code,
                        period,
                    },
                },
                update: {
                    ...fields,
                    updatedAt: new Date(),
                },
                create: {
                    date: this.validateAndFormatDate(date),
                    asset1Code,
                    asset2Code,
                    period,
                    ...fields,
                },
            });

            this.logSuccess(`Correlation saved: ${asset1Code} vs ${asset2Code}`, date);
        } catch (error) {
            this.logError(`Failed to save correlation`, asset1Code, error);
            throw error;
        }
    }

    /**
     * Get correlation matrix for a specific date and period
     */
    static async getCorrelationMatrix(date?: Date, period: number = 30) {
        try {
            const targetDate = date ? this.validateAndFormatDate(date) : new Date();

            const data = await this.prisma.assetCorrelation.findMany({
                where: {
                    date: targetDate,
                    period,
                },
                orderBy: [
                    { asset1Code: 'asc' },
                    { asset2Code: 'asc' },
                ],
            });

            return data;
        } catch (error) {
            this.logError('Failed to retrieve correlation matrix', period.toString(), error);
            throw error;
        }
    }

    // ================================
    // UTILITY OPERATIONS
    // ================================

    /**
     * Get asset data statistics
     */
    static async getAssetDataStats() {
        try {
            const [perfCount, normCount, corrCount, latestPerf, latestNorm] = await Promise.all([
                this.prisma.globalAssetPerformance.count(),
                this.prisma.normalizedAssetData.count(),
                this.prisma.assetCorrelation.count(),
                this.prisma.globalAssetPerformance.findFirst({
                    orderBy: { date: 'desc' },
                    select: { date: true },
                }),
                this.prisma.normalizedAssetData.findFirst({
                    orderBy: { currentDate: 'desc' },
                    select: { currentDate: true },
                }),
            ]);

            return {
                performanceRecords: perfCount,
                normalizedRecords: normCount,
                correlationRecords: corrCount,
                latestPerformanceDate: latestPerf?.date,
                latestNormalizedDate: latestNorm?.currentDate,
            };
        } catch (error) {
            this.logError('Failed to retrieve asset data stats', 'stats', error);
            throw error;
        }
    }
}
