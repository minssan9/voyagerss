import { logger } from '@/utils/common/logger'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Chat Manager
 * Manages Telegram chat IDs from bot interactions
 */
export class ChatManager {
  private static instance: ChatManager
  private chatIds: Set<number> = new Set()
  private storageFile: string

  private constructor() {
    this.storageFile = path.join(__dirname, '../../../data/telegram-chats.json')
    this.loadChatIds()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ChatManager {
    if (!ChatManager.instance) {
      ChatManager.instance = new ChatManager()
    }
    return ChatManager.instance
  }

  /**
   * Load chat IDs from storage file
   */
  private loadChatIds(): void {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.storageFile)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      // Load existing chat IDs if file exists
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf-8')
        const chatIds = JSON.parse(data)
        this.chatIds = new Set(chatIds)
        logger.info(`[ChatManager] Loaded ${this.chatIds.size} chat IDs from storage`)
      } else {
        logger.info('[ChatManager] No existing chat storage found, starting fresh')
      }
    } catch (error) {
      logger.error('[ChatManager] Error loading chat IDs:', error)
    }
  }

  /**
   * Save chat IDs to storage file
   */
  private saveChatIds(): void {
    try {
      const chatIdsArray = Array.from(this.chatIds)
      fs.writeFileSync(this.storageFile, JSON.stringify(chatIdsArray, null, 2))
      logger.debug(`[ChatManager] Saved ${chatIdsArray.length} chat IDs to storage`)
    } catch (error) {
      logger.error('[ChatManager] Error saving chat IDs:', error)
    }
  }

  /**
   * Add a chat ID
   * @param chatId - Telegram chat ID to add
   */
  addChat(chatId: number): void {
    if (!this.chatIds.has(chatId)) {
      this.chatIds.add(chatId)
      this.saveChatIds()
      logger.info(`[ChatManager] Added new chat ID: ${chatId}`)
    }
  }

  /**
   * Remove a chat ID
   * @param chatId - Telegram chat ID to remove
   */
  removeChat(chatId: number): void {
    if (this.chatIds.has(chatId)) {
      this.chatIds.delete(chatId)
      this.saveChatIds()
      logger.info(`[ChatManager] Removed chat ID: ${chatId}`)
    }
  }

  /**
   * Get all active chat IDs
   * @returns Array of chat IDs
   */
  getAllChats(): number[] {
    return Array.from(this.chatIds)
  }

  /**
   * Get number of active chats
   * @returns Number of active chats
   */
  getChatCount(): number {
    return this.chatIds.size
  }

  /**
   * Check if a chat ID exists
   * @param chatId - Telegram chat ID to check
   * @returns True if chat ID exists
   */
  hasChat(chatId: number): boolean {
    return this.chatIds.has(chatId)
  }

  /**
   * Clear all chat IDs
   */
  clearAllChats(): void {
    this.chatIds.clear()
    this.saveChatIds()
    logger.info('[ChatManager] Cleared all chat IDs')
  }

  /**
   * Fetch chat IDs from Telegram API updates
   * This method retrieves recent updates from Telegram API to discover chat IDs
   * @param bot - Telegram bot instance
   */
  async syncFromTelegramAPI(bot: any): Promise<void> {
    try {
      if (!bot) {
        logger.warn('[ChatManager] Bot instance not provided, cannot sync from API')
        return
      }

      // Get recent updates from Telegram
      const updates = await bot.getUpdates({ limit: 100 })

      let newChatsCount = 0
      for (const update of updates) {
        let chatId: number | null = null

        // Extract chat ID from different update types
        if (update.message) {
          chatId = update.message.chat.id
        } else if (update.callback_query) {
          chatId = update.callback_query.message.chat.id
        } else if (update.channel_post) {
          chatId = update.channel_post.chat.id
        }

        // Add chat ID if found and new
        if (chatId && !this.chatIds.has(chatId)) {
          this.addChat(chatId)
          newChatsCount++
        }
      }

      if (newChatsCount > 0) {
        logger.info(`[ChatManager] Synced ${newChatsCount} new chat IDs from Telegram API`)
      } else {
        logger.info('[ChatManager] No new chat IDs found in Telegram API updates')
      }
    } catch (error) {
      logger.error('[ChatManager] Error syncing from Telegram API:', error)
    }
  }

  /**
   * Export chat IDs to a JSON string
   * @returns JSON string of chat IDs
   */
  exportChats(): string {
    return JSON.stringify(Array.from(this.chatIds), null, 2)
  }

  /**
   * Import chat IDs from a JSON string
   * @param jsonString - JSON string containing chat IDs
   */
  importChats(jsonString: string): void {
    try {
      const chatIds = JSON.parse(jsonString)
      if (Array.isArray(chatIds)) {
        chatIds.forEach(id => {
          if (typeof id === 'number') {
            this.chatIds.add(id)
          }
        })
        this.saveChatIds()
        logger.info(`[ChatManager] Imported ${chatIds.length} chat IDs`)
      }
    } catch (error) {
      logger.error('[ChatManager] Error importing chat IDs:', error)
    }
  }
}
