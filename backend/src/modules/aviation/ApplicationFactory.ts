import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// @ts-ignore
import ConfigManager from './features/aviation-quiz-system/architecture/config/ConfigManager';
// @ts-ignore
import { DIContainer } from './features/aviation-quiz-system/architecture/container/DIContainer';
// @ts-ignore
import ErrorHandler from './features/aviation-quiz-system/architecture/middleware/ErrorHandler';

/**
 * Main Application Factory
 * Creates and configures the complete aviation bot application
 */
export default class ApplicationFactory {
    private config: any;
    private container: any;
    private app: any;

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
    createApp(database: any = null) {
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
    private _createDatabaseConnection() {
        // @ts-ignore
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
    private _registerAllServices(database: any) {
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
    private _registerAviationQuizServices() {
        // Repositories
        this.container.registerSingleton('topicRepository', (container: any) => {
            // @ts-ignore
            const MySQLTopicRepository = require('./features/aviation-quiz-system/architecture/repositories/implementations/MySQLTopicRepository');
            return new MySQLTopicRepository(container.resolve('database'));
        });


        this.container.registerSingleton('quizRepository', (container: any) => {
            // @ts-ignore
            const MySQLQuizRepository = require('./features/aviation-quiz-system/architecture/repositories/implementations/MySQLQuizRepository');
            return new MySQLQuizRepository(container.resolve('database'));
        });

        // Services
        this.container.registerSingleton('topicService', (container: any) => {
            // @ts-ignore
            const TopicService = require('./features/aviation-quiz-system/architecture/services/TopicService');
            return new TopicService(container.resolve('topicRepository'));
        });


        this.container.registerSingleton('aviationKnowledgeService', (container: any) => {
            // @ts-ignore
            const AviationKnowledgeService = require('./features/aviation-quiz-system/architecture/services/AviationKnowledgeService');
            return new AviationKnowledgeService(
                container.resolve('topicService')
            );
        });

        // Controllers
        this.container.registerSingleton('aviationKnowledgeController', (container: any) => {
            // @ts-ignore
            const TopicController = require('./features/aviation-quiz-system/architecture/controllers/TopicController');
            return new TopicController(
                container.resolve('aviationKnowledgeService')
            );
        });

        // Placeholder controllers for missing services
        this.container.registerSingleton('userController', (container: any) => {
            return {
                getAllUsers: (req: Request, res: Response) => res.json({ message: 'User controller not implemented' }),
                getUserById: (req: Request, res: Response) => res.json({ message: 'User controller not implemented' }),
                createUser: (req: Request, res: Response) => res.json({ message: 'User controller not implemented' }),
                updateUser: (req: Request, res: Response) => res.json({ message: 'User controller not implemented' }),
                deleteUser: (req: Request, res: Response) => res.json({ message: 'User controller not implemented' })
            };
        });

        this.container.registerSingleton('weatherController', (container: any) => {
            return {
                getLatestWeatherImage: (req: Request, res: Response) => res.json({ message: 'Weather controller not implemented' }),
                downloadWeatherImage: (req: Request, res: Response) => res.json({ message: 'Weather controller not implemented' }),
                getWeatherImages: (req: Request, res: Response) => res.json({ message: 'Weather controller not implemented' }),
                getWeatherStats: (req: Request, res: Response) => res.json({ message: 'Weather controller not implemented' })
            };
        });

        this.container.registerSingleton('messagingController', (container: any) => {
            return {
                handleWebhook: (req: Request, res: Response) => res.json({ message: 'Messaging controller not implemented' }),
                getMessagingStatus: (req: Request, res: Response) => res.json({ message: 'Messaging controller not implemented' })
            };
        });

        this.container.registerSingleton('schedulingController', (container: any) => {
            return {
                getAllSchedules: (req: Request, res: Response) => res.json({ message: 'Scheduling controller not implemented' }),
                createSchedule: (req: Request, res: Response) => res.json({ message: 'Scheduling controller not implemented' }),
                updateSchedule: (req: Request, res: Response) => res.json({ message: 'Scheduling controller not implemented' }),
                deleteSchedule: (req: Request, res: Response) => res.json({ message: 'Scheduling controller not implemented' })
            };
        });
    }

    /**
     * Register User Management services
     * @private
     */
    private _registerUserManagementServices() {
        // Repositories
        this.container.registerSingleton('userRepository', (container: any) => {
            // @ts-ignore
            const MySQLUserRepository = require('./features/user-management/architecture/repositories/implementations/MySQLUserRepository');
            return new MySQLUserRepository(container.resolve('database'));
        });

        this.container.registerSingleton('subscriptionRepository', (container: any) => {
            // @ts-ignore
            const MySQLSubscriptionRepository = require('./features/user-management/architecture/repositories/implementations/MySQLSubscriptionRepository');
            return new MySQLSubscriptionRepository(container.resolve('database'));
        });

        // Services
        this.container.registerSingleton('userManagementService', (container: any) => {
            // @ts-ignore
            const UserService = require('./features/user-management/architecture/services/UserService');
            return new UserService(container.resolve('userRepository'));
        });

        this.container.registerSingleton('subscriptionService', (container: any) => {
            // @ts-ignore
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
    private _registerWeatherServices() {
        // Repositories
        this.container.registerSingleton('weatherImageRepository', (container: any) => {
            // @ts-ignore
            const MySQLWeatherImageRepository = require('./features/weather/architecture/repositories/implementations/MySQLWeatherImageRepository');
            return new MySQLWeatherImageRepository(container.resolve('database'));
        });

        // Services
        this.container.registerSingleton('weatherService', (container: any) => {
            // @ts-ignore
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
    private _registerBotTelegramServices() {
        // Services
        this.container.registerSingleton('telegramBotService', (container: any) => {
            // @ts-ignore
            const TelegramBotService = require('./features/messaging/architecture/services/TelegramBotService');
            return new TelegramBotService(
                container.resolve('config'),
                container.resolve('userManagementService'),
                container.resolve('aviationKnowledgeService')
            );
        });

        this.container.registerSingleton('commandHandlerService', (container: any) => {
            // @ts-ignore
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
    private _registerSchedulingServices() {
        // Repositories
        this.container.registerSingleton('scheduleRepository', (container: any) => {
            // @ts-ignore
            const MySQLScheduleRepository = require('./features/scheduling/architecture/repositories/implementations/MySQLScheduleRepository');
            return new MySQLScheduleRepository(container.resolve('database'));
        });

        // Services
        this.container.registerSingleton('schedulingService', (container: any) => {
            // @ts-ignore
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
    private _configureMiddleware() {
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
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    /**
     * Configure application routes
     * @private
     */
    private _configureRoutes() {
        // Health check endpoint
        this.app.get('/health', (req: Request, res: Response) => {
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
        this.app.use((req: Request, res: Response) => {
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
    private _createAviationRoutes() {
        const router = express.Router();
        const controller = this.container.resolve('aviationKnowledgeController');
        const errorHandler = new ErrorHandler(this.config);

        // Aviation knowledge routes
        router.get('/knowledge/day/:dayOfWeek', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getKnowledgeByDay(req, res);
        }) as any);

        router.get('/knowledge/random/:dayOfWeek', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getRandomTopicByDay(req, res);
        }) as any);

        router.get('/knowledge/topics', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getAllTopics(req, res);
        }) as any);

        router.get('/knowledge/schedule', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getWeeklySchedule(req, res);
        }) as any);

        router.get('/knowledge/stats', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getStats(req, res);
        }) as any);

        return router;
    }

    /**
     * Create user routes
     * @returns {Object} Express router
     * @private
     */
    private _createUserRoutes() {
        const router = express.Router();
        const controller = this.container.resolve('userController');
        const errorHandler = new ErrorHandler(this.config);

        // User management routes
        router.get('/', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getAllUsers(req, res);
        }) as any);

        router.get('/:id', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getUserById(req, res);
        }) as any);

        router.post('/', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.createUser(req, res);
        }) as any);

        router.put('/:id', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.updateUser(req, res);
        }) as any);

        router.delete('/:id', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.deleteUser(req, res);
        }) as any);

        return router;
    }

    /**
     * Create weather routes
     * @returns {Object} Express router
     * @private
     */
    private _createWeatherRoutes() {
        const router = express.Router();
        const controller = this.container.resolve('weatherController');
        const errorHandler = new ErrorHandler(this.config);

        // Weather routes
        router.get('/latest', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getLatestWeatherImage(req, res);
        }) as any);

