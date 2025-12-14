import express from 'express'
import { MessagingService } from '@/services/messaging/MessagingService'
import { NotificationScheduler } from '@/services/messaging/NotificationScheduler'
import { ChatManager } from '@/services/messaging/ChatManager'
import { logger } from '@/utils/common/logger'

const router = express.Router()

// ================================
// MESSAGING ENDPOINTS
// ================================

/**
 * POST /api/messaging/send
 * Send message to specific chat
 */
router.post('/send', async (req, res) => {
  try {
    const { chatId, message, options = {} } = req.body

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        error: 'chatId and message are required'
      })
    }

    const messagingService = MessagingService.getInstance()
    const result = await messagingService.sendMessage(chatId, message, options)

    return res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending message:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send message'
    })
  }
})

/**
 * POST /api/messaging/send-photo
 * Send photo to specific chat
 */
router.post('/send-photo', async (req, res) => {
  try {
    const { chatId, photoPath, caption = '' } = req.body

    if (!chatId || !photoPath) {
      return res.status(400).json({
        success: false,
        error: 'chatId and photoPath are required'
      })
    }

    const messagingService = MessagingService.getInstance()
    const result = await messagingService.sendPhoto(chatId, photoPath, caption)

    return res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending photo:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send photo'
    })
  }
})

/**
 * POST /api/messaging/send-fear-greed
 * Send Fear & Greed Index update to subscribers
 */
router.post('/send-fear-greed', async (req, res) => {
  try {
    const { chatIds, customMessage } = req.body

    if (!chatIds || !Array.isArray(chatIds)) {
      return res.status(400).json({
        success: false,
        error: 'chatIds array is required'
      })
    }

    const messagingService = MessagingService.getInstance()
    await messagingService.sendFearGreedUpdate(chatIds, customMessage)

    return res.json({
      success: true,
      message: `Fear & Greed update sent to ${chatIds.length} subscribers`
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending Fear & Greed update:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send Fear & Greed update'
    })
  }
})

/**
 * POST /api/messaging/send-daily-summary
 * Send daily market summary
 */
router.post('/send-daily-summary', async (req, res) => {
  try {
    const { chatIds } = req.body

    if (!chatIds || !Array.isArray(chatIds)) {
      return res.status(400).json({
        success: false,
        error: 'chatIds array is required'
      })
    }

    const messagingService = MessagingService.getInstance()
    await messagingService.sendDailySummary(chatIds)

    return res.json({
      success: true,
      message: `Daily summary sent to ${chatIds.length} subscribers`
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending daily summary:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send daily summary'
    })
  }
})

// ================================
// SUBSCRIPTION ENDPOINTS
// ================================

/**
 * POST /api/messaging/subscribe
 * Subscribe user to notifications
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { chatId } = req.body

    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'chatId is required'
      })
    }

    const chatManager = ChatManager.getInstance()
    chatManager.addChat(chatId)

    return res.json({
      success: true,
      message: `Chat ID ${chatId} subscribed successfully`,
      totalSubscribers: chatManager.getChatCount()
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error handling subscription request:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to process subscription request'
    })
  }
})

/**
 * POST /api/messaging/unsubscribe
 * Unsubscribe user from notifications
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { chatId } = req.body

    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'chatId is required'
      })
    }

    const chatManager = ChatManager.getInstance()
    chatManager.removeChat(chatId)

    return res.json({
      success: true,
      message: `Chat ID ${chatId} unsubscribed successfully`,
      totalSubscribers: chatManager.getChatCount()
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error handling unsubscribe request:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to process unsubscribe request'
    })
  }
})

/**
 * GET /api/messaging/subscribers
 * Get all subscribers
 */
router.get('/subscribers', async (req, res) => {
  try {
    const chatManager = ChatManager.getInstance()
    const subscribers = chatManager.getAllChats()

    return res.json({
      success: true,
      subscribers,
      count: subscribers.length,
      source: 'ChatManager storage'
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error getting subscribers:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get subscribers'
    })
  }
})

/**
 * POST /api/messaging/sync-subscribers
 * Sync chat IDs from Telegram API
 */
router.post('/sync-subscribers', async (req, res) => {
  try {
    const messagingService = MessagingService.getInstance()
    const chatManager = ChatManager.getInstance()

    // Get bot instance from messaging service
    const bot = (messagingService as any).bot

    if (!bot) {
      return res.status(400).json({
        success: false,
        error: 'Bot not initialized. Please initialize the bot first.'
      })
    }

    await chatManager.syncFromTelegramAPI(bot)
    const subscribers = chatManager.getAllChats()

    return res.json({
      success: true,
      message: 'Successfully synced chat IDs from Telegram API',
      subscribers,
      count: subscribers.length
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error syncing subscribers:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to sync subscribers from Telegram API'
    })
  }
})

