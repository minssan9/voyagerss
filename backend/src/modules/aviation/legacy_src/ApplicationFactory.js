const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const ConfigManager = require('./features/aviation-quiz-system/architecture/config/ConfigManager');
const { DIContainer } = require('./features/aviation-quiz-system/architecture/container/DIContainer');
const ErrorHandler = require('./features/aviation-quiz-system/architecture/middleware/ErrorHandler');

/**
 * Main Application Factory
 * Creates and configures the complete aviation bot application
 */
class ApplicationFactory {
  constructor() {
    this.config = new ConfigManager();
    this.container = null;
    this.app = null;
  }

  /**
   * Create and configure the complete application
   * @param {Object} database - Database connection (optional, will create if not provided)
   * @returns {Object} Configured Express application
   */
  createApp(database = null) {
    // Initialize container
    this.container = new DIContainer();
    
    // Create database connection if not provided
    if (!database) {
      database = this._createDatabaseConnection();
    }
    
    this._registerAllServices(database);
    
    // Create Express app
    this.app = express();
    
    // Configure middleware
    this._configureMiddleware();
    
    // Configure routes
    this._configureRoutes();
    
    // Configure error handling
    this._configureErrorHandling();
    
    return this.app;
  }

  /**
   * Create database connection
   * @returns {Object} Database connection
   * @private
   */
  _createDatabaseConnection() {
    const MySQLDatabase = require('./config/database/mysqlDatabase');
    // Pass environment variables directly to MySQLDatabase
    const database = new MySQLDatabase(process.env);
    return database;
  }

  /**
   * Register all services in the dependency injection container
   * @param {Object} database - Database connection
   * @private
   */
  _registerAllServices(database) {
    // Register database as singleton
    this.container.registerInstance('database', database);

    // Register configuration
    this.container.registerInstance('config', this.config);

    // Register Aviation Quiz System services
    this._registerAviationQuizServices();
    
    // Register User Management services
    this._registerUserManagementServices();
    
    // Register Weather services
    this._registerWeatherServices();
    
    // Register Bot Telegram services
    this._registerBotTelegramServices();
    
    // Register Scheduling services
    this._registerSchedulingServices();
  }

  /**
   * Register Aviation Quiz System services
   * @private
   */
  _registerAviationQuizServices() {
    // Repositories
    this.container.registerSingleton('topicRepository', (container) => {
      const MySQLTopicRepository = require('./features/aviation-quiz-system/architecture/repositories/implementations/MySQLTopicRepository');
      return new MySQLTopicRepository(container.resolve('database'));
    });


    this.container.registerSingleton('quizRepository', (container) => {
      const MySQLQuizRepository = require('./features/aviation-quiz-system/architecture/repositories/implementations/MySQLQuizRepository');
      return new MySQLQuizRepository(container.resolve('database'));
    });

    // Services
    this.container.registerSingleton('topicService', (container) => {
      const TopicService = require('./features/aviation-quiz-system/architecture/services/TopicService');
      return new TopicService(container.resolve('topicRepository'));
    });


    this.container.registerSingleton('aviationKnowledgeService', (container) => {
      const AviationKnowledgeService = require('./features/aviation-quiz-system/architecture/services/AviationKnowledgeService');
      return new AviationKnowledgeService(
        container.resolve('topicService')
      );
    });

    // Controllers
    this.container.registerSingleton('aviationKnowledgeController', (container) => {
      const TopicController = require('./features/aviation-quiz-system/architecture/controllers/TopicController');
      return new TopicController(
        container.resolve('aviationKnowledgeService')
      );
    });

    // Placeholder controllers for missing services
    this.container.registerSingleton('userController', (container) => {
      return {
        getAllUsers: (req, res) => res.json({ message: 'User controller not implemented' }),
        getUserById: (req, res) => res.json({ message: 'User controller not implemented' }),
        createUser: (req, res) => res.json({ message: 'User controller not implemented' }),
        updateUser: (req, res) => res.json({ message: 'User controller not implemented' }),
        deleteUser: (req, res) => res.json({ message: 'User controller not implemented' })
      };
    });

    this.container.registerSingleton('weatherController', (container) => {
      return {
        getLatestWeatherImage: (req, res) => res.json({ message: 'Weather controller not implemented' }),
        downloadWeatherImage: (req, res) => res.json({ message: 'Weather controller not implemented' }),
        getWeatherImages: (req, res) => res.json({ message: 'Weather controller not implemented' }),
        getWeatherStats: (req, res) => res.json({ message: 'Weather controller not implemented' })
      };
    });

    this.container.registerSingleton('messagingController', (container) => {
      return {
        handleWebhook: (req, res) => res.json({ message: 'Messaging controller not implemented' }),
        getMessagingStatus: (req, res) => res.json({ message: 'Messaging controller not implemented' })
      };
    });

    this.container.registerSingleton('schedulingController', (container) => {
      return {
        getAllSchedules: (req, res) => res.json({ message: 'Scheduling controller not implemented' }),
        createSchedule: (req, res) => res.json({ message: 'Scheduling controller not implemented' }),
        updateSchedule: (req, res) => res.json({ message: 'Scheduling controller not implemented' }),
        deleteSchedule: (req, res) => res.json({ message: 'Scheduling controller not implemented' })
      };
    });
  }

