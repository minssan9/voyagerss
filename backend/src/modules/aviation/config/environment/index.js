require('dotenv').config();

const { getConfig } = require('../../../../config/get-config');

function parseDatabaseUrl(url) {
  if (!url) {
    return {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'aviation',
    };
  }

  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 3306,
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname.replace(/^\//, '') || 'aviation',
    };
  } catch {
    return {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'aviation',
    };
  }
}

class Config {
  constructor() {
    this.NODE_ENV = process.env.NODE_ENV || 'development';
    this.validate();
  }

  get TELEGRAM_BOT_TOKEN() {
    return getConfig('TELEGRAM_BOT_TOKEN');
  }

  get GEMINI_API_KEY() {
    return getConfig('GEMINI_API_KEY');
  }

  get databaseUrl() {
    return process.env.DATABASE_URL || process.env.DATABASE_URL_AVIATION;
  }

  get DATABASE_HOST() {
    return parseDatabaseUrl(this.databaseUrl).host;
  }

  get DATABASE_PORT() {
    return parseDatabaseUrl(this.databaseUrl).port;
  }

  get DATABASE_USER() {
    return parseDatabaseUrl(this.databaseUrl).user;
  }

  get DATABASE_PASSWORD() {
    return parseDatabaseUrl(this.databaseUrl).password;
  }

  get DATABASE_NAME() {
    return parseDatabaseUrl(this.databaseUrl).database;
  }

  get DATABASE_CONNECTION_LIMIT() {
    return parseInt(getConfig('DATABASE_CONNECTION_LIMIT', '10'), 10);
  }

  get DATABASE_ACQUIRE_TIMEOUT_MILLIS() {
    return parseInt(getConfig('DATABASE_ACQUIRE_TIMEOUT_MILLIS', '60000'), 10);
  }

  get DATABASE_CONNECT_TIMEOUT() {
    return parseInt(getConfig('DATABASE_CONNECT_TIMEOUT', '60000'), 10);
  }

  get BASE_PATH() {
    return getConfig('BASE_PATH', '/Volumes/SSD-NVMe-2');
  }

  validate() {
    if (!this.TELEGRAM_BOT_TOKEN) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN is not set (check DB system_config or .env during seed)');
    }

    if (!this.GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY is not set (check DB system_config or .env during seed)');
    }

    const providers = [];
    if (this.GEMINI_API_KEY) providers.push('Google AI Studio (Gemini)');

    if (providers.length) {
      console.log(`🔑 AI Providers: ${providers.join(', ')}`);
    }
    console.log(`🗄️ Database: ${this.DATABASE_HOST}:${this.DATABASE_PORT}/${this.DATABASE_NAME}`);
  }

  getConfig() {
    return {
      TELEGRAM_BOT_TOKEN: this.TELEGRAM_BOT_TOKEN,
      GEMINI_API_KEY: this.GEMINI_API_KEY,
      DATABASE_HOST: this.DATABASE_HOST,
      DATABASE_PORT: this.DATABASE_PORT,
      DATABASE_USER: this.DATABASE_USER,
      DATABASE_PASSWORD: this.DATABASE_PASSWORD,
      DATABASE_NAME: this.DATABASE_NAME,
      dbOptions: {
        connectionLimit: this.DATABASE_CONNECTION_LIMIT,
        acquireTimeoutMillis: this.DATABASE_ACQUIRE_TIMEOUT_MILLIS,
        connectTimeout: this.DATABASE_CONNECT_TIMEOUT,
      },
      NODE_ENV: this.NODE_ENV,
      BASE_PATH: this.BASE_PATH,
    };
  }
}

module.exports = new Config();