        router.post('/download', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.downloadWeatherImage(req, res);
        }) as any);

        router.get('/images', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getWeatherImages(req, res);
        }) as any);

        router.get('/stats', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getWeatherStats(req, res);
        }) as any);

        return router;
    }

    /**
     * Create messaging routes
     * @returns {Object} Express router
     * @private
     */
    private _createMessagingRoutes() {
        const router = express.Router();
        const controller = this.container.resolve('messagingController');
        const errorHandler = new ErrorHandler(this.config);

        // Messaging routes
        router.post('/webhook', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.handleWebhook(req, res);
        }) as any);

        router.get('/status', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getMessagingStatus(req, res);
        }) as any);

        return router;
    }

    /**
     * Create scheduling routes
     * @returns {Object} Express router
     * @private
     */
    private _createSchedulingRoutes() {
        const router = express.Router();
        const controller = this.container.resolve('schedulingController');
        const errorHandler = new ErrorHandler(this.config);

        // Scheduling routes
        router.get('/schedules', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.getAllSchedules(req, res);
        }) as any);

        router.post('/schedules', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.createSchedule(req, res);
        }) as any);

        router.put('/schedules/:id', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.updateSchedule(req, res);
        }) as any);

        router.delete('/schedules/:id', errorHandler.catchAsync(async (req: any, res: any) => {
            await controller.deleteSchedule(req, res);
        }) as any);

        return router;
    }

    /**
     * Configure error handling
     * @private
     */
    private _configureErrorHandling() {
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
    getService(serviceName: string) {
        return this.container.resolve(serviceName);
    }
}
