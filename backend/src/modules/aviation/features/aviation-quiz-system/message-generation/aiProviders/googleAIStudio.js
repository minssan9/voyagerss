const { GoogleGenAI } = require('@google/genai');
const { generateQuizPrompt } = require('./promptUtils');

class GoogleAIStudioProvider {
  constructor(apiKey) {
    // 환경 변수에서 API 키를 자동으로 가져오거나 전달된 키 사용
    this.client = new GoogleGenAI({ apiKey });
    // Google AI Studio에서 사용 가능한 모델들 (최신 모델명)
    this.modelNames = [
      'gemini-2.5-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro'
    ];
    this.model = null;
    this.initialized = false;
  }

  async initializeModel() {
    if (this.initialized) {
      return;
    }

    // Google AI Studio에서 사용 가능한 모델들을 순차적으로 시도
    for (const modelName of this.modelNames) {
      try {
        console.log(`🔍 Trying Google AI Studio with model: ${modelName}...`);
        
        // 새로운 SDK 방식으로 모델 테스트
        const testResult = await this.client.models.generateContent({
          model: modelName,
          contents: 'Hello'
        });
        
        console.log(`✅ Successfully initialized Google AI Studio with model: ${modelName}`);
        this.model = modelName; // 모델명 저장
        this.initialized = true;
        return;
      } catch (error) {
        console.log(`⚠️ Model ${modelName} not available: ${error.message}`);
        continue;
      }
    }
    
    throw new Error('No available Google AI Studio models found. Please check your API key and model availability.');
  }

  async generateQuiz(topic, knowledgeArea, messageGenerator = null) {
    try {
      // 모델이 초기화되지 않았다면 초기화
      if (!this.initialized) {
        await this.initializeModel();
      }

      const prompt = generateQuizPrompt(knowledgeArea, messageGenerator);

      const result = await this.client.models.generateContent({
        model: this.model,
        contents: prompt
      });
      return { prompt, result: result.text };
    } catch (error) {
      console.error('Google AI Studio API 호출 오류:', error);
      throw error;
    }
  }

  async isAvailable() {
    try {
      // 모델이 초기화되지 않았다면 초기화
      if (!this.initialized) {
        await this.initializeModel();
      }
      const testResult = await this.client.models.generateContent({
        model: this.model,
        contents: 'test'
      });
      return true;
    } catch (error) {
      console.error('Google AI Studio API 연결 실패:', error.message);
      return false;
    }
  }

  async listAvailableModels() {
    try {
      // Google AI Studio에서는 listModels API가 없으므로 지원하는 모델 목록 반환
      console.log('Available Google AI Studio models:', this.modelNames);
      return this.modelNames;
    } catch (error) {
      console.error('Failed to list models:', error.message);
      return this.modelNames;
    }
  }
}

module.exports = GoogleAIStudioProvider;