// ================================
// NOTIFICATION SCHEDULER ENDPOINTS
// ================================

/**
 * POST /api/messaging/scheduler/start
 * Start notification scheduler
 */
router.post('/scheduler/start', async (req, res) => {
  try {
    const scheduler = NotificationScheduler.getInstance()
    scheduler.start()

    return res.json({
      success: true,
      message: 'Notification scheduler started'
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error starting scheduler:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to start scheduler'
    })
  }
})

/**
 * POST /api/messaging/scheduler/stop
 * Stop notification scheduler
 */
router.post('/scheduler/stop', async (req, res) => {
  try {
    const scheduler = NotificationScheduler.getInstance()
    scheduler.stop()

    return res.json({
      success: true,
      message: 'Notification scheduler stopped'
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error stopping scheduler:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler'
    })
  }
})

/**
 * GET /api/messaging/scheduler/status
 * Get scheduler status
 */
router.get('/scheduler/status', async (req, res) => {
  try {
    const scheduler = NotificationScheduler.getInstance()
    const status = scheduler.getStatus()

    return res.json({
      success: true,
      status
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error getting scheduler status:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status'
    })
  }
})

/**
 * POST /api/messaging/scheduler/send-immediate
 * Send immediate update to subscribers
 */
router.post('/scheduler/send-immediate', async (req, res) => {
  try {
    const { chatIds } = req.body

    if (!chatIds || !Array.isArray(chatIds)) {
      return res.status(400).json({
        success: false,
        error: 'chatIds array is required'
      })
    }

    const scheduler = NotificationScheduler.getInstance()
    await scheduler.sendImmediateUpdate(chatIds)

    return res.json({
      success: true,
      message: `Immediate update sent to ${chatIds.length} subscribers`
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending immediate update:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send immediate update'
    })
  }
})

/**
 * POST /api/messaging/scheduler/send-analysis
 * Send market analysis to subscribers
 */
router.post('/scheduler/send-analysis', async (req, res) => {
  try {
    const { chatIds } = req.body

    if (!chatIds || !Array.isArray(chatIds)) {
      return res.status(400).json({
        success: false,
        error: 'chatIds array is required'
      })
    }

    const scheduler = NotificationScheduler.getInstance()
    await scheduler.sendMarketAnalysis(chatIds)

    return res.json({
      success: true,
      message: `Market analysis sent to ${chatIds.length} subscribers`
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending market analysis:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send market analysis'
    })
  }
})

/**
 * POST /api/messaging/send-dart-report
 * Manually send DART stock holdings report to all subscribers
 */
router.post('/send-dart-report', async (req, res) => {
  try {
    const messagingService = MessagingService.getInstance()
    const chatManager = ChatManager.getInstance()
    const subscribers = chatManager.getAllChats()

    if (subscribers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No subscribers found'
      })
    }

    // Get today's date in YYYY-MM-DD format
    const today: string = new Date().toISOString().split('T')[0]!

    // Fetch DART stock holdings data
    const { DartDisclosureRepository } = await import('@/repositories/dart/DartDisclosureRepository')
    const holdings = await DartDisclosureRepository.getMarketBuyIncreaseHoldings(today)

    await messagingService.sendDartStockHoldingsReport(subscribers, holdings)

    return res.json({
      success: true,
      message: `DART report sent to ${subscribers.length} subscribers (${holdings.length} holdings)`,
      holdingsCount: holdings.length,
      subscriberCount: subscribers.length
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error sending DART report:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send DART report'
    })
  }
})

// ================================
// BOT MANAGEMENT ENDPOINTS
// ================================

/**
 * GET /api/messaging/bot/info
 * Get bot information
 */
router.get('/bot/info', async (req, res) => {
  try {
    const messagingService = MessagingService.getInstance()
    const result = await messagingService.getBotInfo()

    return res.json({
      success: result.success,
      botInfo: result.botInfo,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error getting bot info:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get bot info'
    })
  }
})

/**
 * POST /api/messaging/bot/webhook
 * Set webhook for the bot
 */
router.post('/bot/webhook', async (req, res) => {
  try {
    const { webhookUrl } = req.body

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'webhookUrl is required'
      })
    }

    const messagingService = MessagingService.getInstance()
    const result = await messagingService.setWebhook(webhookUrl)

    return res.json({
      success: result.success,
      result: result.result,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error setting webhook:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to set webhook'
    })
  }
})

/**
 * DELETE /api/messaging/bot/webhook
 * Delete webhook
 */
router.delete('/bot/webhook', async (req, res) => {
  try {
    const messagingService = MessagingService.getInstance()
    const result = await messagingService.deleteWebhook()

    return res.json({
      success: result.success,
      result: result.result,
      error: result.error
    })
  } catch (error) {
    logger.error('[MessagingAPI] Error deleting webhook:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete webhook'
    })
  }
})

export default router
