import { logger } from '@investand/utils/common/logger';
import { DartCollectionService } from '@investand/collectors/dartCollectionService';
import { formatDate } from '@investand/utils/common/dateUtils';

/**
 * Data Scheduler
 * Handles scheduled data collection jobs
 */
export class DataScheduler {
    private static instance: DataScheduler;
    private isRunning = false;
    private intervals: NodeJS.Timeout[] = [];

    private constructor() { }

    /**
     * Get singleton instance
     */
    static getInstance(): DataScheduler {
        if (!DataScheduler.instance) {
            DataScheduler.instance = new DataScheduler();
        }
        return DataScheduler.instance;
    }

    /**
     * Start the data scheduler
     */
    start(): void {
        if (this.isRunning) {
            logger.warn('[DataScheduler] Scheduler is already running');
            return;
        }

        this.isRunning = true;
        logger.info('[DataScheduler] Starting data scheduler');

        // Schedule daily DART collection at 19:30 KST (After market close and DART updates)
        this.scheduleDailyDartCollection();
    }

    /**
     * Stop the data scheduler
     */
    stop(): void {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];

        logger.info('[DataScheduler] Data scheduler stopped');
    }

    /**
     * Schedule daily DART collection
     */
    private scheduleDailyDartCollection(): void {
        const interval = setInterval(async () => {
            try {
                const now = new Date();
                const hour = now.getHours();
                const minute = now.getMinutes();

                // Run at 19:30
                if (hour === 19 && minute === 30) {
                    await this.runDartCollection();
                }
            } catch (error) {
                logger.error('[DataScheduler] Error in daily DART collection scheduler:', error);
            }
        }, 60 * 1000); // Check every minute to be precise enough for H:M trigger

        this.intervals.push(interval);
    }

    /**
     * Run DART collection logic
     */
    private async runDartCollection(): Promise<void> {
        const targetDate = formatDate(new Date());
        if (!DartCollectionService.isBusinessDay(targetDate)) {
            logger.info(`[DataScheduler] Skipping DART collection: ${targetDate} is not a business day.`);
            return;
        }

        logger.info(`[DataScheduler] Starting daily DART collection for ${targetDate}`);
        try {
            const result = await DartCollectionService.collectDailyDisclosures(targetDate, true);
            logger.info(`[DataScheduler] DART collection completed. Total: ${result.totalDisclosures}, Stock: ${result.stockDisclosures.length}`);
        } catch (error) {
            logger.error(`[DataScheduler] DART collection failed for ${targetDate}:`, error);
        }
    }
}
