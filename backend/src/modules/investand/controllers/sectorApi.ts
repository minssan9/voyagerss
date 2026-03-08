import { Router, Request, Response } from 'express';
import { SectorRepository } from '@investand/repositories/market/SectorRepository';
import { SectorCollectionService } from '@investand/collectors/sectorCollectionService';
import { SECTOR_ETF_MAP } from '@investand/clients/yahoo/SectorApiClient';

const router = Router();

/**
 * GET /sectors
 * Get latest performance data for all sectors
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const sectors = await SectorRepository.getLatestSectorPerformances();

        if (!sectors || sectors.length === 0) {
            // Mock data for development
            const mockSectors = [
                { sectorCode: 'XLK', sectorName: 'Technology', changePercent: 1.2 },
                { sectorCode: 'XLF', sectorName: 'Financials', changePercent: 0.5 },
                { sectorCode: 'XLV', sectorName: 'Health Care', changePercent: -0.3 },
                { sectorCode: 'XLE', sectorName: 'Energy', changePercent: 2.1 },
                { sectorCode: 'XLY', sectorName: 'Consumer Discretionary', changePercent: 0.8 },
                { sectorCode: 'XLP', sectorName: 'Consumer Staples', changePercent: -0.1 },
                { sectorCode: 'XLI', sectorName: 'Industrials', changePercent: 1.5 },
                { sectorCode: 'XLB', sectorName: 'Materials', changePercent: 0.9 },
                { sectorCode: 'XLRE', sectorName: 'Real Estate', changePercent: -0.5 },
                { sectorCode: 'XLC', sectorName: 'Communication Services', changePercent: 1.1 },
                { sectorCode: 'XLU', sectorName: 'Utilities', changePercent: -0.2 },
            ];

            const formattedData = mockSectors.map(s => ({
                sectorCode: s.sectorCode,
                sectorName: s.sectorName,
                date: new Date(),
                closePrice: 100 + Math.random() * 50,
                change: Math.random() * 5,
                changePercent: s.changePercent,
                volume: 1000000 + Math.random() * 500000,
                yearToDateReturn: Math.random() * 20,
                oneMonthReturn: Math.random() * 5,
                threeMonthReturn: Math.random() * 10,
                oneYearReturn: Math.random() * 15,
                marketCap: 1000000000,
                averagePE: 20 + Math.random() * 10,
                dividendYield: 1 + Math.random() * 3,
            }));

            return res.json({
                success: true,
                data: formattedData,
                timestamp: new Date().toISOString(),
                isMock: true
            });
        }

        const formattedData = sectors.map(sector => ({
            sectorCode: sector.sectorCode,
            sectorName: sector.sectorName,
            date: sector.date,
            closePrice: parseFloat(sector.closePrice.toString()),
            change: sector.change ? parseFloat(sector.change.toString()) : null,
            changePercent: sector.changePercent ? parseFloat(sector.changePercent.toString()) : null,
            volume: sector.volume ? sector.volume.toString() : null,
            yearToDateReturn: sector.yearToDateReturn ? parseFloat(sector.yearToDateReturn.toString()) : null,
            oneMonthReturn: sector.oneMonthReturn ? parseFloat(sector.oneMonthReturn.toString()) : null,
            threeMonthReturn: sector.threeMonthReturn ? parseFloat(sector.threeMonthReturn.toString()) : null,
            oneYearReturn: sector.oneYearReturn ? parseFloat(sector.oneYearReturn.toString()) : null,
            marketCap: sector.marketCap ? sector.marketCap.toString() : null,
            averagePE: sector.averagePE ? parseFloat(sector.averagePE.toString()) : null,
            dividendYield: sector.dividendYield ? parseFloat(sector.dividendYield.toString()) : null,
        }));

        return res.json({
            success: true,
            data: formattedData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching sectors:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve sector data'
        });
    }
});

/**
 * GET /sectors/list
 * Get list of available sectors
 */
router.get('/list', (req: Request, res: Response) => {
    const sectors = Object.entries(SECTOR_ETF_MAP).map(([code, info]) => ({
        code,
        name: info.name,
        ticker: info.ticker
    }));

    return res.json({
        success: true,
        data: sectors,
        count: sectors.length
    });
});

/**
 * GET /sectors/:code
 * Get specific sector performance data
 */
