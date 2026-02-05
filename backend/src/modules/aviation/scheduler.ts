// @ts-ignore
import cron from 'node-cron';
// @ts-ignore
import AviationAbbreviationService from './features/aviation-abbreviation/architecture/services/AviationAbbreviationService.js';

/**
 * Aviation Bot Scheduler
 * Handles all scheduled tasks for the aviation bot system
 */
export default class AviationBotScheduler {
    private scheduleRepository: any;
    private telegramBotService: any;
    private weatherService: any;
    private userService: any;
    private abbreviationService: AviationAbbreviationService;
    private jobs: any[];
    private weatherGatheringEnabled: boolean;

    constructor(scheduleRepository: any, telegramBotService: any, weatherService: any, userService?: any) {
        this.scheduleRepository = scheduleRepository;
        this.telegramBotService = telegramBotService;
        this.weatherService = weatherService;
        this.userService = userService;
        this.abbreviationService = new AviationAbbreviationService();
        this.jobs = [];
        this.weatherGatheringEnabled = true; // Default to enabled
    }

    /**
     * Start all scheduled jobs
     */
    start() {
        console.log('📅 Starting aviation bot scheduler...');

        // Start aviation knowledge notifications
        this._startAviationKnowledgeJobs();

        // Start weather collection jobs
        this._startWeatherJobs();

        // Start aviation abbreviation notification jobs (every 6 hours)
        this._startAbbreviationJobs();

        console.log('✅ Aviation bot scheduler started successfully');
    }

    /**
     * Stop all scheduled jobs
     */
    stop() {
        console.log('⏹️ Stopping aviation bot scheduler...');

        this.jobs.forEach(job => {
            job.destroy();
        });

        this.jobs = [];
        console.log('✅ Aviation bot scheduler stopped successfully');
    }

