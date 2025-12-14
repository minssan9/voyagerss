import { logger } from '@/utils/common/logger'
import { DatabaseService } from '@/services/core/databaseService'
import { FearGreedCalculator } from '@/services/core/fearGreedCalculator'
import { formatDate } from '@/utils/common/dateUtils'

/**
 * Messaging Service
 * Handles messaging operations for Fear & Greed Index notifications
 */
export class MessagingService {
  private static instance: MessagingService
  private bot: any = null
  private isInitialized = false

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService()
    }
    return MessagingService.instance
  }

  /**
   * Initialize the messaging service
   * @param bot - Telegram bot instance
   */
  initialize(bot: any): void {
    this.bot = bot
    this.isInitialized = true
    logger.info('[MessagingService] Messaging service initialized')
  }

  /**
   * Send Fear & Greed Index update to subscribers
   * @param chatIds - Array of chat IDs to send to
   * @param customMessage - Optional custom message
   */
  async sendFearGreedUpdate(chatIds: number[], customMessage?: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Messaging service not initialized')
      }

      const today = formatDate(new Date())
      const fearGreedResult = await FearGreedCalculator.calculateIndex(today)
      
      const message = customMessage || this.formatFearGreedMessage(fearGreedResult)

      for (const chatId of chatIds) {
        await this.sendMessage(chatId, message)
      }

      logger.info(`[MessagingService] Fear & Greed update sent to ${chatIds.length} subscribers`)
    } catch (error) {
      logger.error('[MessagingService] Error sending Fear & Greed update:', error)
      throw error
    }
  }

  /**
   * Send market analysis to subscribers
   * @param chatIds - Array of chat IDs to send to
   * @param analysis - Market analysis data
   */
  async sendMarketAnalysis(chatIds: number[], analysis: any): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Messaging service not initialized')
      }

      const message = this.formatMarketAnalysisMessage(analysis)

      for (const chatId of chatIds) {
        await this.sendMessage(chatId, message)
      }

      logger.info(`[MessagingService] Market analysis sent to ${chatIds.length} subscribers`)
    } catch (error) {
      logger.error('[MessagingService] Error sending market analysis:', error)
      throw error
    }
  }

  /**
   * Send daily market summary
   * @param chatIds - Array of chat IDs to send to
   */
  async sendDailySummary(chatIds: number[]): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Messaging service not initialized')
      }

      const today = formatDate(new Date())
      const [fearGreedResult, marketData] = await Promise.all([
        FearGreedCalculator.calculateIndex(today),
        DatabaseService.getLatestKOSPIData()
      ])

      const message = this.formatDailySummaryMessage(fearGreedResult, marketData)

      for (const chatId of chatIds) {
        await this.sendMessage(chatId, message)
      }

      logger.info(`[MessagingService] Daily summary sent to ${chatIds.length} subscribers`)
    } catch (error) {
      logger.error('[MessagingService] Error sending daily summary:', error)
      throw error
    }
  }

  /**
   * Send DART stock holdings report
   * @param chatIds - Array of chat IDs to send to
   * @param holdings - DART stock holdings data
   */
  async sendDartStockHoldingsReport(chatIds: number[], holdings: any[]): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Messaging service not initialized')
      }

      const message = this.formatDartStockHoldingsMessage(holdings)

      for (const chatId of chatIds) {
        await this.sendMessage(chatId, message, { parse_mode: 'Markdown' })
      }

      logger.info(`[MessagingService] DART stock holdings report sent to ${chatIds.length} subscribers`)
    } catch (error) {
      logger.error('[MessagingService] Error sending DART stock holdings report:', error)
      throw error
    }
  }

  /**
   * Send message to a specific chat
   * @param chatId - Chat ID
   * @param message - Message to send
   * @param options - Message options
   */
  async sendMessage(chatId: number, message: string, options: any = {}): Promise<{
    success: boolean
    messageId?: number
    error?: string
  }> {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized')
      }

      const result = await this.bot.sendMessage(chatId, message, options)
      
      // Log the message
      await this.logMessage(chatId, 'sent', {
        messageId: result.message_id,
        text: message,
        timestamp: new Date()
      })

      return {
        success: true,
        messageId: result.message_id
      }
    } catch (error) {
      logger.error('[MessagingService] Error sending message:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Send photo to a specific chat
   * @param chatId - Chat ID
   * @param photoPath - Path to photo
   * @param caption - Photo caption
   */
  async sendPhoto(chatId: number, photoPath: string, caption: string = ''): Promise<{
    success: boolean
    messageId?: number
    error?: string
  }> {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized')
      }

      const result = await this.bot.sendPhoto(chatId, photoPath, { caption })
      
      // Log the message
      await this.logMessage(chatId, 'photo_sent', {
        messageId: result.message_id,
        photoPath: photoPath,
        caption: caption,
        timestamp: new Date()
      })

      return {
        success: true,
        messageId: result.message_id
      }
    } catch (error) {
      logger.error('[MessagingService] Error sending photo:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<{
    success: boolean
    botInfo?: any
    error?: string
  }> {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized')
      }

      const botInfo = await this.bot.getMe()
      return {
        success: true,
        botInfo: botInfo
      }
    } catch (error) {
      logger.error('[MessagingService] Error getting bot info:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Set webhook for the bot
   * @param webhookUrl - Webhook URL
   */
  async setWebhook(webhookUrl: string): Promise<{
    success: boolean
    result?: any
    error?: string
  }> {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized')
      }

      const result = await this.bot.setWebHook(webhookUrl)
      return {
        success: true,
        result: result
      }
    } catch (error) {
      logger.error('[MessagingService] Error setting webhook:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<{
    success: boolean
    result?: any
    error?: string
  }> {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized')
      }

      const result = await this.bot.deleteWebHook()
      return {
        success: true,
        result: result
      }
    } catch (error) {
      logger.error('[MessagingService] Error deleting webhook:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Format Fear & Greed Index message
   */
  private formatFearGreedMessage(result: any): string {
    const { value, level, confidence, components } = result
    const emoji = this.getFearGreedEmoji(value)
    
    return `📊 *KOSPI Fear & Greed Index*

${emoji} *${level}* (${value}/100)
신뢰도: ${confidence}%

📈 *구성 요소:*
• 가격 모멘텀: ${components.priceMomentum}%
• 투자자 심리: ${components.investorSentiment}%
• Put/Call 비율: ${components.putCallRatio}%
• 변동성 지수: ${components.volatilityIndex}%
• 안전자산 수요: ${components.safeHavenDemand}%

⏰ ${formatDate(new Date())}`
  }

  /**
   * Format market analysis message
   */
  private formatMarketAnalysisMessage(analysis: any): string {
    const { fearGreedIndex, marketStatus, recommendation, confidence } = analysis
    
    return `📊 *시장 분석 리포트*

🎯 *현재 상황:* ${marketStatus}
💡 *추천:* ${recommendation}
📊 *Fear & Greed:* ${fearGreedIndex.value}/100 (${fearGreedIndex.level})
🎯 *신뢰도:* ${confidence}%

⏰ ${formatDate(new Date())}`
  }

  /**
   * Format daily summary message
   */
  private formatDailySummaryMessage(fearGreedResult: any, marketData: any): string {
    const { value, level } = fearGreedResult
    const emoji = this.getFearGreedEmoji(value)
    
    let message = `📊 *일일 시장 요약*

${emoji} *Fear & Greed Index:* ${value}/100 (${level})`

    if (marketData) {
      const change = parseFloat(marketData.prdy_vrss || '0')
      const changeRate = parseFloat(marketData.prdy_ctrt || '0')
      const changeEmoji = change >= 0 ? '📈' : '📉'
      
      message += `

📈 *KOSPI:* ${marketData.stck_prpr}원
${changeEmoji} ${change >= 0 ? '+' : ''}${change}원 (${changeRate}%)`
    }

    message += `

⏰ ${formatDate(new Date())}`

    return message
  }

  /**
   * Format DART stock holdings message
   */
  private formatDartStockHoldingsMessage(holdings: any[]): string {
    if (holdings.length === 0) {
      return `📊 *DART 장내매수 지분증가 리포트*

오늘은 장내매수로 인한 지분증가 공시가 없습니다.

⏰ ${formatDate(new Date())}`
    }

    let message = `📊 *DART 장내매수 지분증가 리포트*

총 ${holdings.length}건의 장내매수 지분증가 공시가 있습니다.

`

    // 상위 10개 항목만 표시
    const topHoldings = holdings.slice(0, 10)

    topHoldings.forEach((holding, index) => {
      const changeRatio = parseFloat(holding.changeRatio || '0')
      const holdingRatio = parseFloat(holding.holdingRatio || '0')

      message += `${index + 1}. *${holding.corpName}* (${holding.stockCode || 'N/A'})
   보고자: ${holding.reporterName}
   증감률: +${changeRatio.toFixed(2)}%
   보유비율: ${holdingRatio.toFixed(2)}%

`
    })

    if (holdings.length > 10) {
      message += `... 외 ${holdings.length - 10}건\n\n`
    }

    message += `⏰ ${formatDate(new Date())}`

    return message
  }

  /**
   * Get emoji based on Fear & Greed value
   */
  private getFearGreedEmoji(value: number): string {
    if (value <= 20) return '😱' // Extreme Fear
    if (value <= 40) return '😨' // Fear
    if (value <= 60) return '😐' // Neutral
    if (value <= 80) return '😊' // Greed
    return '🤩' // Extreme Greed
  }

  /**
   * Log message to database
   */
  private async logMessage(chatId: number, type: string, data: any): Promise<void> {
    try {
      // This would integrate with your existing database logging
      logger.info(`[MessagingService] Message logged: ${type} to ${chatId}`)
    } catch (error) {
      logger.error('[MessagingService] Error logging message:', error)
    }
  }
}
