import { Router, Request, Response } from 'express';
import { GlobalAssetRepository } from '@investand/repositories/market/GlobalAssetRepository';
import { GlobalAssetCollectionService } from '@investand/collectors/globalAssetCollectionService';
import { GlobalAssetTypesMapper } from '@investand/clients/yahoo/GlobalAssetTypesMapper';
import { GLOBAL_ASSET_MAP, ASSETS_BY_CATEGORY } from '@investand/clients/yahoo/GlobalAssetClient';

const router = Router();

/**
 * GET /assets
 * Get latest performance data for all global assets
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { category } = req.query;

        const assets = await GlobalAssetRepository.getLatestAssetPerformances(
            category as string
        );

        if (!assets || assets.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No asset data available. Please trigger data collection first.'
            });
        }

        const formattedData = assets.map(asset => ({
            assetCode: asset.assetCode,
            assetName: asset.assetName,
            category: asset.category,
            date: asset.date,
            closePrice: parseFloat(asset.closePrice.toString()),
            change: asset.change ? parseFloat(asset.change.toString()) : null,
            changePercent: asset.changePercent ? parseFloat(asset.changePercent.toString()) : null,
            volume: asset.volume ? asset.volume.toString() : null,
            yearToDateReturn: asset.yearToDateReturn ? parseFloat(asset.yearToDateReturn.toString()) : null,
            oneMonthReturn: asset.oneMonthReturn ? parseFloat(asset.oneMonthReturn.toString()) : null,
            threeMonthReturn: asset.threeMonthReturn ? parseFloat(asset.threeMonthReturn.toString()) : null,
            sixMonthReturn: asset.sixMonthReturn ? parseFloat(asset.sixMonthReturn.toString()) : null,
            oneYearReturn: asset.oneYearReturn ? parseFloat(asset.oneYearReturn.toString()) : null,
            volatility: asset.volatility ? parseFloat(asset.volatility.toString()) : null,
        }));

        return res.json({
            success: true,
            data: formattedData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching assets:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve asset data'
        });
    }
});

/**
 * GET /assets/list
 * Get list of available global assets
 */
router.get('/list', (req: Request, res: Response) => {
    const assets = Object.entries(GLOBAL_ASSET_MAP).map(([code, info]) => ({
        code,
        name: info.name,
        ticker: info.ticker,
        category: info.category
    }));

    return res.json({
        success: true,
        data: assets,
        count: assets.length,
        categories: Object.keys(ASSETS_BY_CATEGORY)
    });
});

/**
 * GET /assets/categories
 * Get assets grouped by category
 */
router.get('/categories', (req: Request, res: Response) => {
    const grouped = Object.entries(ASSETS_BY_CATEGORY).map(([category, codes]) => ({
        category,
        assets: codes.map(code => ({
            code,
            ...GLOBAL_ASSET_MAP[code]
        })),
        count: codes.length
    }));

    return res.json({
        success: true,
        data: grouped
    });
});

/**
 * GET /assets/:code
 * Get specific asset performance data
 */
