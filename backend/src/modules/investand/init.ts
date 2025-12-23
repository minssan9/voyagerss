import { NotificationScheduler } from './services/messaging/NotificationScheduler';
import { DataScheduler } from './schedulers/DataScheduler';
import { logger } from '@investand/utils/common/logger';

let initialized = false;

export const initializeInvestand = () => {
    if (initialized) return;

    try {
        logger.info('[Investand] Initializing module...');

        // Start schedulers
        NotificationScheduler.getInstance().start();
        DataScheduler.getInstance().start();

        logger.info('[Investand] Module initialized successfully.');
        initialized = true;
    } catch (error) {
        logger.error('[Investand] Initialization failed:', error);
    }
};
