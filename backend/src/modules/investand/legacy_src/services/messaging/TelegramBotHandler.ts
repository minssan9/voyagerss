import { logger } from '@/utils/common/logger'
import { MessagingService } from './MessagingService'
import { NotificationScheduler } from './NotificationScheduler'
import { ChatManager } from './ChatManager'

/**
 * Telegram Bot Handler
 * Handles incoming Telegram messages and commands
 */
export class TelegramBotHandler {
  private messagingService: MessagingService
  private scheduler: NotificationScheduler
  private chatManager: ChatManager

  constructor() {
    this.messagingService = MessagingService.getInstance()
    this.scheduler = NotificationScheduler.getInstance()
    this.chatManager = ChatManager.getInstance()
  }

  /**
   * Handle incoming message
   * @param message - Telegram message object
   */
  async handleMessage(message: any): Promise<void> {
    try {
      const chatId = message.chat.id
      const text = message.text || ''
      const userId = message.from.id

      logger.info(`[TelegramBotHandler] Received message from ${chatId}: ${text}`)

      // Automatically register chat ID when user interacts with bot
      this.chatManager.addChat(chatId)

      // Handle commands
      if (text.startsWith('/')) {
        await this.handleCommand(chatId, userId, text)
      } else {
        // Handle regular messages
        await this.handleRegularMessage(chatId, userId, text)
      }
    } catch (error) {
      logger.error('[TelegramBotHandler] Error handling message:', error)
    }
  }

  /**
   * Handle bot commands
   * @param chatId - Chat ID
   * @param userId - User ID
   * @param command - Command text
   */
  private async handleCommand(chatId: number, userId: number, command: string): Promise<void> {
    const [cmd = '', ...args] = command.split(' ')

    switch (cmd) {
      case '/start':
        await this.handleStartCommand(chatId, userId)
        break
      case '/help':
        await this.handleHelpCommand(chatId)
        break
      case '/subscribe':
        await this.handleSubscribeCommand(chatId, userId, args)
        break
      case '/unsubscribe':
        await this.handleUnsubscribeCommand(chatId)
        break
      case '/status':
        await this.handleStatusCommand(chatId)
        break
      case '/feargreed':
        await this.handleFearGreedCommand(chatId)
        break
      case '/analysis':
        await this.handleAnalysisCommand(chatId)
        break
      case '/summary':
        await this.handleSummaryCommand(chatId)
        break
      default:
        await this.handleUnknownCommand(chatId, cmd)
    }
  }

