const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateQuizPrompt } = require('./promptUtils');

class GeminiProvider {
  constructor(apiKey) {
    this.client = new GoogleGenerativeAI(apiKey);
    // Updated model names - using most stable and widely available models
    this.modelNames = [
      'gemini-pro',
      'gemini-1.0-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b'
    ];
    this.model = null;
    this.initialized = false;
  }

  async initializeModel() {
    if (this.initialized) {
      return;
    }

    // Try different API versions and model combinations
    const apiVersions = ['v1', 'v1beta'];
    const modelNames = this.modelNames;

    for (const apiVersion of apiVersions) {
      for (const modelName of modelNames) {
        try {
          console.log(`🔍 Trying ${modelName} with API version ${apiVersion}...`);
          this.model = this.client.getGenerativeModel(
            { model: modelName }, 
            { apiVersion: apiVersion }
          );
          // Test if the model works with a simple request
          const testResult = await this.model.generateContent('Hello');
          await testResult.response;
          console.log(`✅ Successfully initialized Gemini with model: ${modelName} (API: ${apiVersion})`);
          this.initialized = true;
          return;
        } catch (error) {
          console.log(`⚠️ Model ${modelName} with API ${apiVersion} not available: ${error.message}`);
          continue;
        }
      }
    }
    throw new Error('No available Gemini models found. Please check your API key and model availability.');
  }

  async generateQuiz(topic, knowledgeArea, messageGenerator = null) {
    try {
      // Ensure model is initialized
      if (!this.initialized) {
        await this.initializeModel();
      }

      const prompt = generateQuizPrompt(knowledgeArea, messageGenerator);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return { prompt, result: response.text() };
    } catch (error) {
      console.error('Gemini API 호출 오류:', error);
      throw error;
    }
  }

  async isAvailable() {
    try {
      // Ensure model is initialized
      if (!this.initialized) {
        await this.initializeModel();
      }
      const testResult = await this.model.generateContent('test');
      await testResult.response;
      return true;
    } catch (error) {
      console.error('Gemini API 연결 실패:', error.message);
      return false;
    }
  }

  async listAvailableModels() {
    try {
      const models = await this.client.listModels();
      console.log('Available Gemini models:', models);
      return models;
    } catch (error) {
      console.error('Failed to list models:', error.message);
      return [];
    }
  }
}

module.exports = GeminiProvider;