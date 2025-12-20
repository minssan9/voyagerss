import cron from 'node-cron';
import { MarketDataService, TICKER_MAP } from './MarketDataService';

export class BatchService {

    // Schedule: Every day at 00:00 UTC (or local server time)
    // Adjust as needed: '0 0 * * *'
    static initScheduler() {
        console.log('[BatchService] Initializing Findash Scheduler...');

        cron.schedule('0 0 * * *', async () => {
            console.log('[BatchService] Starting Daily Market Data Sync...');
            await this.runDailySync();
        });
    }

    static async runDailySync() {
        const assets = Object.keys(TICKER_MAP);

        for (const assetId of assets) {
            console.log(`[BatchService] Syncing ${assetId}...`);
            // 1. Fetch History (Refresh last 30 days to catch corrections)
            const history = await MarketDataService.fetchHistory(assetId, 30);

            // 2. Fetch Snapshot
            const snapshot = await MarketDataService.fetchSnapshot(assetId);

            // TODO: Persist to Database (Prisma)
            // For now, we just log ensuring fetch works
            console.log(`[BatchService] Fetched ${history.length} records for ${assetId}`);
            if (snapshot) {
                console.log(`[BatchService] Snapshot ${assetId}: ${snapshot.price}`);
            }
        }
        console.log('[BatchService] Daily Sync Complete.');
    }
}
