import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client-findash'; // Client needs to be generated
import { MarketDataService } from './services/MarketDataService';

// Mock Client until generation
// const prisma = new PrismaClient();

export class FindashController {

    static async getMarketHistory(req: Request, res: Response) {
        try {
            const { assetId } = req.params;
            const { days } = req.query;

            // TODO: Replace with DB call
            // const history = await prisma.marketHistory.findMany({ ... });

            // Fallback to Live Fetch for now
            const history = await MarketDataService.fetchHistory(assetId, Number(days) || 365);

            res.json({
                success: true,
                data: history
            });
        } catch (error) {
            console.error('Error getting market history:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
}
