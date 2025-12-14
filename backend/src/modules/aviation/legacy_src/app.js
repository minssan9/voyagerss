const TelegramBot = require('node-telegram-bot-api');
const config = require('./config/environment');
const AIProviderManager = require('./features/aviation-quiz-system/message-generation/aiProviders/aiProvider');
const ApplicationFactory = require('./ApplicationFactory');
const MessageGenerator = require('./features/aviation-quiz-system/message-generation/messageGenerator');
const CommandHandlers = require('./features/messaging/commandHandlers');
const AdminServer = require('./admin/adminServer');

class AviationBot {
  constructor() {
    this.config = config.getConfig();
    this.bot = null;
    this.aiProvider = null;
    this.aviationKnowledgeService = null;
    this.messageGenerator = null;
    this.commandHandlers = null;
    this.adminServer = null;
  }

  async initialize() {
    try {
      console.log('🤖 항공지식 알림 봇을 초기화하는 중...');
      
      // Initialize Telegram Bot
      this.bot = new TelegramBot(this.config.TELEGRAM_BOT_TOKEN, { polling: true });
      
      // Initialize new architecture
      const applicationFactory = new ApplicationFactory();
      const app = applicationFactory.createApp(null); // Database will be injected by the factory
      this.aviationKnowledgeService = applicationFactory.getService('aviationKnowledgeService');
      
      // Get database from the application factory
      const database = applicationFactory.getService('database');
      
      // Initialize database connection
      await database.initialize();
      
      // Create a temporary MessageGenerator for AI providers
      const tempMessageGenerator = new MessageGenerator(null, this.aviationKnowledgeService);
      
      // Initialize AI Provider Manager with database and MessageGenerator
      this.aiProvider = new AIProviderManager(this.config, database, tempMessageGenerator);
      
      // Check AI provider availability
      const providerStatus = await this.aiProvider.checkAvailability();
      console.log('🔍 AI Provider 상태:', providerStatus);
      
      // Initialize AI Provider database
      await this.aiProvider.initialize();
      
      console.log('✅ Database-driven aviation knowledge system initialized');

      // Initialize final MessageGenerator with AI provider
      this.messageGenerator = new MessageGenerator(this.aiProvider, this.aviationKnowledgeService);
      
      // Get services from the application factory
      const userService = applicationFactory.getService('userManagementService');
      const scheduler = applicationFactory.getService('schedulingService');
      this.scheduler = scheduler;
      
      this.commandHandlers = new CommandHandlers(
        this.bot, 
        userService, 
        this.messageGenerator,
        this.aiProvider,
        scheduler,
        this.aviationKnowledgeService
      );

      // Initialize Admin Server with database
      this.adminServer = new AdminServer(database);
      
      console.log('✅ 모든 모듈이 성공적으로 초기화되었습니다');
      
    } catch (error) {
      console.error('❌ 초기화 중 오류 발생:', error);
      process.exit(1);
    }
  }

  start() {
    console.log('🚀 봇 시작 중...');
    
    // Start admin server
    this.adminServer.start();
    // Start scheduler (runs in both dev and prod)
    if (this.scheduler) {
      this.scheduler.start();
    }
    
    console.log('🤖 항공지식 알림 봇이 시작되었습니다!');
    console.log('📅 스케줄: 오전 9시, 오후 2시, 저녁 8시 (KST)');
    console.log(`🎯 활성 AI 제공자: ${this.aiProvider.getActiveProviders().join(', ')}`);
    console.log('🌐 어드민 페이지: http://localhost:3010');
    
    // Log aviation knowledge stats
    this._logAviationKnowledgeStats();
  }

  async stop() {
    console.log('⏹️ 봇 중지 중...');
    
    if (this.adminServer) {
      this.adminServer.stop();
    }

    if (this.aiProvider) {
      await this.aiProvider.close();
    }
    
    if (this.bot) {
      await this.bot.stopPolling();
    }
    
    console.log('✅ 봇이 정상적으로 중지되었습니다');
  }
  
  async _logAviationKnowledgeStats() {
    try {
      const stats = await this.aviationKnowledgeService.getStats();
      console.log(`📊 항공지식 DB 통계: ${stats.totalTopics}개 토픽`);
       
      if (stats.topicsByDifficulty) {
        const difficultyStats = Object.entries(stats.topicsByDifficulty)
          .map(([level, count]) => `${level}: ${count}개`)
          .join(', ');
        console.log(`🎯 난이도별 분포: ${difficultyStats}`);
      }
    } catch (error) {
      console.warn('⚠️ 항공지식 통계 조회 실패:', error.message);
    }
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('처리되지 않은 Promise 거부:', error);
});

process.on('SIGINT', async () => {
  console.log('\n🔄 종료 신호를 받았습니다...');
  if (global.aviationBot) {
    await global.aviationBot.stop();
  }
  process.exit(0);
});

// Start the bot
async function main() {
  const aviationBot = new AviationBot();
  global.aviationBot = aviationBot;
  
  await aviationBot.initialize();
  aviationBot.start();
}

main().catch(console.error);

module.exports = AviationBot;