import express from 'express'
import { MessagingController } from '@/services/messaging/MessagingController'
import { logger } from '@/utils/common/logger'

const router = express.Router()

/**
 * POST /api/telegram/webhook
 * Handle incoming webhooks from Telegram
 */
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body
    
    if (!update) {
      return res.status(400).json({
        success: false,
        error: 'No update data received'
      })
    }

    // Log the incoming update
    logger.info(`[TelegramWebhook] Received update: ${JSON.stringify(update)}`)

    // Handle the update through the messaging controller
    const messagingController = MessagingController.getInstance()
    await messagingController.handleWebhook(update)

    return res.json({
      success: true,
      message: 'Webhook processed successfully'
    })
  } catch (error) {
    logger.error('[TelegramWebhook] Error processing webhook:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    })
  }
})

/**
 * GET /api/telegram/webhook
 * Verify webhook endpoint (for Telegram webhook setup)
 */
router.get('/webhook', (req, res) => {
  return res.json({
    success: true,
    message: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
})

/**
 * POST /api/telegram/setup
 * Setup Telegram bot webhook
 */
router.post('/setup', async (req, res) => {
  try {
    const { webhookUrl, botToken } = req.body

    if (!webhookUrl || !botToken) {
      return res.status(400).json({
        success: false,
        error: 'webhookUrl and botToken are required'
      })
    }

    // Initialize Telegram bot
    const TelegramBot = require('node-telegram-bot-api')
    const bot = new TelegramBot(botToken, { polling: false })

    // Initialize messaging system
    const messagingController = MessagingController.getInstance()
    await messagingController.initialize(bot)

    // Set webhook
    const messagingService = messagingController['messagingService']
    const webhookResult = await messagingService.setWebhook(webhookUrl)

    if (webhookResult.success) {
      return res.json({
        success: true,
        message: 'Telegram bot setup completed successfully',
        webhookUrl,
        botInfo: webhookResult.result
      })
    } else {
      return res.status(500).json({
        success: false,
        error: `Failed to set webhook: ${webhookResult.error}`
      })
    }
  } catch (error) {
    logger.error('[TelegramWebhook] Error setting up bot:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to setup Telegram bot'
    })
  }
})

/**
 * DELETE /api/telegram/webhook
 * Remove webhook
 */
router.delete('/webhook', async (req, res) => {
  try {
    const messagingController = MessagingController.getInstance()
    const messagingService = messagingController['messagingService']
    
    const result = await messagingService.deleteWebhook()

    if (result.success) {
      return res.json({
        success: true,
        message: 'Webhook removed successfully'
      })
    } else {
      return res.status(500).json({
        success: false,
        error: `Failed to remove webhook: ${result.error}`
      })
    }
  } catch (error) {
    logger.error('[TelegramWebhook] Error removing webhook:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to remove webhook'
    })
  }
})

/**
 * GET /api/telegram/status
 * Get messaging system status
 */
router.get('/status', async (req, res) => {
  try {
    const messagingController = MessagingController.getInstance()
    const status = messagingController.getStatus()

    return res.json({
      success: true,
      status
    })
  } catch (error) {
    logger.error('[TelegramWebhook] Error getting status:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get status'
    })
  }
})

export default router
