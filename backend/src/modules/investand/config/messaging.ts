/**
 * Messaging Configuration
 * Configuration for Telegram bot and messaging services
 */

export interface MessagingConfig {
  telegram: {
    botToken: string
    webhookUrl?: string
    polling: boolean
  }
  notifications: {
    dailySummary: {
      enabled: boolean
      time: string // HH:MM format (KST)
    }
    weeklyAnalysis: {
      enabled: boolean
      day: number // 0 = Sunday, 1 = Monday, etc.
      time: string // HH:MM format (KST)
    }
    fearGreedAlerts: {
      enabled: boolean
      interval: number // minutes
      threshold: number // Fear & Greed threshold for alerts
    }
  }
  subscriptions: {
    maxSubscribers: number
    rateLimit: {
      messagesPerMinute: number
      burstLimit: number
    }
  }
}

export const defaultMessagingConfig: MessagingConfig = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    ...(process.env.TELEGRAM_WEBHOOK_URL && { webhookUrl: process.env.TELEGRAM_WEBHOOK_URL }),
    polling: process.env.NODE_ENV !== 'production'
  },
  notifications: {
    dailySummary: {
      enabled: true,
      time: '18:00' // 6:00 PM KST
    },
    weeklyAnalysis: {
      enabled: true,
      day: 0, // Sunday
      time: '19:00' // 7:00 PM KST
    },
    fearGreedAlerts: {
      enabled: true,
      interval: 120, // 2 hours
      threshold: 20 // Alert when Fear & Greed <= 20 or >= 80
    }
  },
  subscriptions: {
    maxSubscribers: 10000,
    rateLimit: {
      messagesPerMinute: 30,
      burstLimit: 5
    }
  }
}

/**
 * Get messaging configuration
 */
export function getMessagingConfig(): MessagingConfig {
  return {
    ...defaultMessagingConfig,
    telegram: {
      ...defaultMessagingConfig.telegram,
      botToken: process.env.TELEGRAM_BOT_TOKEN || defaultMessagingConfig.telegram.botToken,
      ...(process.env.TELEGRAM_WEBHOOK_URL && { webhookUrl: process.env.TELEGRAM_WEBHOOK_URL })
    }
  }
}

/**
 * Validate messaging configuration
 */
export function validateMessagingConfig(config: MessagingConfig): string[] {
  const errors: string[] = []

  if (!config.telegram.botToken) {
    errors.push('TELEGRAM_BOT_TOKEN is required')
  }

  if (config.telegram.webhookUrl && !isValidUrl(config.telegram.webhookUrl)) {
    errors.push('Invalid webhook URL format')
  }

  if (config.subscriptions.maxSubscribers <= 0) {
    errors.push('maxSubscribers must be greater than 0')
  }

  if (config.subscriptions.rateLimit.messagesPerMinute <= 0) {
    errors.push('messagesPerMinute must be greater than 0')
  }

  return errors
}

/**
 * Check if URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
