import { MessagingService } from '@/services/messaging/MessagingService'
import { ChatManager } from '@/services/messaging/ChatManager'
import { logger } from '@/utils/common/logger'

/**
 * Test Broadcast Service
 * Sends test messages to all registered bot subscribers
 */
export class TestBroadcast {
  private messagingService: MessagingService
  private chatManager: ChatManager
  private bot: any = null

  constructor() {
    this.messagingService = MessagingService.getInstance()
    this.chatManager = ChatManager.getInstance()
  }

  /**
   * Initialize bot
   */
  private async initializeBot(): Promise<void> {
    // Validate bot token exists and has value
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    console.log('\n🔍 Bot Token Validation:')
    console.log('━'.repeat(50))

    if (!botToken) {
      console.log('❌ Status: Not set')
      console.log('📍 Variable: TELEGRAM_BOT_TOKEN')
      console.log('📁 Expected location: .env file in project root')

      const errorMsg = '\n❌ TELEGRAM_BOT_TOKEN environment variable not set.\n\n' +
        'Please add to your .env file:\n' +
        'TELEGRAM_BOT_TOKEN=your_bot_token_here\n\n' +
        'Get your bot token from @BotFather on Telegram.'

      console.error(errorMsg)
      logger.error('[TestBroadcast] Bot token not configured')
      throw new Error('TELEGRAM_BOT_TOKEN environment variable not set')
    }

    // Validate token is not empty or just whitespace
    if (botToken.trim().length === 0) {
      console.log('❌ Status: Empty')
      console.log('📏 Length: 0 characters')

      const errorMsg = '\n❌ TELEGRAM_BOT_TOKEN is empty.\n\n' +
        'Please set a valid bot token in your .env file.'

      console.error(errorMsg)
      logger.error('[TestBroadcast] Bot token is empty')
      throw new Error('TELEGRAM_BOT_TOKEN is empty')
    }

    // Mask token for security (show first 10 and last 4 characters)
    const maskedToken = botToken.length > 20
      ? `${botToken.substring(0, 10)}...${botToken.substring(botToken.length - 4)}`
      : `${botToken.substring(0, 10)}...`

    console.log('✅ Status: Set')
    console.log('📏 Length:', botToken.length, 'characters')
    console.log('🔑 Value:', maskedToken)
    console.log('📝 Format check:', botToken.includes(':') ? '✅ Contains ":"' : '❌ Missing ":"')

    // Validate token format (basic check)
    if (!botToken.includes(':')) {
      console.log('\n❌ Token format validation failed!')
      console.log('Expected format: [bot_id]:[auth_token]')
      console.log('Example: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz')

      const errorMsg = '\n❌ TELEGRAM_BOT_TOKEN appears to be invalid.\n\n' +
        'Valid format: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz\n' +
        'Current value: ' + maskedToken

      console.error(errorMsg)
      logger.error('[TestBroadcast] Bot token format appears invalid')
      throw new Error('TELEGRAM_BOT_TOKEN format is invalid')
    }

    console.log('━'.repeat(50))

    try {
      // Try multiple resolution paths for the module
      let TelegramBot
      try {
        // Try direct require first
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        TelegramBot = require('node-telegram-bot-api')
      } catch (e) {
        try {
          // Try from root node_modules
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          TelegramBot = require('../../../node_modules/node-telegram-bot-api')
        } catch (e2) {
          throw new Error('Cannot find module node-telegram-bot-api')
        }
      }

      this.bot = new TelegramBot(botToken, { polling: false })
      this.messagingService.initialize(this.bot)

      logger.info('[TestBroadcast] Bot initialized successfully')
      console.log('✅ Bot initialized successfully')
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        const errorMsg = '❌ Telegram bot module not found.\n\n' +
          'Please install dependencies:\n' +
          'cd backend && npm install\n\n' +
          'If error persists, install from root:\n' +
          'cd .. && npm install\n\n' +
          'Or install explicitly:\n' +
          'cd backend && npm install node-telegram-bot-api'

        console.error(errorMsg)
        logger.error('[TestBroadcast] node-telegram-bot-api module not found')
        throw new Error('node-telegram-bot-api module not installed')
      }
      throw error
    }
  }

  /**
   * Send a simple test message to all subscribers
   */
  async sendTestMessage(): Promise<void> {
    try {
      await this.initializeBot()

      const subscribers = this.chatManager.getAllChats()

      if (subscribers.length === 0) {
        logger.warn('[TestBroadcast] No subscribers found')
        console.log('❌ No subscribers found.')
        console.log('💡 Users need to send /start to the bot first to be registered.')
        return
      }

      const testMessage = `🤖 테스트 메시지

안녕하세요! 이것은 브로드캐스트 테스트 메시지입니다.

📊 구독 정보:
• 총 구독자: ${subscribers.length}명
• 발송 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

모든 시스템이 정상 작동 중입니다! ✅`

      logger.info(`[TestBroadcast] Sending test message to ${subscribers.length} subscribers`)
      console.log(`\n📤 Sending test message to ${subscribers.length} subscribers...`)

      let successCount = 0
      let failCount = 0

      for (const chatId of subscribers) {
        try {
          await this.messagingService.sendMessage(chatId, testMessage)
          successCount++
          console.log(`✅ Sent to chat ID: ${chatId}`)
        } catch (error) {
          failCount++
          console.log(`❌ Failed to send to chat ID: ${chatId}`)
          logger.error(`[TestBroadcast] Failed to send to ${chatId}:`, error)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`\n📊 Broadcast Summary:`)
      console.log(`   ✅ Success: ${successCount}`)
      console.log(`   ❌ Failed: ${failCount}`)
      console.log(`   📈 Total: ${subscribers.length}`)

      logger.info(`[TestBroadcast] Test broadcast completed: ${successCount} success, ${failCount} failed`)
    } catch (error) {
      logger.error('[TestBroadcast] Error sending test message:', error)
      console.error('❌ Error:', error instanceof Error ? error.message : error)
      throw error
    }
  }

  /**
   * Send custom message to all subscribers
   * @param message - Custom message to send
   */
  async sendCustomMessage(message: string): Promise<void> {
    try {
      await this.initializeBot()

      const subscribers = this.chatManager.getAllChats()

      if (subscribers.length === 0) {
        logger.warn('[TestBroadcast] No subscribers found')
        console.log('❌ No subscribers found.')
        return
      }

      logger.info(`[TestBroadcast] Sending custom message to ${subscribers.length} subscribers`)
      console.log(`\n📤 Sending custom message to ${subscribers.length} subscribers...`)

      let successCount = 0
      let failCount = 0

      for (const chatId of subscribers) {
        try {
          await this.messagingService.sendMessage(chatId, message)
          successCount++
          console.log(`✅ Sent to chat ID: ${chatId}`)
        } catch (error) {
          failCount++
          console.log(`❌ Failed to send to chat ID: ${chatId}`)
          logger.error(`[TestBroadcast] Failed to send to ${chatId}:`, error)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`\n📊 Broadcast Summary:`)
      console.log(`   ✅ Success: ${successCount}`)
      console.log(`   ❌ Failed: ${failCount}`)
      console.log(`   📈 Total: ${subscribers.length}`)

      logger.info(`[TestBroadcast] Custom broadcast completed: ${successCount} success, ${failCount} failed`)
    } catch (error) {
      logger.error('[TestBroadcast] Error sending custom message:', error)
      console.error('❌ Error:', error instanceof Error ? error.message : error)
      throw error
    }
  }

  /**
   * List all subscribers
   */
  async listSubscribers(): Promise<void> {
    try {
      const subscribers = this.chatManager.getAllChats()

      console.log(`\n📋 Subscriber List:`)
      console.log(`   Total: ${subscribers.length} subscribers\n`)

      if (subscribers.length === 0) {
        console.log('   No subscribers registered yet.')
        console.log('   💡 Users need to send /start to the bot to register.')
      } else {
        subscribers.forEach((chatId, index) => {
          console.log(`   ${index + 1}. Chat ID: ${chatId}`)
        })
      }

      logger.info(`[TestBroadcast] Listed ${subscribers.length} subscribers`)
    } catch (error) {
      logger.error('[TestBroadcast] Error listing subscribers:', error)
      console.error('❌ Error:', error instanceof Error ? error.message : error)
      throw error
    }
  }

  /**
   * Sync subscribers from Telegram API
   */
  async syncSubscribers(): Promise<void> {
    try {
      await this.initializeBot()

      if (!this.bot) {
        throw new Error('Bot not initialized')
      }

      console.log('\n🔄 Syncing subscribers from Telegram API...')

      const beforeCount = this.chatManager.getChatCount()
      await this.chatManager.syncFromTelegramAPI(this.bot)
      const afterCount = this.chatManager.getChatCount()

      const newSubscribers = afterCount - beforeCount

      console.log(`\n✅ Sync completed:`)
      console.log(`   New subscribers: ${newSubscribers}`)
      console.log(`   Total subscribers: ${afterCount}`)

      logger.info(`[TestBroadcast] Synced ${newSubscribers} new subscribers`)
    } catch (error) {
      logger.error('[TestBroadcast] Error syncing subscribers:', error)
      console.error('❌ Error:', error instanceof Error ? error.message : error)
      throw error
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🤖 Telegram Bot Broadcast Test\n')

  // Log environment info
  console.log('📂 Environment Info:')
  console.log('━'.repeat(50))
  console.log('📍 Working directory:', process.cwd())
  console.log('🗂️  .env file location: .env (in parent directory)')
  console.log('🔧 NODE_ENV:', process.env.NODE_ENV || 'not set')
  console.log('━'.repeat(50))

  const testBroadcast = new TestBroadcast()
  const command = process.argv[2] || 'test'
  const customMessage = process.argv.slice(3).join(' ')

  try {
    switch (command) {
      case 'test':
        await testBroadcast.sendTestMessage()
        break

      case 'custom':
        if (!customMessage) {
          console.error('❌ Error: Custom message required')
          console.log('Usage: npm run test:broadcast custom "Your message here"')
          process.exit(1)
        }
        await testBroadcast.sendCustomMessage(customMessage)
        break

      case 'list':
        await testBroadcast.listSubscribers()
        break

      case 'sync':
        await testBroadcast.syncSubscribers()
        break

      default:
        console.log('Available commands:')
        console.log('  test   - Send default test message to all subscribers')
        console.log('  custom - Send custom message to all subscribers')
        console.log('  list   - List all registered subscribers')
        console.log('  sync   - Sync subscribers from Telegram API')
        console.log('\nExamples:')
        console.log('  npm run test:broadcast test')
        console.log('  npm run test:broadcast custom "Hello everyone!"')
        console.log('  npm run test:broadcast list')
        console.log('  npm run test:broadcast sync')
        process.exit(0)
    }

    console.log('\n✅ Done!\n')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}
