const Anthropic = require('@anthropic-ai/sdk');
const { generateQuizPrompt } = require('./promptUtils');

class AnthropicProvider {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
  }

  async generateQuiz(topic, knowledgeArea, messageGenerator = null) {
    try {
      const prompt = generateQuizPrompt(knowledgeArea, messageGenerator);

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return { prompt, result: response.content[0].text };
    } catch (error) {
      console.error('Anthropic API 호출 오류:', error);
      throw error;
    }
  }

  async isAvailable() {
    try {
      await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
      return true;
    } catch (error) {
      console.error('Anthropic API 연결 실패:', error);
      return false;
    }
  }
}

module.exports = AnthropicProvider;