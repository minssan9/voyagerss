/**
 * Dependency Injection Container
 * Manages service dependencies and provides centralized service resolution
 */
class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a service with the container
   * @param {string} name - Service name
   * @param {Function} factory - Factory function to create the service
   * @param {boolean} singleton - Whether to treat as singleton
   */
  register(name, factory, singleton = false) {
    this.services.set(name, { factory, singleton });
  }

  /**
   * Register a singleton service
   * @param {string} name - Service name
   * @param {Function} factory - Factory function to create the service
   */
  registerSingleton(name, factory) {
    this.register(name, factory, true);
  }

  /**
   * Register an instance as a singleton
   * @param {string} name - Service name
   * @param {*} instance - Service instance
   */
  registerInstance(name, instance) {
    this.singletons.set(name, instance);
  }

  /**
   * Resolve a service from the container
   * @param {string} name - Service name
   * @returns {*} Service instance
   */
  resolve(name) {
    // Check if already resolved as singleton
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Get service definition
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not registered`);
    }

    // Create instance
    const instance = service.factory(this);
    
    // Store as singleton if needed
    if (service.singleton) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean} Whether service is registered
   */
  has(name) {
    return this.services.has(name) || this.singletons.has(name);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Get all registered service names
   * @returns {Array<string>} Array of service names
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }
}

/**
 * Aviation Quiz System Service Container
 * Pre-configured container with all aviation quiz system services
 */
class AviationQuizContainer extends DIContainer {
  constructor(database) {
    super();
    this.database = database;
    this._registerServices();
  }

  /**
   * Register all aviation quiz system services
   * @private
   */
  _registerServices() {
    // Register database as singleton
    this.registerInstance('database', this.database);

    // Register repositories
    this.registerSingleton('topicRepository', (container) => {
      const MySQLTopicRepository = require('../repositories/implementations/MySQLTopicRepository');
      return new MySQLTopicRepository(container.resolve('database'));
    });


    this.registerSingleton('quizRepository', (container) => {
      const MySQLQuizRepository = require('../repositories/implementations/MySQLQuizRepository');
      return new MySQLQuizRepository(container.resolve('database'));
    });

    // Register services
    this.registerSingleton('topicService', (container) => {
      const TopicService = require('../services/TopicService');
      return new TopicService(container.resolve('topicRepository'));
    });


    this.registerSingleton('aviationKnowledgeService', (container) => {
      const AviationKnowledgeService = require('../services/AviationKnowledgeService');
      return new AviationKnowledgeService(
        container.resolve('topicService')
      );
    });

    // Register controllers
    this.registerSingleton('topicController', (container) => {
      const TopicController = require('../controllers/TopicController');
      return new TopicController(container.resolve('topicService'));
    });


    this.registerSingleton('aviationKnowledgeController', (container) => {
      const AviationKnowledgeController = require('../controllers/AviationKnowledgeController');
      return new AviationKnowledgeController(container.resolve('aviationKnowledgeService'));
    });
  }

  /**
   * Get topic controller
   * @returns {TopicController} Topic controller instance
   */
  getTopicController() {
    return this.resolve('topicController');
  }


  /**
   * Get aviation knowledge controller
   * @returns {AviationKnowledgeController} Aviation knowledge controller instance
   */
  getAviationKnowledgeController() {
    return this.resolve('aviationKnowledgeController');
  }

  /**
   * Get aviation knowledge service
   * @returns {AviationKnowledgeService} Aviation knowledge service instance
   */
  getAviationKnowledgeService() {
    return this.resolve('aviationKnowledgeService');
  }
}

module.exports = { DIContainer, AviationQuizContainer };