router.get('/:code', async (req: Request, res: Response) => {
    try {
        const { code } = req.params;
        const { days = 30 } = req.query;

        const sectorData = await SectorRepository.getSectorPerformance(
            code,
            undefined,
            undefined,
            parseInt(days as string)
        );

        if (!sectorData || sectorData.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No data found for sector ${code}`
            });
        }

        const formattedData = sectorData.map(record => ({
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
                sectorCode: code,
                sectorName: sectorData[0].sectorName,
                records: formattedData,
                count: formattedData.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching sector data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve sector data'
        });
    }
});

/**
 * GET /sectors/comparisons/latest
 * Get latest sector comparisons against benchmark
 */
router.get('/comparisons/latest', async (req: Request, res: Response) => {
    try {
        const { benchmark = 'SPY' } = req.query;

        const comparisons = await SectorRepository.getLatestSectorComparisons(
            benchmark as string
        );

        if (!comparisons || comparisons.length === 0) {
            // Mock data for development
            const mockComparisons = [
                { sectorCode: 'XLK', relativeStrength: 1.05, beta: 1.2, correlation: 0.85, volatility: 0.18, sharpeRatio: 1.5, rank: 1 },
                { sectorCode: 'XLF', relativeStrength: 1.02, beta: 1.1, correlation: 0.90, volatility: 0.15, sharpeRatio: 1.2, rank: 2 },
                { sectorCode: 'XLE', relativeStrength: 1.01, beta: 0.8, correlation: 0.60, volatility: 0.25, sharpeRatio: 0.9, rank: 3 },
                { sectorCode: 'XLY', relativeStrength: 0.98, beta: 1.3, correlation: 0.88, volatility: 0.20, sharpeRatio: 0.8, rank: 4 },
                { sectorCode: 'XLI', relativeStrength: 0.97, beta: 1.0, correlation: 0.92, volatility: 0.16, sharpeRatio: 0.7, rank: 5 },
            ];

            const formattedData = mockComparisons.map(comp => ({
                sectorCode: comp.sectorCode,
                benchmarkCode: benchmark as string,
                date: new Date(),
                relativeStrength: comp.relativeStrength,
                beta: comp.beta,
                correlation: comp.correlation,
                volatility: comp.volatility,
                sharpeRatio: comp.sharpeRatio,
                rank: comp.rank,
            }));

            return res.json({
                success: true,
                data: formattedData,
                benchmark: benchmark,
                timestamp: new Date().toISOString(),
                isMock: true
            });
        }

        const formattedData = comparisons.map(comp => ({
            sectorCode: comp.sectorCode,
            benchmarkCode: comp.benchmarkCode,
            date: comp.date,
            relativeStrength: comp.relativeStrength ? parseFloat(comp.relativeStrength.toString()) : null,
            beta: comp.beta ? parseFloat(comp.beta.toString()) : null,
            correlation: comp.correlation ? parseFloat(comp.correlation.toString()) : null,
            volatility: comp.volatility ? parseFloat(comp.volatility.toString()) : null,
            sharpeRatio: comp.sharpeRatio ? parseFloat(comp.sharpeRatio.toString()) : null,
            rank: comp.rank,
        }));

        return res.json({
            success: true,
            data: formattedData,
            benchmark: benchmark,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching comparisons:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve comparison data'
        });
    }
});

/**
 * GET /sectors/comparisons/:code
 * Get comparison history for a specific sector
 */
router.get('/comparisons/:code', async (req: Request, res: Response) => {
    try {
        const { code } = req.params;
        const { days = 30 } = req.query;

        const history = await SectorRepository.getSectorRankingHistory(
            code,
            parseInt(days as string)
        );

        if (!history || history.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No comparison history found for sector ${code}`
            });
        }

        const formattedData = history.map(record => ({
            date: record.date,
            rank: record.rank,
            relativeStrength: record.relativeStrength ? parseFloat(record.relativeStrength.toString()) : null,
            beta: record.beta ? parseFloat(record.beta.toString()) : null,
            volatility: record.volatility ? parseFloat(record.volatility.toString()) : null,
        }));

        return res.json({
            success: true,
            data: {
                sectorCode: code,
                records: formattedData,
                count: formattedData.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching comparison history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve comparison history'
        });
    }
});

/**
 * GET /sectors/summary
 * Get sector performance summary
 */
router.get('/summary/performance', async (req: Request, res: Response) => {
    try {
        const { days = 30 } = req.query;

        const summary = await SectorRepository.getSectorPerformanceSummary(
            parseInt(days as string)
        );

        return res.json({
            success: true,
            data: summary,
            period: `${days} days`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching summary:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve sector summary'
        });
    }
});

/**
 * POST /sectors/collect
 * Trigger sector data collection
 */
router.post('/collect', async (req: Request, res: Response) => {
    try {
        // Check if collection should run
        if (!SectorCollectionService.shouldCollectData()) {
            return res.json({
                success: false,
                message: 'Data collection skipped (weekend or invalid time)',
                timestamp: new Date().toISOString()
            });
        }

        // Start collection
        const collectionResult = await SectorCollectionService.collectDailySectorData();

        // Save to database
        const performanceData = Array.from(collectionResult.data.values())
            .map(sector => sector.performance);

        const saveResult = await SectorRepository.saveSectorPerformanceBatch(performanceData);

        // Collect and save comparisons
        const comparisonResult = await SectorCollectionService.collectSectorComparisons();
        const comparisonData = Array.from(comparisonResult.comparisons.values());

        const compSaveResult = await SectorRepository.saveSectorComparisonBatch(comparisonData);

        return res.json({
            success: true,
            message: 'Sector data collection completed',
            data: {
                sectorsCollected: collectionResult.sectorsCollected,
                performanceSaved: saveResult.successCount,
                comparisonsSaved: compSaveResult.successCount,
                errors: [...collectionResult.errors, ...comparisonResult.errors]
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error during collection:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to collect sector data',
            error: String(error)
        });
    }
});

/**
 * GET /sectors/stats
 * Get sector data statistics
 */
router.get('/stats/database', async (req: Request, res: Response) => {
    try {
        const stats = await SectorRepository.getSectorDataStats();

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