router.get('/:code', async (req: Request, res: Response) => {
    try {
        const { code } = req.params;
        const { days = 365 } = req.query;

        const assetData = await GlobalAssetRepository.getAssetPerformance(
            code,
            undefined,
            undefined,
            parseInt(days as string)
        );

        if (!assetData || assetData.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No data found for asset ${code}`
            });
        }

        const formattedData = assetData.map(record => ({
            date: record.date,
            closePrice: parseFloat(record.closePrice.toString()),
            openPrice: record.openPrice ? parseFloat(record.openPrice.toString()) : null,
            highPrice: record.highPrice ? parseFloat(record.highPrice.toString()) : null,
            lowPrice: record.lowPrice ? parseFloat(record.lowPrice.toString()) : null,
            volume: record.volume ? record.volume.toString() : null,
            changePercent: record.changePercent ? parseFloat(record.changePercent.toString()) : null,
        }));

        return res.json({
            success: true,
            data: {
                assetCode: code,
                assetName: assetData[0].assetName,
                category: assetData[0].category,
                records: formattedData,
                count: formattedData.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching asset data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve asset data'
        });
    }
});

/**
 * GET /assets/normalized/:period
 * Get normalized asset data (100-base scale) for comparison chart
 */
router.get('/normalized/:period', async (req: Request, res: Response) => {
    try {
        const { period } = req.params;
        const { assetCodes, category } = req.query;

        // Validate period
        if (!['1M', '3M', '6M', '1Y'].includes(period)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid period. Use: 1M, 3M, 6M, or 1Y'
            });
        }

        const normalizedData = await GlobalAssetRepository.getLatestNormalizedDataForChart(
            period as '1M' | '3M' | '6M' | '1Y'
        );

        if (!normalizedData || normalizedData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No normalized data available. Please trigger data collection first.'
            });
        }

        // Filter by asset codes or category if provided
        let filteredData = normalizedData;
        if (assetCodes) {
            const codes = (assetCodes as string).split(',');
            filteredData = normalizedData.filter(d => codes.includes(d.assetCode));
        } else if (category) {
            filteredData = normalizedData.filter(d => d.category === category);
        }

        // Group by asset code
        const groupedByAsset = filteredData.reduce((acc, record) => {
            if (!acc[record.assetCode]) {
                acc[record.assetCode] = {
                    assetCode: record.assetCode,
                    assetName: record.assetName,
                    category: record.category,
                    data: []
                };
            }

            acc[record.assetCode].data.push({
                date: record.currentDate,
                normalizedValue: parseFloat(record.normalizedValue.toString()),
                actualPrice: parseFloat(record.actualPrice.toString()),
                percentChange: parseFloat(record.percentChange.toString())
            });

            return acc;
        }, {} as Record<string, any>);

        const baseDate = filteredData[0]?.baseDate;

        return res.json({
            success: true,
            data: Object.values(groupedByAsset),
            baseDate,
            period,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching normalized data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve normalized data'
        });
    }
});

/**
 * GET /assets/correlations
 * Get correlation matrix for assets
 */
router.get('/correlations/matrix', async (req: Request, res: Response) => {
    try {
        const { period = 30 } = req.query;

        const correlations = await GlobalAssetRepository.getCorrelationMatrix(
            undefined,
            parseInt(period as string)
        );

        if (!correlations || correlations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No correlation data available'
            });
        }

        // Format as matrix
        const matrix: Record<string, Record<string, number>> = {};

        correlations.forEach(corr => {
            if (!matrix[corr.asset1Code]) {
                matrix[corr.asset1Code] = {};
            }
            matrix[corr.asset1Code][corr.asset2Code] = parseFloat(corr.correlation.toString());
        });

        return res.json({
            success: true,
            data: matrix,
            period: parseInt(period as string),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching correlations:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve correlation data'
        });
    }
});

/**
 * POST /assets/collect
 * Trigger global asset data collection
 */
router.post('/collect', async (req: Request, res: Response) => {
    try {
        // Check if collection should run
        if (!GlobalAssetCollectionService.shouldCollectData()) {
            return res.json({
                success: false,
                message: 'Data collection skipped (weekend or invalid time)',
                timestamp: new Date().toISOString()
            });
        }

        // Start collection
        const collectionResult = await GlobalAssetCollectionService.collectDailyAssetData();

        // Save to database
        const performanceData = Array.from(collectionResult.data.values())
            .map(asset => asset.performance);

        const saveResult = await GlobalAssetRepository.saveAssetPerformanceBatch(performanceData);

        return res.json({
            success: true,
            message: 'Global asset data collection completed',
            data: {
                assetsCollected: collectionResult.assetsCollected,
                performanceSaved: saveResult.successCount,
                errors: collectionResult.errors
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error during collection:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to collect global asset data',
            error: String(error)
        });
    }
});

/**
 * POST /assets/normalize/:period
 * Trigger normalized data collection for specific period
 */
router.post('/normalize/:period', async (req: Request, res: Response) => {
    try {
        const { period } = req.params;

        // Validate period
        if (!['1M', '3M', '6M', '1Y'].includes(period)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid period. Use: 1M, 3M, 6M, or 1Y'
            });
        }

        const normalizationResult = await GlobalAssetCollectionService.collectNormalizedAssetData(
            period as '1M' | '3M' | '6M' | '1Y'
        );

        if (!normalizationResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Normalization failed',
                errors: normalizationResult.errors
            });
        }

        // Save normalized data
        const normalizedModels = [];
        for (const [assetCode, data] of normalizationResult.normalizedData.entries()) {
            const assetInfo = GLOBAL_ASSET_MAP[assetCode];
            if (!assetInfo) continue;

            const models = GlobalAssetTypesMapper.toNormalizedModels(
                normalizationResult.baseDate,
                assetCode,
                assetInfo.name,
                assetInfo.category,
                data
            );

            normalizedModels.push(...models);
        }

        const saveResult = await GlobalAssetRepository.saveNormalizedDataBatch(normalizedModels);

        return res.json({
            success: true,
            message: 'Normalized data collection completed',
            data: {
                period,
                baseDate: normalizationResult.baseDate,
                assetsNormalized: normalizationResult.normalizedData.size,
                recordsSaved: saveResult.successCount,
                errors: normalizationResult.errors
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error during normalization:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to normalize asset data',
            error: String(error)
        });
    }
});

/**
 * GET /assets/stats
 * Get asset data statistics
 */
router.get('/stats/database', async (req: Request, res: Response) => {
    try {
        const stats = await GlobalAssetRepository.getAssetDataStats();

        return res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve statistics'
        });
    }
});

export default router;
