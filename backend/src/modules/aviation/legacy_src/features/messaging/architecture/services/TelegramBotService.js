/**
 * Telegram Bot Service
 * Handles Telegram bot operations and messaging
 */
class TelegramBotService {
  constructor(config, userManagementService, aviationKnowledgeService) {
    this.config = config;
    this.userManagementService = userManagementService;
    this.aviationKnowledgeService = aviationKnowledgeService;
    this.bot = null;
  }

  /**
   * Initialize the Telegram bot
   * @param {Object} bot - Telegram bot instance
   */
  initialize(bot) {
    this.bot = bot;
  }

  /**
   * Send message to a specific chat
   * @param {number} chatId - Chat ID
   * @param {string} message - Message to send
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(chatId, message, options = {}) {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized');
      }
      
      const result = await this.bot.sendMessage(chatId, message, options);
      
      // Log the message
      await this.userManagementService.logMessage(chatId, 'sent', {
        messageId: result.message_id,
        text: message,
        timestamp: new Date()
      });
      
      return {
        success: true,
        messageId: result.message_id,
        result: result
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send photo to a specific chat
   * @param {number} chatId - Chat ID
   * @param {string} photoPath - Path to photo
   * @param {string} caption - Photo caption
   * @returns {Promise<Object>} Send result
   */
  async sendPhoto(chatId, photoPath, caption = '') {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized');
      }
      
      const result = await this.bot.sendPhoto(chatId, photoPath, { caption });
      
      // Log the message
      await this.userManagementService.logMessage(chatId, 'photo_sent', {
        messageId: result.message_id,
        photoPath: photoPath,
        caption: caption,
        timestamp: new Date()
      });
      
      return {
        success: true,
        messageId: result.message_id,
        result: result
      };
    } catch (error) {
      console.error('Error sending photo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get bot information
   * @returns {Promise<Object>} Bot information
   */
  async getBotInfo() {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized');
      }
      
      const botInfo = await this.bot.getMe();
      return {
        success: true,
        botInfo: botInfo
      };
    } catch (error) {
      console.error('Error getting bot info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get chat information
   * @param {number} chatId - Chat ID
   * @returns {Promise<Object>} Chat information
   */
  async getChatInfo(chatId) {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized');
      }
      
      const chatInfo = await this.bot.getChat(chatId);
      return {
        success: true,
        chatInfo: chatInfo
      };
    } catch (error) {
      console.error('Error getting chat info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set webhook for the bot
   * @param {string} webhookUrl - Webhook URL
   * @returns {Promise<Object>} Webhook result
   */
  async setWebhook(webhookUrl) {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized');
      }
      
      const result = await this.bot.setWebHook(webhookUrl);
      return {
        success: true,
        result: result
      };
    } catch (error) {
      console.error('Error setting webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete webhook
   * @returns {Promise<Object>} Webhook deletion result
   */
  async deleteWebhook() {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized');
      }
      
      const result = await this.bot.deleteWebHook();
      return {
        success: true,
        result: result
      };
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = TelegramBotService;
