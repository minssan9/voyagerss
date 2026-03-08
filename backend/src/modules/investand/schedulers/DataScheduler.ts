import { logger } from '@investand/utils/common/logger';
import { DartCollectionService } from '@investand/collectors/dartCollectionService';
import { KrxCollectionService } from '@investand/collectors/krxCollectionService';
import { SectorCollectionService } from '@investand/collectors/sectorCollectionService';
import { GlobalAssetCollectionService } from '@investand/collectors/globalAssetCollectionService';
import { BOKCollector } from '@investand/collectors/financial/bokCollector';
import { MarketDataRepository } from '@investand/repositories/market/MarketDataRepository';
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

        // Schedule daily DART collection at 19:30 KST
        this.scheduleDailyDartCollection();

        // Schedule daily KRX collection at 17:00 KST (Market closes at 15:30)
        this.scheduleDailyKrxCollection();

        // Schedule daily Sector & Global Asset collection at 23:00 KST
        this.scheduleDailyYahooCollection();

        // Schedule daily BOK collection at 09:30 KST
        this.scheduleDailyBokCollection();
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

    /**
     * Schedule daily KRX collection
     */
    private scheduleDailyKrxCollection(): void {
        const interval = setInterval(async () => {
            try {
                const now = new Date();
                if (now.getHours() === 17 && now.getMinutes() === 0) {
                    await this.runKrxCollection();
                }
            } catch (error) {
                logger.error('[DataScheduler] Error in daily KRX collection scheduler:', error);
            }
        }, 60 * 1000);
        this.intervals.push(interval);
    }

    private async runKrxCollection(): Promise<void> {
        const targetDate = formatDate(new Date());
        if (!KrxCollectionService.getLastBusinessDay(1).includes(targetDate)) {
            // Check if today is a business day
            const isBusiness = (new Date()).getDay() !== 0 && (new Date()).getDay() !== 6;
            if (!isBusiness) return;
        }

        logger.info(`[DataScheduler] Starting daily KRX collection for ${targetDate}`);
        try {
            await KrxCollectionService.collectDailyMarketData(targetDate, true);
        } catch (error) {
            logger.error(`[DataScheduler] KRX collection failed for ${targetDate}:`, error);
        }
    }

    /**
     * Schedule daily Yahoo Finance (Sector/Global Asset) collection
     */
    private scheduleDailyYahooCollection(): void {
        const interval = setInterval(async () => {
            try {
                const now = new Date();
                if (now.getHours() === 23 && now.getMinutes() === 0) {
                    await this.runYahooCollection();
                }
            } catch (error) {
                logger.error('[DataScheduler] Error in daily Yahoo collection scheduler:', error);
            }
        }, 60 * 1000);
        this.intervals.push(interval);
    }

    private async runYahooCollection(): Promise<void> {
        logger.info('[DataScheduler] Starting daily Yahoo Finance collection');
        try {
            if (SectorCollectionService.shouldCollectData()) {
                await SectorCollectionService.collectDailySectorData();
                await SectorCollectionService.collectSectorComparisons();
            }
            if (GlobalAssetCollectionService.shouldCollectData()) {
                await GlobalAssetCollectionService.collectDailyAssetData();
            }
        } catch (error) {
            logger.error('[DataScheduler] Yahoo collection failed:', error);
        }
    }

    /**
     * Schedule daily BOK collection
     */
    private scheduleDailyBokCollection(): void {
        const interval = setInterval(async () => {
            try {
                const now = new Date();
                if (now.getHours() === 9 && now.getMinutes() === 30) {
                    await this.runBokCollection();
                }
            } catch (error) {
                logger.error('[DataScheduler] Error in daily BOK collection scheduler:', error);
            }
        }, 60 * 1000);
        this.intervals.push(interval);
    }

    private async runBokCollection(): Promise<void> {
        const targetDate = formatDate(new Date());
        logger.info(`[DataScheduler] Starting daily BOK collection for ${targetDate}`);
        try {
            const data = await BOKCollector.collectDailyData(targetDate);
            if (data.interestRates) await MarketDataRepository.saveInterestRateData(data.interestRates);
            if (data.exchangeRates) await MarketDataRepository.saveExchangeRateData(data.exchangeRates);
            if (data.economicIndicators) await MarketDataRepository.saveEconomicIndicatorData(data.economicIndicators);

            const vkospi = await BOKCollector.fetchVKOSPIData(targetDate);
            if (vkospi !== null) await MarketDataRepository.saveVKOSPIData(targetDate, vkospi);

            const yields = await BOKCollector.fetchBondYieldCurve(targetDate);
            await MarketDataRepository.saveBondYieldCurveData(targetDate, {
                y1y: yields.yield1Y || undefined,
                y3y: yields.yield3Y || undefined,
                y5y: yields.yield5Y || undefined,
                y10y: yields.yield10Y || undefined,
                y20y: yields.yield20Y || undefined
            });
        } catch (error) {
            logger.error(`[DataScheduler] BOK collection failed for ${targetDate}:`, error);
        }
    }
}
