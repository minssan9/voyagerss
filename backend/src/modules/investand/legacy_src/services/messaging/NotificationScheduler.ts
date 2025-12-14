import { logger } from '@/utils/common/logger'
import { MessagingService } from './MessagingService'
import { ChatManager } from './ChatManager'
import { MarketAnalysisService } from '@/services/domain/MarketAnalysisService'
import { formatDate } from '@/utils/common/dateUtils'

/**
 * Notification Scheduler
 * Handles scheduled notifications for Fear & Greed Index updates
 */
export class NotificationScheduler {
  private static instance: NotificationScheduler
  private messagingService: MessagingService
  private chatManager: ChatManager
  private isRunning = false
  private intervals: NodeJS.Timeout[] = []

  private constructor() {
    this.messagingService = MessagingService.getInstance()
    this.chatManager = ChatManager.getInstance()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler()
    }
    return NotificationScheduler.instance
  }

  /**
   * Start the notification scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[NotificationScheduler] Scheduler is already running')
      return
    }

    this.isRunning = true
    logger.info('[NotificationScheduler] Starting notification scheduler')

    // Schedule daily summary at 6:00 PM KST
    this.scheduleDailySummary()
    
    // Schedule weekly analysis on Sundays at 7:00 PM KST
    this.scheduleWeeklyAnalysis()
    
    // Schedule Fear & Greed alerts (every 2 hours during market hours)
    this.scheduleFearGreedAlerts()

    // Schedule DART stock holdings report at 10:00 PM KST
    this.scheduleDartStockHoldingsReport()
  }

  /**
   * Stop the notification scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []
    
    logger.info('[NotificationScheduler] Notification scheduler stopped')
  }

  /**
   * Schedule daily summary notifications
   */
  private scheduleDailySummary(): void {
    const interval = setInterval(async () => {
      try {
        const now = new Date()
        const hour = now.getHours()
        
        // Send at 6:00 PM KST (18:00)
        if (hour === 18) {
          await this.sendDailySummary()
        }
      } catch (error) {
        logger.error('[NotificationScheduler] Error in daily summary scheduler:', error)
      }
    }, 60 * 60 * 1000) // Check every hour

    this.intervals.push(interval)
  }

  /**
   * Schedule weekly analysis notifications
   */
  private scheduleWeeklyAnalysis(): void {
    const interval = setInterval(async () => {
      try {
        const now = new Date()
        const day = now.getDay() // 0 = Sunday
        const hour = now.getHours()
        
        // Send on Sundays at 7:00 PM KST (19:00)
        if (day === 0 && hour === 19) {
          await this.sendWeeklyAnalysis()
        }
      } catch (error) {
        logger.error('[NotificationScheduler] Error in weekly analysis scheduler:', error)
      }
    }, 60 * 60 * 1000) // Check every hour

    this.intervals.push(interval)
  }

  /**
   * Schedule Fear & Greed alerts
   */
  private scheduleFearGreedAlerts(): void {
    const interval = setInterval(async () => {
      try {
        const now = new Date()
        const hour = now.getHours()
        
        // Send alerts during market hours (9 AM - 6 PM KST)
        if (hour >= 9 && hour <= 18) {
          await this.checkAndSendFearGreedAlerts()
        }
      } catch (error) {
        logger.error('[NotificationScheduler] Error in Fear & Greed alerts scheduler:', error)
      }
    }, 2 * 60 * 60 * 1000) // Check every 2 hours

    this.intervals.push(interval)
  }

  /**
   * Send daily summary to all subscribers
   */
  private async sendDailySummary(): Promise<void> {
    try {
      const subscribers = this.chatManager.getAllChats()

      if (subscribers.length === 0) {
        logger.info('[NotificationScheduler] No subscribers found')
        return
      }

      await this.messagingService.sendDailySummary(subscribers)
      logger.info(`[NotificationScheduler] Daily summary sent to ${subscribers.length} subscribers`)
    } catch (error) {
      logger.error('[NotificationScheduler] Error sending daily summary:', error)
    }
  }

  /**
   * Send weekly analysis to all subscribers
   */
  private async sendWeeklyAnalysis(): Promise<void> {
    try {
      const subscribers = this.chatManager.getAllChats()

      if (subscribers.length === 0) {
        logger.info('[NotificationScheduler] No subscribers found')
        return
      }

      // Get weekly market analysis
      const endDate = formatDate(new Date())
      const startDate = formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

      const analysis = await MarketAnalysisService.getPeriodMarketAnalysis(startDate, endDate)

      await this.messagingService.sendMarketAnalysis(subscribers, analysis)
      logger.info(`[NotificationScheduler] Weekly analysis sent to ${subscribers.length} subscribers`)
    } catch (error) {
      logger.error('[NotificationScheduler] Error sending weekly analysis:', error)
    }
  }

  /**
   * Check and send Fear & Greed alerts
   */
  private async checkAndSendFearGreedAlerts(): Promise<void> {
    try {
      const alertSubscribers = this.chatManager.getAllChats()

      if (alertSubscribers.length === 0) {
        return
      }

      const today = formatDate(new Date())
      // Get Fear & Greed result from calculator
      const { FearGreedCalculator } = await import('@/services/core/fearGreedCalculator')
      const fearGreedResult = await FearGreedCalculator.calculateIndex(today)

      // Send alert if extreme fear or extreme greed
      const fearGreedValue = fearGreedResult.value || 50
      if (fearGreedValue <= 20 || fearGreedValue >= 80) {
        await this.messagingService.sendFearGreedUpdate(alertSubscribers)
        logger.info(`[NotificationScheduler] Fear & Greed alert sent (value: ${fearGreedValue})`)
      }
    } catch (error) {
      logger.error('[NotificationScheduler] Error checking Fear & Greed alerts:', error)
    }
  }

  /**
   * Send immediate Fear & Greed update
   * @param chatIds - Array of chat IDs to send to
   */
  async sendImmediateUpdate(chatIds: number[]): Promise<void> {
    try {
      await this.messagingService.sendFearGreedUpdate(chatIds)
      logger.info(`[NotificationScheduler] Immediate update sent to ${chatIds.length} subscribers`)
    } catch (error) {
      logger.error('[NotificationScheduler] Error sending immediate update:', error)
    }
  }

  /**
   * Send market analysis to specific subscribers
   * @param chatIds - Array of chat IDs to send to
   */
  async sendMarketAnalysis(chatIds: number[]): Promise<void> {
    try {
      const analysis = await MarketAnalysisService.getCurrentMarketAnalysis()
      await this.messagingService.sendMarketAnalysis(chatIds, analysis)
      logger.info(`[NotificationScheduler] Market analysis sent to ${chatIds.length} subscribers`)
    } catch (error) {
      logger.error('[NotificationScheduler] Error sending market analysis:', error)
    }
  }

  /**
   * Schedule DART stock holdings report
   */
  private scheduleDartStockHoldingsReport(): void {
    const interval = setInterval(async () => {
      try {
        const now = new Date()
        const hour = now.getHours()

        // Send at 10:00 PM KST (22:00)
        if (hour === 22) {
          await this.sendDartStockHoldingsReport()
        }
      } catch (error) {
        logger.error('[NotificationScheduler] Error in DART stock holdings report scheduler:', error)
      }
    }, 60 * 60 * 1000) // Check every hour

    this.intervals.push(interval)
  }

  /**
   * Send DART stock holdings report to all subscribers
   */
  private async sendDartStockHoldingsReport(): Promise<void> {
    try {
      const subscribers = this.chatManager.getAllChats()

      if (subscribers.length === 0) {
        logger.warn('[NotificationScheduler] No subscribers found for DART report.')
        return
      }

      // Get today's date in YYYY-MM-DD format
      const today = formatDate(new Date())

      // Fetch DART stock holdings data
      const { DartDisclosureRepository } = await import('@/repositories/dart/DartDisclosureRepository')
      const holdings = await DartDisclosureRepository.getMarketBuyIncreaseHoldings(today)

      await this.messagingService.sendDartStockHoldingsReport(subscribers, holdings)
      logger.info(`[NotificationScheduler] DART stock holdings report sent to ${subscribers.length} subscribers (${holdings.length} holdings)`)
    } catch (error) {
      logger.error('[NotificationScheduler] Error sending DART stock holdings report:', error)
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean
    activeIntervals: number
  } {
    return {
      isRunning: this.isRunning,
      activeIntervals: this.intervals.length
    }
  }
}