  /**
   * Register User Management services
   * @private
   */
  _registerUserManagementServices() {
    // Repositories
    this.container.registerSingleton('userRepository', (container) => {
      const MySQLUserRepository = require('./features/user-management/architecture/repositories/implementations/MySQLUserRepository');
      return new MySQLUserRepository(container.resolve('database'));
    });

    this.container.registerSingleton('subscriptionRepository', (container) => {
      const MySQLSubscriptionRepository = require('./features/user-management/architecture/repositories/implementations/MySQLSubscriptionRepository');
      return new MySQLSubscriptionRepository(container.resolve('database'));
    });

    // Services
    this.container.registerSingleton('userManagementService', (container) => {
      const UserService = require('./features/user-management/architecture/services/UserService');
      return new UserService(container.resolve('userRepository'));
    });

    this.container.registerSingleton('subscriptionService', (container) => {
      const SubscriptionService = require('./features/user-management/architecture/services/SubscriptionService');
      return new SubscriptionService(
        container.resolve('subscriptionRepository'),
        container.resolve('userRepository')
      );
    });
  }

  /**
   * Register Weather services
   * @private
   */
  _registerWeatherServices() {
    // Repositories
    this.container.registerSingleton('weatherImageRepository', (container) => {
      const MySQLWeatherImageRepository = require('./features/weather/architecture/repositories/implementations/MySQLWeatherImageRepository');
      return new MySQLWeatherImageRepository(container.resolve('database'));
    });

    // Services
    this.container.registerSingleton('weatherService', (container) => {
      const WeatherService = require('./features/weather/architecture/services/WeatherService');
      return new WeatherService(
        container.resolve('config'),
        container.resolve('weatherImageRepository')
      );
    });
  }

  /**
   * Register Bot Telegram services
   * @private
   */
  _registerBotTelegramServices() {
    // Services
    this.container.registerSingleton('telegramBotService', (container) => {
      const TelegramBotService = require('./features/messaging/architecture/services/TelegramBotService');
      return new TelegramBotService(
        container.resolve('config'),
        container.resolve('userManagementService'),
        container.resolve('aviationKnowledgeService')
      );
    });

    this.container.registerSingleton('commandHandlerService', (container) => {
      const CommandHandlerService = require('./features/messaging/architecture/services/CommandHandlerService');
      return new CommandHandlerService(
        container.resolve('telegramBotService'),
        container.resolve('userManagementService'),
        container.resolve('aviationKnowledgeService')
      );
    });
  }

  /**
   * Register Scheduling services
   * @private
   */
  _registerSchedulingServices() {
    // Repositories
    this.container.registerSingleton('scheduleRepository', (container) => {
      const MySQLScheduleRepository = require('./features/scheduling/architecture/repositories/implementations/MySQLScheduleRepository');
      return new MySQLScheduleRepository(container.resolve('database'));
    });

    // Services
    this.container.registerSingleton('schedulingService', (container) => {
      const AviationBotScheduler = require('./scheduler');
      return new AviationBotScheduler(
        container.resolve('scheduleRepository'),
        container.resolve('telegramBotService'),
        container.resolve('weatherService')
      );
    });
  }

  /**
   * Configure application middleware
   * @private
   */
  _configureMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    const corsOptions = this.config.get('api.cors');
    this.app.use(cors(corsOptions));
    
