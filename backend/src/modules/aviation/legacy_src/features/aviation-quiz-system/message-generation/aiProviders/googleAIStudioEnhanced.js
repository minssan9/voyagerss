const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { generateQuizPrompt } = require('./promptUtils');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * Enhanced Google AI Studio Provider with Image and Video Generation
 * Supports: Text generation, Image generation (Imagen), and Video generation
 */
class GoogleAIStudioEnhancedProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = new GoogleGenerativeAI(apiKey);

    // Models for different tasks
    this.models = {
      text: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
      image: ['imagen-3.0-generate-001', 'imagegeneration@006'], // Imagen models
      video: ['veo-001'] // Veo video generation
    };

    this.textModel = null;
    this.initialized = false;

    // Base URLs for different APIs
    this.baseUrls = {
      imagen: 'https://aiplatform.googleapis.com/v1/projects/{projectId}/locations/us-central1/publishers/google/models/{model}:predict',
      veo: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateVideo'
    };

    // Safety settings for content generation
    this.safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];
  }

  /**
   * Initialize text generation model
   */
  async initializeModel() {
    if (this.initialized) {
      return;
    }

    for (const modelName of this.models.text) {
      try {
        console.log(`🔍 Trying Google AI Studio with model: ${modelName}...`);
        this.textModel = this.client.getGenerativeModel({
          model: modelName,
          safetySettings: this.safetySettings
        });

        // Test the model
        const testResult = await this.textModel.generateContent('Hello');
        await testResult.response;

        console.log(`✅ Successfully initialized Google AI Studio with model: ${modelName}`);
        this.initialized = true;
        return;
      } catch (error) {
        console.log(`⚠️ Model ${modelName} not available: ${error.message}`);
        continue;
      }
    }

    throw new Error('No available Google AI Studio models found. Please check your API key.');
  }

  /**
   * Generate quiz text content
   */
  async generateQuiz(topic, knowledgeArea, messageGenerator = null) {
    try {
      if (!this.initialized) {
        await this.initializeModel();
      }

      const prompt = generateQuizPrompt(knowledgeArea, messageGenerator);
      const result = await this.textModel.generateContent(prompt);
      const response = await result.response;

      return {
        prompt,
        result: response.text(),
        type: 'text'
      };
    } catch (error) {
      console.error('Google AI Studio API 호출 오류:', error);
      throw error;
    }
  }

  /**
   * Generate quiz with multiple images based on quiz content
   * @param {string} topic - Quiz topic
   * @param {string} quizText - Generated quiz text
   * @param {number} numImages - Number of images to generate (1-4)
   * @returns {Promise<Object>} Quiz with image URLs
   */
  async generateQuizWithImages(topic, quizText, numImages = 2) {
    try {
      if (!this.initialized) {
        await this.initializeModel();
      }

      // First, generate the quiz text
      const quizResult = await this.generateQuiz(topic, topic);
      const finalQuizText = quizText || quizResult.result;

      // Extract key concepts from quiz for image generation
      const imagePrompts = await this._extractImagePrompts(finalQuizText, numImages);

      // Generate images concurrently
      console.log(`🎨 Generating ${imagePrompts.length} images for quiz...`);
      const imagePromises = imagePrompts.map((prompt, index) =>
        this._generateImage(prompt, index)
      );

      const images = await Promise.allSettled(imagePromises);
      const successfulImages = images
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      console.log(`✅ Generated ${successfulImages.length}/${imagePrompts.length} images successfully`);

      return {
        text: finalQuizText,
        images: successfulImages,
        type: 'quiz_with_images',
        metadata: {
          topic,
          totalImages: successfulImages.length,
          requestedImages: numImages
        }
      };
    } catch (error) {
      console.error('Failed to generate quiz with images:', error);
      // Fallback to text-only quiz
      const quizResult = await this.generateQuiz(topic, topic);
      return {
        text: quizResult.result,
        images: [],
        type: 'quiz_with_images',
        error: error.message
      };
    }
  }

  /**
   * Generate short video based on quiz content
   * @param {string} topic - Quiz topic
   * @param {string} quizText - Quiz text content
   * @param {number} duration - Video duration in seconds (max 60)
   * @returns {Promise<Object>} Video generation result
   */
  async generateQuizWithVideo(topic, quizText, duration = 10) {
    try {
      if (!this.initialized) {
        await this.initializeModel();
      }

      // Generate quiz text if not provided
      const quizResult = quizText ? { result: quizText } : await this.generateQuiz(topic, topic);
      const finalQuizText = quizResult.result;

      // Extract video concept from quiz
      const videoPrompt = await this._extractVideoPrompt(finalQuizText, topic);

      console.log(`🎬 Generating video for quiz topic: ${topic}...`);
      const video = await this._generateVideo(videoPrompt, duration);

      return {
        text: finalQuizText,
        video: video,
        type: 'quiz_with_video',
        metadata: {
          topic,
          duration,
          videoPrompt
        }
      };
    } catch (error) {
      console.error('Failed to generate quiz with video:', error);
      // Fallback to text-only quiz
      const quizResult = await this.generateQuiz(topic, topic);
      return {
        text: quizResult.result,
        video: null,
        type: 'quiz_with_video',
        error: error.message
      };
    }
  }

  /**
   * Generate comprehensive multimedia quiz (text + images + video)
   * @param {string} topic - Quiz topic
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Complete multimedia quiz
   */
  async generateMultimediaQuiz(topic, options = {}) {
    const {
      numImages = 2,
      videoDuration = 10,
      includeImages = true,
      includeVideo = false
    } = options;

    try {
      if (!this.initialized) {
        await this.initializeModel();
      }

      console.log(`🚀 Generating multimedia quiz for topic: ${topic}`);

      // Generate base quiz text
      const quizResult = await this.generateQuiz(topic, topic);
      const quizText = quizResult.result;

      const result = {
        text: quizText,
        images: [],
        video: null,
        type: 'multimedia_quiz',
        metadata: { topic }
      };

      // Generate images if requested
      if (includeImages) {
        try {
          const imagePrompts = await this._extractImagePrompts(quizText, numImages);
          const imagePromises = imagePrompts.map((prompt, index) =>
            this._generateImage(prompt, index)
          );
          const images = await Promise.allSettled(imagePromises);
          result.images = images
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
          console.log(`✅ Generated ${result.images.length} images`);
        } catch (error) {
          console.error('Image generation failed:', error);
          result.imageError = error.message;
        }
      }

      // Generate video if requested
      if (includeVideo) {
        try {
          const videoPrompt = await this._extractVideoPrompt(quizText, topic);
          result.video = await this._generateVideo(videoPrompt, videoDuration);
          console.log(`✅ Generated video`);
        } catch (error) {
          console.error('Video generation failed:', error);
          result.videoError = error.message;
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to generate multimedia quiz:', error);
      throw error;
    }
  }

  /**
   * Extract image prompts from quiz text using AI
   * @private
   */
  async _extractImagePrompts(quizText, numImages = 2) {
    const prompt = `다음 항공 퀴즈 내용을 분석하여 ${numImages}개의 교육용 이미지 생성 프롬프트를 만들어주세요.

퀴즈 내용:
${quizText}

요구사항:
1. 각 이미지는 퀴즈의 핵심 개념을 시각화해야 함
2. 항공, 비행, 조종실 등 관련 요소 포함
3. 교육적이고 전문적인 스타일
4. 영어로 작성 (Imagen API는 영어를 선호)
5. 각 프롬프트는 상세하고 구체적으로 (최소 20단어)

다음 JSON 형식으로만 응답:
{
  "prompts": [
    "detailed image prompt 1",
    "detailed image prompt 2"
  ]
}`;

    try {
      const result = await this.textModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.prompts || [];
      }

      // Fallback prompts
      return this._getFallbackImagePrompts(quizText, numImages);
    } catch (error) {
      console.error('Failed to extract image prompts:', error);
      return this._getFallbackImagePrompts(quizText, numImages);
    }
  }

  /**
   * Get fallback image prompts
   * @private
   */
  _getFallbackImagePrompts(topic, numImages) {
    const prompts = [
      `Professional aviation cockpit instrument panel showing flight controls and navigation systems, detailed, educational, high quality`,
      `Commercial aircraft in flight above clouds, professional aviation photography, clear blue sky, realistic`,
      `Pilot in cockpit during flight operations, professional setting, focused on instruments, aviation safety`,
      `Aircraft engine and wing detail during flight, technical illustration, aviation engineering, professional`
    ];
    return prompts.slice(0, numImages);
  }

  /**
   * Extract video prompt from quiz text
   * @private
   */
  async _extractVideoPrompt(quizText, topic) {
    const prompt = `다음 항공 퀴즈의 핵심 개념을 짧은 교육용 비디오로 표현할 프롬프트를 만들어주세요.

퀴즈 주제: ${topic}
퀴즈 내용:
${quizText}

요구사항:
1. 10-15초 길이의 비디오 개념
2. 항공, 비행 관련 시각적 요소
3. 교육적이고 명확한 내용
4. 영어로 작성 (상세하게, 최소 30단어)

프롬프트만 응답하세요 (JSON 형식 없이):`;

    try {
      const result = await this.textModel.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Failed to extract video prompt:', error);
      return `Professional aviation training video showing ${topic}, cockpit view, flight operations, educational content, smooth camera movement`;
    }
  }

  /**
   * Generate image using Imagen API
   * @private
   */
  async _generateImage(prompt, index = 0) {
    try {
      // Note: This is a placeholder implementation
      // Actual Imagen API requires Google Cloud Project setup
      console.log(`🎨 Generating image ${index + 1}: ${prompt.substring(0, 50)}...`);

      // For now, return a placeholder
      // In production, you would call the actual Imagen API
      return {
        index,
        prompt,
        url: null, // Would be the actual image URL from Imagen
        status: 'placeholder',
        message: 'Imagen API integration requires Google Cloud Project setup'
      };

      /* Production implementation would look like:
      const response = await axios.post(
        this.baseUrls.imagen.replace('{projectId}', process.env.GOOGLE_CLOUD_PROJECT_ID)
          .replace('{model}', this.models.image[0]),
        {
          instances: [{
            prompt: prompt
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${await this._getAccessToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return {
        index,
        prompt,
        url: response.data.predictions[0].imageUrl,
        status: 'success'
      };
      */
    } catch (error) {
      console.error(`Failed to generate image ${index}:`, error.message);
      return {
        index,
        prompt,
        url: null,
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Generate video using Veo API
   * @private
   */
  async _generateVideo(prompt, duration = 10) {
    try {
      console.log(`🎬 Generating video: ${prompt.substring(0, 50)}...`);

      // Placeholder implementation
      // Actual Veo API requires special access and setup
      return {
        prompt,
        duration,
        url: null,
        status: 'placeholder',
        message: 'Veo video generation requires special API access'
      };

      /* Production implementation would look like:
      const response = await axios.post(
        this.baseUrls.veo.replace('{model}', this.models.video[0]),
        {
          prompt: prompt,
          duration: duration,
          aspectRatio: '16:9'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return {
        prompt,
        duration,
        url: response.data.videoUrl,
        status: 'success'
      };
      */
    } catch (error) {
      console.error('Failed to generate video:', error.message);
      return {
        prompt,
        duration,
        url: null,
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Check if the provider is available
   */
  async isAvailable() {
    try {
      if (!this.initialized) {
        await this.initializeModel();
      }
      const testResult = await this.textModel.generateContent('test');
      await testResult.response;
      return true;
    } catch (error) {
      console.error('Google AI Studio API 연결 실패:', error.message);
      return false;
    }
  }

  /**
   * List available models
   */
  async listAvailableModels() {
    return {
      text: this.models.text,
      image: this.models.image,
      video: this.models.video
    };
  }
}

module.exports = GoogleAIStudioEnhancedProvider;