    /**
     * Start aviation knowledge notification jobs
     * @private
     */
    private _startAviationKnowledgeJobs() {
        // Morning notification (9:00 AM KST)
        const morningJob = cron.schedule('0 9 * * *', async () => {
            console.log('🌅 [SCHEDULED] Morning aviation knowledge notification triggered at:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
            await this._sendAviationKnowledgeNotification('morning');
        }, {
            timezone: 'Asia/Seoul'
        });

        // Afternoon notification (2:00 PM KST)
        const afternoonJob = cron.schedule('0 14 * * *', async () => {
            console.log('☀️ [SCHEDULED] Afternoon aviation knowledge notification triggered at:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
            await this._sendAviationKnowledgeNotification('afternoon');
        }, {
            timezone: 'Asia/Seoul'
        });

        // Evening notification (8:00 PM KST)
        const eveningJob = cron.schedule('0 20 * * *', async () => {
            console.log('🌙 [SCHEDULED] Evening aviation knowledge notification triggered at:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
            await this._sendAviationKnowledgeNotification('evening');
        }, {
            timezone: 'Asia/Seoul'
        });

        this.jobs.push(morningJob, afternoonJob, eveningJob);

        console.log('✅ Aviation knowledge jobs scheduled:');
        console.log('   - Morning: 9:00 AM KST');
        console.log('   - Afternoon: 2:00 PM KST');
        console.log('   - Evening: 8:00 PM KST');
    }

    /**
     * Start weather collection jobs
     * @private
     */
    private _startWeatherJobs() {
        // Weather image collection (every 10 minutes) - GK2A KO is ~10min cadence
        const weatherJob = cron.schedule('*/10 * * * *', async () => {
            console.log('🛰️ [SCHEDULED] Weather image sync triggered at:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
            await this._collectWeatherImages();
        }, {
            timezone: 'Asia/Seoul'
        });

        // Weather cleanup (daily at 3:00 AM KST)
        const cleanupJob = cron.schedule('0 3 * * *', async () => {
            console.log('🧹 [SCHEDULED] Weather cleanup triggered at:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
            await this._cleanupWeatherImages();
        }, {
            timezone: 'Asia/Seoul'
        });

        this.jobs.push(weatherJob, cleanupJob);

        console.log('✅ Weather jobs scheduled:');
        console.log('   - Collection: Every 30 minutes');
        console.log('   - Cleanup: Daily at 3:00 AM KST');
    }

    /**
     * Start aviation abbreviation notification jobs (every 6 hours)
     * @private
     */
    private _startAbbreviationJobs() {
        // Abbreviation notification every 6 hours (0:00, 6:00, 12:00, 18:00 KST)
        const abbreviationJob = cron.schedule('0 0,6,12,18 * * *', async () => {
            const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
            console.log(`✈️ [SCHEDULED] Aviation abbreviation notification triggered at: ${currentTime}`);
            await this._sendAbbreviationNotification();
        }, {
            timezone: 'Asia/Seoul'
        });

        this.jobs.push(abbreviationJob);

        console.log('✅ Aviation abbreviation jobs scheduled:');
        console.log('   - Notifications: Every 6 hours (0:00, 6:00, 12:00, 18:00 KST)');
    }

    /**
     * Send aviation abbreviation notification to all subscribers
     * @private
     */
    private async _sendAbbreviationNotification() {
        try {
            if (!this.telegramBotService || !this.userService) {
                console.warn('⚠️ TelegramBotService or UserService not available for abbreviation notification');
                return;
            }

            // Get 10 random abbreviations
            const abbreviations = this.abbreviationService.getRandomAbbreviations(10);

            // Format the message
            const message = this.abbreviationService.formatForTelegram(abbreviations);

            // Get all subscribed users
            const subscribedUsers = await this.userService.getUsersBySubscriptionStatus(true);

            if (!subscribedUsers || subscribedUsers.length === 0) {
                console.log('📭 No subscribed users to send abbreviation notification');
                return;
            }

            console.log(`📤 Sending abbreviation notification to ${subscribedUsers.length} subscribers...`);

            let successCount = 0;
            let failCount = 0;

            // Send message to each subscriber
            for (const user of subscribedUsers) {
                try {
                    const chatId = user.chatId || user.chat_id;
                    if (!chatId) {
                        console.warn(`⚠️ User ${user.id} has no chatId`);
                        failCount++;
                        continue;
                    }

                    await this.telegramBotService.sendMessage(chatId, message, {
                        parse_mode: 'Markdown'
                    });
                    successCount++;

                    // Add small delay to avoid rate limiting
                    await this._delay(100);
                } catch (error: any) {
                    console.error(`❌ Failed to send to user ${user.id}:`, error.message);
                    failCount++;
                }
            }

            console.log(`✅ Abbreviation notification completed: ${successCount} sent, ${failCount} failed`);
        } catch (error) {
            console.error('❌ Error sending abbreviation notification:', error);
        }
    }

    /**
     * Delay helper function
     * @param {number} ms - Milliseconds to delay
     * @private
     */
    private _delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Manual abbreviation notification (for testing)
     * @returns {Promise<Object>} Send result
     */
    async manualAbbreviationNotification() {
        try {
            console.log('✈️ Manual abbreviation notification started...');
            await this._sendAbbreviationNotification();
            return {
                success: true,
                message: 'Abbreviation notification sent successfully'
            };
        } catch (error: any) {
            console.error('❌ Manual abbreviation notification failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send aviation knowledge notification
     * @param {string} timeSlot - Time slot (morning, afternoon, evening)
     * @private
     */
    private async _sendAviationKnowledgeNotification(timeSlot: string) {
        try {
            // This would integrate with the message generator
            console.log(`📚 Sending ${timeSlot} aviation knowledge notification`);
            // Implementation would depend on the message generator integration
        } catch (error) {
            console.error(`Error sending ${timeSlot} notification:`, error);
        }
    }

    /**
     * Collect weather images
     * @private
     */
    private async _collectWeatherImages() {
        if (!this.weatherGatheringEnabled) {
            console.log('⏸️  Weather image gathering is disabled, skipping collection');
            return;
        }

        try {
            if (this.weatherService) {
                // First, try syncing missing images from the list API (recent 24 timestamps)
                try {
                    const sync = await this.weatherService.syncImagesFromList(24);
                    console.log(`✅ Weather sync: processed=${sync.processed}, downloaded=${sync.downloaded}, skipped=${sync.skipped}, errors=${sync.errors}`);
                } catch (e: any) {
                    console.warn('⚠️ Weather sync via list API failed, fallback to single download:', e.message);
                    const result = await this.weatherService.downloadWeatherImage();
                    if (result.success) {
                        console.log('✅ Weather image collected (fallback) successfully');
                    } else {
                        console.error('❌ Failed to collect weather image (fallback):', result.error);
                    }
                }
            }
        } catch (error) {
            console.error('Error collecting weather images:', error);
        }
    }

    /**
     * Cleanup old weather images
     * @private
     */
    private async _cleanupWeatherImages() {
        try {
            if (this.weatherService) {
                const result = await this.weatherService.cleanupOldImages(7); // Keep 7 days
                if (result.success) {
                    console.log(`✅ Cleaned up ${result.deletedCount} old weather images`);
                } else {
                    console.error('❌ Failed to cleanup weather images:', result.error);
                }
            }
        } catch (error) {
            console.error('Error cleaning up weather images:', error);
        }
    }

    /**
     * Manual weather image collection (compatibility method)
     * @returns {Promise<Object>} Collection result
     */
    async manualWeatherImageCollection() {
        try {
            console.log('🛰️ Manual weather image collection started...');

            if (!this.weatherService) {
                return {
                    success: false,
                    error: 'Weather service not available'
                };
            }

            const result = await this.weatherService.downloadWeatherImage();

            if (result.success) {
                console.log('✅ Manual weather image collection completed');
                return {
                    success: true,
                    message: 'Weather image collected successfully',
                    filePath: result.filePath
                };
            } else {
                console.error('❌ Manual weather image collection failed:', result.error);
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error: any) {
            console.error('Error in manual weather image collection:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get stored weather images (compatibility method)
     * @param {number} limit - Maximum number of images to return
     * @returns {Promise<Array>} Array of weather images
     */
    async getStoredWeatherImages(limit = 10) {
        try {
            if (!this.weatherService) {
                return [];
            }

            const images = await this.weatherService.getWeatherImagesByDateRange(
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                new Date()
            );

            return images.slice(0, limit);
        } catch (error) {
            console.error('Error getting stored weather images:', error);
            return [];
        }
    }

    /**
     * Get job status (compatibility method)
     * @returns {Object} Job status information
     */
    getJobStatus() {
        return {
            totalJobs: this.jobs.length,
            activeJobs: this.jobs.filter(job => job.running).length,
            jobs: this.jobs.map((job, index) => ({
                id: index,
                running: job.running,
                nextRun: job.nextDate ? job.nextDate().toISOString() : null
            }))
        };
    }

    /**
     * Get weather service status (compatibility method)
     * @returns {Promise<Object>} Weather service status
     */
    async getWeatherServiceStatus() {
        try {
            if (!this.weatherService) {
                return {
                    status: 'unavailable',
                    message: 'Weather service not initialized'
                };
            }

            const stats = await this.weatherService.getWeatherStats();
            return {
                status: 'available',
                stats: stats
            };
        } catch (error: any) {
            console.error('Error getting weather service status:', error);
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * Get weather gathering enabled status
     * @returns {boolean} Whether weather gathering is enabled
     */
    getWeatherGatheringEnabled() {
        return this.weatherGatheringEnabled;
    }

    /**
     * Set weather gathering enabled status
     * @param {boolean} enabled - Whether to enable weather gathering
     */
    setWeatherGatheringEnabled(enabled: boolean) {
        this.weatherGatheringEnabled = enabled;
        console.log(`🔄 Weather gathering ${enabled ? 'enabled' : 'disabled'}`);
    }
}
