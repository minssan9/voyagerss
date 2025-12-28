/**
 * Command Handler Service
 * Handles Telegram bot command processing
 */
class CommandHandlerService {
  constructor(telegramBotService, userManagementService, aviationKnowledgeService) {
    this.telegramBotService = telegramBotService;
    this.userManagementService = userManagementService;
    this.aviationKnowledgeService = aviationKnowledgeService;
  }

  /**
   * Handle start command
   * @param {Object} msg - Telegram message object
   * @returns {Promise<Object>} Command result
   */
  async handleStartCommand(msg) {
    try {
      const chatId = msg.chat.id;
      const userData = {
        chatId: chatId,
        username: msg.from.username,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name
      };

      // Subscribe user
      await this.userManagementService.subscribe(chatId, userData);

      const welcomeMessage = `🤖 안녕하세요! 항공지식 알림 봇입니다.

📚 매일 오전 9시, 오후 2시, 저녁 8시에 항공지식을 알려드립니다.
🌤️ 기상 정보도 함께 제공됩니다.

사용 가능한 명령어:
/quiz - 오늘의 항공지식 퀴즈
/weather - 기상 정보
/help - 도움말
/unsubscribe - 알림 해제`;

      return await this.telegramBotService.sendMessage(chatId, welcomeMessage);
    } catch (error) {
      console.error('Error handling start command:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle help command
   * @param {Object} msg - Telegram message object
   * @returns {Promise<Object>} Command result
   */
  async handleHelpCommand(msg) {
    try {
      const chatId = msg.chat.id;
      
      const helpMessage = `📖 항공지식 알림 봇 도움말

🔹 주요 기능:
• 매일 정해진 시간에 항공지식 알림
• 기상 정보 제공
• 항공지식 퀴즈

🔹 사용 가능한 명령어:
/start - 봇 시작 및 구독
/quiz - 오늘의 항공지식 퀴즈
/weather - 기상 정보
/help - 이 도움말
/unsubscribe - 알림 해제

🔹 알림 시간:
• 오전 9시 (KST)
• 오후 2시 (KST)  
• 저녁 8시 (KST)

문의사항이 있으시면 언제든지 말씀해 주세요!`;

      return await this.telegramBotService.sendMessage(chatId, helpMessage);
    } catch (error) {
      console.error('Error handling help command:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle quiz command
   * @param {Object} msg - Telegram message object
   * @returns {Promise<Object>} Command result
   */
  async handleQuizCommand(msg) {
    try {
      const chatId = msg.chat.id;
      
      // Check if user is subscribed
      const isSubscribed = await this.userManagementService.isSubscribed(chatId);
      if (!isSubscribed) {
        return await this.telegramBotService.sendMessage(chatId, 
          '먼저 /start 명령어로 봇을 시작해주세요.');
      }

      // Get today's knowledge
      const dayOfWeek = new Date().getDay();
      const knowledge = await this.aviationKnowledgeService.getKnowledgeByDay(dayOfWeek);
      
      if (!knowledge) {
        return await this.telegramBotService.sendMessage(chatId, 
          '오늘의 항공지식을 찾을 수 없습니다. 잠시 후 다시 시도해주세요.');
      }

      const quizMessage = `📚 오늘의 항공지식 (${knowledge.name})

${knowledge.description}

💡 더 자세한 내용은 정기 알림을 통해 확인하실 수 있습니다!`;

      return await this.telegramBotService.sendMessage(chatId, quizMessage);
    } catch (error) {
      console.error('Error handling quiz command:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle weather command
   * @param {Object} msg - Telegram message object
   * @returns {Promise<Object>} Command result
   */
  async handleWeatherCommand(msg) {
    try {
      const chatId = msg.chat.id;
      
      const weatherMessage = `🌤️ 기상 정보

현재 기상 정보를 가져오는 중입니다...
잠시 후 정기 알림을 통해 자세한 기상 정보를 확인하실 수 있습니다.`;

      return await this.telegramBotService.sendMessage(chatId, weatherMessage);
    } catch (error) {
      console.error('Error handling weather command:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle unsubscribe command
   * @param {Object} msg - Telegram message object
   * @returns {Promise<Object>} Command result
   */
  async handleUnsubscribeCommand(msg) {
    try {
      const chatId = msg.chat.id;
      
      // Unsubscribe user
      await this.userManagementService.unsubscribe(chatId);

      const unsubscribeMessage = `👋 구독이 해제되었습니다.

다시 알림을 받고 싶으시면 /start 명령어를 사용해주세요.
감사합니다!`;

      return await this.telegramBotService.sendMessage(chatId, unsubscribeMessage);
    } catch (error) {
      console.error('Error handling unsubscribe command:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle unknown command
   * @param {Object} msg - Telegram message object
   * @returns {Promise<Object>} Command result
   */
  async handleUnknownCommand(msg) {
    try {
      const chatId = msg.chat.id;
      
      const unknownMessage = `❓ 알 수 없는 명령어입니다.

사용 가능한 명령어를 확인하려면 /help를 입력해주세요.`;

      return await this.telegramBotService.sendMessage(chatId, unknownMessage);
    } catch (error) {
      console.error('Error handling unknown command:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = CommandHandlerService;
