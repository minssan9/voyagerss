import { Router, Request, Response } from 'express';
import { GlobalAssetRepository } from '@investand/repositories/market/GlobalAssetRepository';

const router = Router();

/**
 * GET /findash/market/history/:symbol
 * Get asset history for FinDash charts
 */
router.get('/market/history/:symbol', async (req: Request, res: Response) => {
    try {
        const { symbol } = req.params;
        const { days = 365 } = req.query;

        // Map simplified symbols to actual asset codes if needed
        const symbolMap: Record<string, string> = {
            'gold': 'GC=F',
            'usdkrw': 'KRW=X',
            'snp500': '^GSPC',
            'nasdaq': '^IXIC',
            'bitcoin': 'BTC-USD',
        };

        const assetCode = symbolMap[symbol.toLowerCase()] || symbol;

        const assetData = await GlobalAssetRepository.getAssetPerformance(
            assetCode,
            undefined,
            undefined,
            parseInt(days as string)
        );

        if (!assetData || assetData.length === 0) {
            // Return mock data for development if no DB data exists
            // This prevents 404s during initial setup
            console.log(`No data found for ${assetCode}, generating mock data...`);
            const mockData = Array.from({ length: parseInt(days as string) }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                return {
                    date: date.toISOString().split('T')[0],
                    closePrice: 100 + Math.random() * 20,
                    change: Math.random() * 2 - 1,
                    changePercent: Math.random() * 2 - 1,
                    volume: Math.floor(Math.random() * 1000000)
                };
            });

            return res.json({
                success: true,
                data: mockData.reverse(),
                count: mockData.length,
                isMock: true
            });
        }

        const formattedData = assetData.map(record => ({
            date: record.date.toISOString().split('T')[0], // Ensure YYYY-MM-DD
            closePrice: parseFloat(record.closePrice.toString()),
            change: record.change ? parseFloat(record.change.toString()) : 0,
            changePercent: record.changePercent ? parseFloat(record.changePercent.toString()) : 0,
            volume: record.volume ? Number(record.volume) : 0
        })).reverse(); // Sort by date ascending for charts

        return res.json({
            success: true,
            data: formattedData,
            count: formattedData.length
        });

    } catch (error) {
        console.error('Error fetching findash asset history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve asset history'
        });
    }
});

export default router;