  /**
   * Handle /start command
   */
  private async handleStartCommand(chatId: number, userId: number): Promise<void> {
    const welcomeMessage = `🤖 *KOSPI Fear & Greed Index Bot에 오신 것을 환영합니다!*

이 봇은 한국 주식시장의 투자자 심리를 실시간으로 분석하여 알려드립니다.

📊 *주요 기능:*
• 실시간 Fear & Greed Index 조회
• 일일 시장 요약
• 주간 시장 분석
• 시장 알림 및 경고

💡 *사용법:*
/help - 도움말 보기
/subscribe daily - 일일 알림 구독
/feargreed - 현재 Fear & Greed Index 조회
/analysis - 시장 분석 보기

지금 바로 /feargreed 명령어로 현재 시장 상황을 확인해보세요!`

    await this.messagingService.sendMessage(chatId, welcomeMessage)
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(chatId: number): Promise<void> {
    const helpMessage = `📚 *KOSPI Fear & Greed Index Bot 도움말*

🔹 *기본 명령어:*
/start - 봇 시작하기
/help - 이 도움말 보기
/status - 구독 상태 확인

🔹 *구독 관리:*
/subscribe daily - 일일 요약 구독
/subscribe weekly - 주간 분석 구독
/subscribe alerts - 시장 알림 구독
/unsubscribe - 모든 구독 해지

🔹 *시장 정보:*
/feargreed - 현재 Fear & Greed Index
/analysis - 실시간 시장 분석
/summary - 일일 시장 요약

💡 *Fear & Greed Index란?*
0-100 점수로 시장의 공포와 탐욕을 측정합니다.
• 0-20: 극도의 공포 (매수 기회)
• 21-40: 공포
• 41-60: 중립
• 61-80: 탐욕
• 81-100: 극도의 탐욕 (매도 고려)

문의사항이 있으시면 언제든지 연락주세요!`

    await this.messagingService.sendMessage(chatId, helpMessage)
  }

  /**
   * Handle /subscribe command
   */
  private async handleSubscribeCommand(chatId: number, userId: number, args: string[]): Promise<void> {
    // Chat ID is already automatically registered when user sends message
    const chatCount = this.chatManager.getChatCount()

    await this.messagingService.sendMessage(
      chatId,
      `✅ 구독이 활성화되었습니다!

📊 정기 알림:
• 일일 요약: 매일 오후 6시
• 주간 분석: 매주 일요일 오후 7시
• Fear & Greed 알림: 극단적 수치 감지시
• DART 공시: 매일 밤 10시

현재 활성 구독자: ${chatCount}명
Chat ID: ${chatId}

모든 알림을 자동으로 받으시게 됩니다.`
    )
  }

  /**
   * Handle /unsubscribe command
   */
  private async handleUnsubscribeCommand(chatId: number): Promise<void> {
    this.chatManager.removeChat(chatId)

    await this.messagingService.sendMessage(
      chatId,
      `✅ 구독이 해지되었습니다.

더 이상 자동 알림을 받지 않습니다.
다시 구독하려면 /subscribe 명령어를 사용해주세요.

Chat ID: ${chatId}`
    )
  }

  /**
   * Handle /status command
   */
  private async handleStatusCommand(chatId: number): Promise<void> {
    const statusMessage = `📋 *구독 상태*

🔹 Chat ID: ${chatId}
🔹 구독 상태: 활성
🔹 알림 타입: 전체 알림

📊 정기 알림 시간:
• 일일 요약: 매일 오후 6시
• 주간 분석: 매주 일요일 오후 7시
• Fear & Greed 알림: 극단적 수치 감지시
• DART 공시: 매일 밤 10시`

    await this.messagingService.sendMessage(chatId, statusMessage)
  }

  /**
   * Handle /feargreed command
   */
  private async handleFearGreedCommand(chatId: number): Promise<void> {
    try {
      await this.messagingService.sendFearGreedUpdate([chatId])
    } catch (error) {
      await this.messagingService.sendMessage(
        chatId,
        '❌ Fear & Greed Index 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      )
    }
  }

  /**
   * Handle /analysis command
   */
  private async handleAnalysisCommand(chatId: number): Promise<void> {
    try {
      await this.scheduler.sendMarketAnalysis([chatId])
    } catch (error) {
      await this.messagingService.sendMessage(
        chatId,
        '❌ 시장 분석 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      )
    }
  }

  /**
   * Handle /summary command
   */
  private async handleSummaryCommand(chatId: number): Promise<void> {
    try {
      await this.messagingService.sendDailySummary([chatId])
    } catch (error) {
      await this.messagingService.sendMessage(
        chatId,
        '❌ 일일 요약 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      )
    }
  }

  /**
   * Handle unknown command
   */
  private async handleUnknownCommand(chatId: number, command: string): Promise<void> {
    await this.messagingService.sendMessage(
      chatId,
      `❓ 알 수 없는 명령어입니다: ${command}\n\n/help 명령어로 사용 가능한 명령어를 확인해보세요.`
    )
  }

  /**
   * Handle regular messages (non-commands)
   */
  private async handleRegularMessage(chatId: number, userId: number, text: string): Promise<void> {
    // Simple keyword-based responses
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('안녕') || lowerText.includes('hello')) {
      await this.messagingService.sendMessage(chatId, '안녕하세요! 👋\n\n/feargreed 명령어로 현재 시장 상황을 확인해보세요!')
    } else if (lowerText.includes('도움') || lowerText.includes('help')) {
      await this.handleHelpCommand(chatId)
    } else if (lowerText.includes('구독') || lowerText.includes('subscribe')) {
      await this.messagingService.sendMessage(chatId, '구독을 원하시면 /subscribe 명령어를 사용해주세요!')
    } else {
      await this.messagingService.sendMessage(
        chatId,
        '안녕하세요! 🤖\n\n명령어를 사용하려면 /help 를 입력해주세요.\n현재 시장 상황을 확인하려면 /feargreed 를 입력해주세요.'
      )
    }
  }
}
