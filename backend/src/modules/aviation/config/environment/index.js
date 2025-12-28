require('dotenv').config();

class Config {
  constructor() {
    // Telegram Bot
    this.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    // AI Providers
    this.GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Database Configuration
    this.DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
    this.DATABASE_PORT = parseInt(process.env.DATABASE_PORT) || 3306;
    this.DATABASE_USER = process.env.DATABASE_USER || 'root';
    this.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'admin';
    this.DATABASE_NAME = process.env.DATABASE_NAME || 'voyagerss';

    // Database Options - MySQL2 compatible
    this.DATABASE_CONNECTION_LIMIT = parseInt(process.env.DATABASE_CONNECTION_LIMIT) || 10;
    this.DATABASE_ACQUIRE_TIMEOUT_MILLIS = parseInt(process.env.DATABASE_ACQUIRE_TIMEOUT_MILLIS) || 60000;
    this.DATABASE_CONNECT_TIMEOUT = parseInt(process.env.DATABASE_CONNECT_TIMEOUT) || 60000;

    // Environment
    this.NODE_ENV = process.env.NODE_ENV || 'development';

    // Base Path
    this.BASE_PATH = process.env.BASE_PATH || '/Volumes/SSD-NVMe-2';

    this.validate();
  }

  validate() {
    // Bot Token validation
    if (!this.TELEGRAM_BOT_TOKEN) {
      console.error('❌ TELEGRAM_BOT_TOKEN is required in .env file');
      process.exit(1);
    }

    // AI Provider validation
    if (!this.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is required in .env file');
      process.exit(1);
    }

    // Database validation
    if (!this.DATABASE_PASSWORD && this.NODE_ENV === 'production') {
      console.warn('⚠️ DATABASE_PASSWORD not set - this may cause connection issues in production');
    }

    // Log configuration
    const providers = [];
    if (this.GEMINI_API_KEY) providers.push('Google AI Studio (Gemini)');

    console.log(`🔑 AI Providers: ${providers.join(', ')}`);
    console.log(`🗄️ Database: ${this.DATABASE_HOST}:${this.DATABASE_PORT}/${this.DATABASE_NAME}`);
  }

  getConfig() {
    return {
      // Bot Configuration
      TELEGRAM_BOT_TOKEN: this.TELEGRAM_BOT_TOKEN,

      // AI Provider Keys
      GEMINI_API_KEY: this.GEMINI_API_KEY,

      // Database Configuration
      DATABASE_HOST: this.DATABASE_HOST,
      DATABASE_PORT: this.DATABASE_PORT,
      DATABASE_USER: this.DATABASE_USER,
      DATABASE_PASSWORD: this.DATABASE_PASSWORD,
      DATABASE_NAME: this.DATABASE_NAME,

      // Database Options - MySQL2 compatible
      dbOptions: {
        connectionLimit: this.DATABASE_CONNECTION_LIMIT,
        acquireTimeoutMillis: this.DATABASE_ACQUIRE_TIMEOUT_MILLIS,
        connectTimeout: this.DATABASE_CONNECT_TIMEOUT
      },

      // Environment
      NODE_ENV: this.NODE_ENV,

      // Base Path
      BASE_PATH: this.BASE_PATH
    };
  }
}

module.exports = new Config();