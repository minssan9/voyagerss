/**
 * Configuration Manager
 * Centralized configuration management for the aviation quiz system
 */
class ConfigManager {
  constructor() {
    this.config = new Map();
    this.environment = process.env.NODE_ENV || 'development';
    this._loadDefaultConfig();
    this._loadEnvironmentConfig();
  }

  /**
   * Load default configuration
   * @private
   */
  _loadDefaultConfig() {
    const defaultConfig = {
      // Database configuration
      database: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'aviation_quiz',
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
      },
      
      // API configuration
      api: {
        port: 3010,
        host: '0.0.0.0',
        cors: {
          origin: '*',
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization']
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100 // limit each IP to 100 requests per windowMs
        }
      },
      
      // AI Provider configuration
      ai: {
        providers: {
          gemini: {
            enabled: true,
            apiKey: process.env.GEMINI_API_KEY,
            model: 'gemini-pro',
            maxTokens: 1000,
            temperature: 0.7
          },
          anthropic: {
            enabled: false,
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: 'claude-3-sonnet-20240229',
            maxTokens: 1000,
            temperature: 0.7
          },
          ollama: {
            enabled: true,
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            model: 'llama2',
            maxTokens: 1000,
            temperature: 0.7
          }
        },
        fallbackOrder: ['gemini', 'ollama', 'anthropic']
      },
      
      // Quiz configuration
      quiz: {
        defaultDifficulty: 'intermediate',
        maxOptions: 6,
        minOptions: 2,
        timeLimit: 300, // 5 minutes in seconds
        retryAttempts: 3
      },
      
      // Logging configuration
      logging: {
        level: this.environment === 'production' ? 'info' : 'debug',
        format: 'combined',
        file: {
          enabled: true,
          filename: 'logs/aviation-quiz.log',
          maxSize: '10m',
          maxFiles: 5
        }
      },
      
      // Cache configuration
      cache: {
        enabled: true,
        ttl: 3600, // 1 hour in seconds
        maxSize: 1000,
        type: 'memory' // 'memory' or 'redis'
      },
      
      // Security configuration
      security: {
        jwt: {
          secret: process.env.JWT_SECRET || 'your-secret-key',
          expiresIn: '24h'
        },
        bcrypt: {
          saltRounds: 12
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000,
          max: 100
        }
      }
    };

    this._setConfig('default', defaultConfig);
  }

  /**
   * Load environment-specific configuration
   * @private
   */
  _loadEnvironmentConfig() {
    const envConfig = {
      development: {
        database: {
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT) || 3306,
          user: process.env.DATABASE_USER || 'root',
          password: process.env.DATABASE_PASSWORD || '',
          database: process.env.DATABASE_NAME || 'aviation_quiz_dev'
        },
        api: {
          port: parseInt(process.env.PORT) || 3010
        },
        logging: {
          level: 'debug'
        }
      },
      
      production: {
        database: {
          host: process.env.DATABASE_HOST,
          port: parseInt(process.env.DATABASE_PORT) || 3306,
          user: process.env.DATABASE_USER,
          password: process.env.DATABASE_PASSWORD,
          database: process.env.DATABASE_NAME,
          connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT) || 20
        },
        api: {
          port: parseInt(process.env.PORT) || 3010
        },
        logging: {
          level: 'info'
        },
        cache: {
          enabled: true,
          type: 'redis',
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD
          }
        }
      },
      
      test: {
        database: {
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT) || 3306,
          user: process.env.DATABASE_USER || 'root',
          password: process.env.DATABASE_PASSWORD || '',
          database: process.env.DATABASE_NAME || 'aviation_quiz_test'
        },
        api: {
          port: parseInt(process.env.PORT) || 3001
        },
        logging: {
          level: 'error'
        },
        cache: {
          enabled: false
        }
      }
    };

    this._setConfig('environment', envConfig[this.environment] || {});
  }

  /**
   * Set configuration value
   * @param {string} key - Configuration key
   * @param {*} value - Configuration value
   * @private
   */
  _setConfig(key, value) {
    this.config.set(key, value);
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key (supports dot notation)
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this._mergeConfigs();
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Set configuration value
   * @param {string} key - Configuration key (supports dot notation)
   * @param {*} value - Configuration value
   */
  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    let target = this._mergeConfigs();
    
    for (const k of keys) {
      if (!target[k] || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    target[lastKey] = value;
  }

  /**
   * Check if configuration key exists
   * @param {string} key - Configuration key
   * @returns {boolean} Whether key exists
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Get all configuration
   * @returns {Object} Merged configuration object
   */
  getAll() {
    return this._mergeConfigs();
  }

  /**
   * Get environment name
   * @returns {string} Environment name
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * Check if running in production
   * @returns {boolean} Whether in production environment
   */
  isProduction() {
    return this.environment === 'production';
  }

  /**
   * Check if running in development
   * @returns {boolean} Whether in development environment
   */
  isDevelopment() {
    return this.environment === 'development';
  }

  /**
   * Check if running in test
   * @returns {boolean} Whether in test environment
   */
  isTest() {
    return this.environment === 'test';
  }

  /**
   * Merge all configuration sources
   * @returns {Object} Merged configuration
   * @private
   */
  _mergeConfigs() {
    const merged = {};
    
    // Merge in order: default -> environment -> custom
    for (const [key, value] of this.config) {
      this._deepMerge(merged, value);
    }
    
    return merged;
  }

  /**
   * Deep merge objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @private
   */
  _deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        this._deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
}

module.exports = ConfigManager;
