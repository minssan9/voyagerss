const GoogleAIStudioProvider = require('./googleAIStudio');
const GeminiProvider = require('./gemini');
const OllamaProvider = require('./ollama');
const MySQLQuizRepository = require('../../architecture/repositories/implementations/MySQLQuizRepository');

class AIProviderManager {
  constructor(config, database, messageGenerator = null) {
    this.providers = [];
    this.quizService = new MySQLQuizRepository(database);
    this.messageGenerator = messageGenerator;
    
    // Primary: Google AI Studio (무료) - 표준 환경 변수명 사용
    if (config.GEMINI_API_KEY) {
      this.providers.push({
        name: 'google-ai-studio',
        instance: new GoogleAIStudioProvider(config.GEMINI_API_KEY),
        priority: 1
      });
    }
    
    // Fallback: Ollama (Local)
    this.providers.push({
      name: 'ollama',
      instance: new OllamaProvider(config.OLLAMA_BASE_URL || 'http://localhost:11434'),
      priority: 3
    });
    
    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);
    
    if (this.providers.length === 0) {
      throw new Error('No AI providers available. Please configure GEMINI_API_KEY or ensure Ollama is running locally.');
    }
  }

  async initialize() {
    // Quiz repository doesn't need initialization
    // Database connection is handled by the database layer
  }

  async generateQuiz(topic, knowledgeArea) {
    let lastError;
    let usedProvider = null;
    
    for (const provider of this.providers) {
      try {
        console.log(`🤖 Using ${provider.name} provider for quiz generation...`);
        const { prompt, result } = await provider.instance.generateQuiz(topic, knowledgeArea, this.messageGenerator);
        console.log(`✅ Successfully generated quiz using ${provider.name}`);

        usedProvider = provider.name;

        // 생성된 퀴즈를 데이터베이스에 저장
        try {
          await this.quizService.saveQuiz(topic, knowledgeArea, { prompt, result }, provider.name);
        } catch (dbError) {
          console.warn('⚠️ Failed to save quiz to database:', dbError.message);
          // DB 저장 실패해도 퀴즈는 반환
        }

        return { prompt, result };
      } catch (error) {
        console.warn(`⚠️ ${provider.name} provider failed:`, error.message);
        lastError = error;
        continue;
      }
    }
    
    console.error('❌ All AI providers failed');
    throw lastError || new Error('All AI providers unavailable');
  }

  async checkAvailability() {
    const status = {};
    
    for (const provider of this.providers) {
      try {
        status[provider.name] = await provider.instance.isAvailable();
      } catch (error) {
        status[provider.name] = false;
      }
    }
    
    return status;
  }

  getActiveProviders() {
    return this.providers.map(p => p.name);
  }

  getQuizService() {
    return this.quizService;
  }

  async close() {
    // Quiz repository doesn't need explicit closing
    // Database connection is managed by the database layer
  }
}

module.exports = AIProviderManager;