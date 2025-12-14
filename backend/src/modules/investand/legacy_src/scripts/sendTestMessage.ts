import axios from 'axios'
import { logger } from '@/utils/common/logger'

/**
 * Send test message to all bot users via API
 */
async function sendTestMessage() {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000'
    
    // Test message content
    const testMessage = `🤖 *KOSPI Fear & Greed Index Bot 테스트 메시지*

안녕하세요! 이것은 봇 시스템 테스트 메시지입니다.

📊 *테스트 내용:*
• 메시징 시스템 정상 작동 확인
• 구독자 알림 기능 테스트
• 한국어 메시지 지원 확인

🎯 *사용 가능한 명령어:*
/start - 봇 시작하기
/help - 도움말 보기
/feargreed - 현재 Fear & Greed Index 조회
/subscribe daily - 일일 알림 구독

⏰ 테스트 시간: ${new Date().toLocaleString('ko-KR')}

문의사항이 있으시면 언제든지 연락주세요!`

    // Get chat IDs from command line arguments or environment
    const chatIds = process.argv.slice(2)
    
    if (chatIds.length === 0) {
      logger.warn('[SendTestMessage] No chat IDs provided')
      logger.info('[SendTestMessage] Usage: npm run messaging:send-test <chatId1> <chatId2> ...')
      logger.info('[SendTestMessage] Or set TELEGRAM_TEST_CHAT_IDS environment variable')
      
      const envChatIds = process.env.TELEGRAM_TEST_CHAT_IDS?.split(',')
      if (envChatIds && envChatIds.length > 0) {
        logger.info(`[SendTestMessage] Using chat IDs from environment: ${envChatIds.join(', ')}`)
        chatIds.push(...envChatIds)
      } else {
        console.log('\n📝 How to get your Telegram chat ID:')
        console.log('1. Message @userinfobot on Telegram')
        console.log('2. It will reply with your chat ID')
        console.log('3. Use that chat ID in the command')
        console.log('\nExample: npm run messaging:send-test 123456789')
        return
      }
    }

    logger.info(`[SendTestMessage] Sending test message to ${chatIds.length} chat IDs`)

    // Send message to each chat ID
    for (const chatId of chatIds) {
      try {
        const response = await axios.post(`${baseUrl}/api/messaging/send`, {
          chatId: parseInt(chatId),
          message: testMessage
        })

        if (response.data.success) {
          logger.info(`[SendTestMessage] ✅ Message sent successfully to ${chatId}`)
          console.log(`✅ Message sent to chat ID: ${chatId}`)
        } else {
          logger.error(`[SendTestMessage] ❌ Failed to send message to ${chatId}: ${response.data.error}`)
          console.log(`❌ Failed to send to chat ID: ${chatId} - ${response.data.error}`)
        }
      } catch (error: any) {
        logger.error(`[SendTestMessage] ❌ Error sending to ${chatId}:`, error.message)
        console.log(`❌ Error sending to chat ID: ${chatId} - ${error.message}`)
      }
    }

    logger.info('[SendTestMessage] Test messaging completed')

  } catch (error) {
    logger.error('[SendTestMessage] Error in test messaging:', error)
    console.error('❌ Error in test messaging:', error)
  }
}

/**
 * Send Fear & Greed update to test users
 */
async function sendFearGreedTest() {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000'
    const chatIds = process.argv.slice(2)
    
    if (chatIds.length === 0) {
      const envChatIds = process.env.TELEGRAM_TEST_CHAT_IDS?.split(',')
      if (envChatIds && envChatIds.length > 0) {
        chatIds.push(...envChatIds)
      } else {
        logger.warn('[SendFearGreedTest] No chat IDs provided')
        return
      }
    }

    logger.info(`[SendFearGreedTest] Sending Fear & Greed update to ${chatIds.length} chat IDs`)

    const response = await axios.post(`${baseUrl}/api/messaging/send-fear-greed`, {
      chatIds: chatIds.map(id => parseInt(id))
    })

    if (response.data.success) {
      logger.info('[SendFearGreedTest] ✅ Fear & Greed update sent successfully')
      console.log('✅ Fear & Greed update sent successfully')
    } else {
      logger.error('[SendFearGreedTest] ❌ Failed to send Fear & Greed update:', response.data.error)
      console.log('❌ Failed to send Fear & Greed update:', response.data.error)
    }

  } catch (error: any) {
    logger.error('[SendFearGreedTest] Error sending Fear & Greed update:', error)
    console.error('❌ Error sending Fear & Greed update:', error.message)
  }
}

/**
 * Send daily summary to test users
 */
async function sendDailySummaryTest() {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000'
    const chatIds = process.argv.slice(2)
    
    if (chatIds.length === 0) {
      const envChatIds = process.env.TELEGRAM_TEST_CHAT_IDS?.split(',')
      if (envChatIds && envChatIds.length > 0) {
        chatIds.push(...envChatIds)
      } else {
        logger.warn('[SendDailySummaryTest] No chat IDs provided')
        return
      }
    }

    logger.info(`[SendDailySummaryTest] Sending daily summary to ${chatIds.length} chat IDs`)

    const response = await axios.post(`${baseUrl}/api/messaging/send-daily-summary`, {
      chatIds: chatIds.map(id => parseInt(id))
    })

    if (response.data.success) {
      logger.info('[SendDailySummaryTest] ✅ Daily summary sent successfully')
      console.log('✅ Daily summary sent successfully')
    } else {
      logger.error('[SendDailySummaryTest] ❌ Failed to send daily summary:', response.data.error)
      console.log('❌ Failed to send daily summary:', response.data.error)
    }

  } catch (error: any) {
    logger.error('[SendDailySummaryTest] Error sending daily summary:', error)
    console.error('❌ Error sending daily summary:', error.message)
  }
}

// Run the appropriate function based on command line arguments
if (require.main === module) {
  const testType = process.argv[2] || 'message'
  
  switch (testType) {
    case 'feargreed':
      sendFearGreedTest()
      break
    case 'summary':
      sendDailySummaryTest()
      break
    case 'message':
    default:
      sendTestMessage()
      break
  }
}

export { sendTestMessage, sendFearGreedTest, sendDailySummaryTest }