    // Rate limiting
    const rateLimitConfig = this.config.get('api.rateLimit');
    const limiter = rateLimit(rateLimitConfig);
    this.app.use('/api/', limiter);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Configure application routes
   * @private
   */
  _configureRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Aviation Bot System is running',
        timestamp: new Date().toISOString(),
        environment: this.config.getEnvironment(),
        modules: {
          aviationQuiz: true,
          userManagement: true,
          weather: true,
          messaging: true,
          scheduling: true
        }
      });
    });

    // API routes for each module
    this.app.use('/api/aviation', this._createAviationRoutes());
    this.app.use('/api/users', this._createUserRoutes());
    this.app.use('/api/weather', this._createWeatherRoutes());
    this.app.use('/api/messaging', this._createMessagingRoutes());
    this.app.use('/api/scheduling', this._createSchedulingRoutes());
    
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
      });
    });
  }

  /**
   * Create aviation routes
   * @returns {Object} Express router
   * @private
   */
  _createAviationRoutes() {
    const router = express.Router();
    const controller = this.container.resolve('aviationKnowledgeController');
    const errorHandler = new ErrorHandler(this.config);

    // Aviation knowledge routes
    router.get('/knowledge/day/:dayOfWeek', errorHandler.catchAsync(async (req, res) => {
      await controller.getKnowledgeByDay(req, res);
    }));

    router.get('/knowledge/random/:dayOfWeek', errorHandler.catchAsync(async (req, res) => {
      await controller.getRandomTopicByDay(req, res);
    }));

    router.get('/knowledge/topics', errorHandler.catchAsync(async (req, res) => {
      await controller.getAllTopics(req, res);
    }));

    router.get('/knowledge/schedule', errorHandler.catchAsync(async (req, res) => {
      await controller.getWeeklySchedule(req, res);
    }));

    router.get('/knowledge/stats', errorHandler.catchAsync(async (req, res) => {
      await controller.getStats(req, res);
    }));

    return router;
  }

  /**
   * Create user routes
   * @returns {Object} Express router
   * @private
   */
  _createUserRoutes() {
    const router = express.Router();
    const controller = this.container.resolve('userController');
    const errorHandler = new ErrorHandler(this.config);

    // User management routes
    router.get('/', errorHandler.catchAsync(async (req, res) => {
      await controller.getAllUsers(req, res);
    }));

    router.get('/:id', errorHandler.catchAsync(async (req, res) => {
      await controller.getUserById(req, res);
    }));

    router.post('/', errorHandler.catchAsync(async (req, res) => {
      await controller.createUser(req, res);
    }));

    router.put('/:id', errorHandler.catchAsync(async (req, res) => {
      await controller.updateUser(req, res);
    }));

    router.delete('/:id', errorHandler.catchAsync(async (req, res) => {
      await controller.deleteUser(req, res);
    }));

    return router;
  }

  /**
   * Create weather routes
   * @returns {Object} Express router
   * @private
   */
  _createWeatherRoutes() {
    const router = express.Router();
    const controller = this.container.resolve('weatherController');
    const errorHandler = new ErrorHandler(this.config);

    // Weather routes
    router.get('/latest', errorHandler.catchAsync(async (req, res) => {
      await controller.getLatestWeatherImage(req, res);
    }));

    router.post('/download', errorHandler.catchAsync(async (req, res) => {
      await controller.downloadWeatherImage(req, res);
    }));

    router.get('/images', errorHandler.catchAsync(async (req, res) => {
      await controller.getWeatherImages(req, res);
    }));

    router.get('/stats', errorHandler.catchAsync(async (req, res) => {
      await controller.getWeatherStats(req, res);
    }));

    return router;
  }

  /**
   * Create messaging routes
   * @returns {Object} Express router
   * @private
   */
  _createMessagingRoutes() {
    const router = express.Router();
    const controller = this.container.resolve('messagingController');
    const errorHandler = new ErrorHandler(this.config);

    // Messaging routes
    router.post('/webhook', errorHandler.catchAsync(async (req, res) => {
      await controller.handleWebhook(req, res);
    }));

    router.get('/status', errorHandler.catchAsync(async (req, res) => {
      await controller.getMessagingStatus(req, res);
    }));

    return router;
  }

  /**
   * Create scheduling routes
   * @returns {Object} Express router
   * @private
   */
  _createSchedulingRoutes() {
    const router = express.Router();
    const controller = this.container.resolve('schedulingController');
    const errorHandler = new ErrorHandler(this.config);

    // Scheduling routes
    router.get('/schedules', errorHandler.catchAsync(async (req, res) => {
      await controller.getAllSchedules(req, res);
    }));

    router.post('/schedules', errorHandler.catchAsync(async (req, res) => {
      await controller.createSchedule(req, res);
    }));

    router.put('/schedules/:id', errorHandler.catchAsync(async (req, res) => {
      await controller.updateSchedule(req, res);
    }));

    router.delete('/schedules/:id', errorHandler.catchAsync(async (req, res) => {
      await controller.deleteSchedule(req, res);
    }));

    return router;
  }

  /**
   * Configure error handling
   * @private
   */
  _configureErrorHandling() {
    const errorHandler = new ErrorHandler(this.config);
    this.app.use(errorHandler.middleware());
  }

  /**
   * Get configuration manager
   * @returns {ConfigManager} Configuration manager instance
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get dependency injection container
   * @returns {DIContainer} Container instance
   */
  getContainer() {
    return this.container;
  }

  /**
   * Get specific service from container
   * @param {string} serviceName - Service name
   * @returns {*} Service instance
   */
  getService(serviceName) {
    return this.container.resolve(serviceName);
  }
}

module.exports = ApplicationFactory;
