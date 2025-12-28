const axios = require('axios');
const { generateQuizPrompt } = require('./promptUtils');

class OllamaProvider {
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
    this.modelNames = [
      'llama3.2:3b',
      'llama3.2:1b',
      'gemma2:2b',
      'qwen2.5:3b',
      'phi3:mini'
    ];
    this.currentModel = null;
    this.initialized = false;
  }

  async initializeModel() {
    if (this.initialized) {
      return;
    }

    // Try different model combinations
    const modelNames = this.modelNames;

    for (const modelName of modelNames) {
      try {
        console.log(`🔍 Trying Ollama model: ${modelName}...`);
        
        // Test if the model works with a simple request
        const response = await axios.post(`${this.baseUrl}/api/generate`, {
          model: modelName,
          prompt: "Hello",
          stream: false
        });
        
        if (response.status === 200) {
          console.log(`✅ Successfully initialized Ollama with model: ${modelName}`);
          this.currentModel = modelName;
          this.initialized = true;
          return;
        }
      } catch (error) {
        console.log(`⚠️ Model ${modelName} not available: ${error.message}`);
        continue;
      }
    }
    throw new Error('No available Ollama models found. Please ensure Ollama is running and models are installed.');
  }

  async generateQuiz(topic, knowledgeArea, messageGenerator = null) {
    try {
      // Ensure model is initialized
      if (!this.initialized) {
        await this.initializeModel();
      }

      const prompt = generateQuizPrompt(knowledgeArea, messageGenerator);

      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.currentModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1000
        }
      });

      if (response.status === 200 && response.data.response) {
        return { prompt, result: response.data.response };
      } else {
        throw new Error('Invalid response from Ollama');
      }
    } catch (error) {
      console.error('Ollama API 호출 오류:', error);
      throw error;
    }
  }

  async isAvailable() {
    try {
      // Check if Ollama service is running
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        // Ensure model is initialized
        if (!this.initialized) {
          await this.initializeModel();
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Ollama API 연결 실패:', error.message);
      return false;
    }
  }

  async listAvailableModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      
      if (response.status === 200 && response.data.models) {
        const models = response.data.models.map(model => model.name);
        console.log('Available Ollama models:', models);
        return models;
      }
      return [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error.message);
      return [];
    }
  }

  async pullModel(modelName) {
    try {
      console.log(`📥 Pulling Ollama model: ${modelName}...`);
      const response = await axios.post(`${this.baseUrl}/api/pull`, {
        name: modelName,
        stream: false
      });
      
      if (response.status === 200) {
        console.log(`✅ Successfully pulled model: ${modelName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error.message);
      return false;
    }
  }
}

module.exports = OllamaProvider;

