const moment = require('moment-timezone');

/**
 * Enhanced Message Generator with Multimedia Support
 * Generates quizzes with text, images, and videos
 */
class MessageGeneratorEnhanced {
  constructor(aiProvider, aviationKnowledgeService = null) {
    this.aiProvider = aiProvider;
    this.aviationKnowledgeService = aviationKnowledgeService;
  }

  /**
   * Generate standard daily message
   */
  async generateMessage(timeSlot) {
    const now = moment().tz('Asia/Seoul');
    const dayOfMonth = now.date();
    const month = now.month() + 1;
    const year = now.year();

    const todayKnowledge = await this._getKnowledgeByDate(dayOfMonth, month, year);

    const timeEmojis = {
      morning: '🌅',
      afternoon: '☀️',
      evening: '🌙'
    };

    let message = `${timeEmojis[timeSlot]} <b>${timeSlot === 'morning' ? '오늘의' : timeSlot === 'afternoon' ? '오후' : '저녁'} 항공지식</b>\n\n`;
    message += `📚 <b>주제</b>: ${todayKnowledge.topic}\n\n`;

    // AI로 4지 선다 문제 생성
    try {
      const aiResponse = await this.aiProvider.generateQuiz(todayKnowledge.topic, todayKnowledge.description);
      if (aiResponse) {
        message += `🧠 <b>AI 생성 문제</b>\n\n${aiResponse.result || aiResponse}\n\n`;
      } else {
        message += `🎯 <b>오늘의 학습 포인트</b>:\n${todayKnowledge.description}\n\n`;
      }
    } catch (error) {
      console.error('AI 응답 생성 실패:', error);
      message += `🎯 <b>오늘의 학습 포인트</b>:\n${todayKnowledge.description}\n\n`;
    }

    message += await this._getTimeSpecificContent(timeSlot, dayOfMonth, month);

    return message;
  }

  /**
   * Generate custom quiz with text only
   */
  async generateCustomQuiz(topic, knowledgeArea) {
    try {
      const aiResponse = await this.aiProvider.generateQuiz(topic, knowledgeArea);

      let message = `🧠 <b>맞춤형 퀴즈</b>\n\n`;
      message += `📚 <b>주제</b>: ${topic}\n`;
      message += `🎯 <b>영역</b>: ${knowledgeArea}\n\n`;
      message += aiResponse.result || aiResponse;

      return message;
    } catch (error) {
      throw new Error('퀴즈 생성에 실패했습니다. AI API 연결을 확인해 주세요.');
    }
  }

  /**
   * Generate multimedia quiz with images
   * @param {string} topic - Quiz topic
   * @param {string} knowledgeArea - Knowledge area
   * @param {number} numImages - Number of images to generate (1-4)
   * @returns {Promise<Object>} Quiz with text and images
   */
  async generateQuizWithImages(topic, knowledgeArea, numImages = 2) {
    try {
      // Check if provider supports image generation
      if (typeof this.aiProvider.generateQuizWithImages !== 'function') {
        console.warn('Current AI provider does not support image generation. Falling back to text-only quiz.');
        const textQuiz = await this.generateCustomQuiz(topic, knowledgeArea);
        return {
          text: textQuiz,
          images: [],
          type: 'text_only',
          message: 'Image generation not supported by current provider'
        };
      }

      console.log(`🎨 Generating quiz with ${numImages} images for topic: ${topic}`);
      const result = await this.aiProvider.generateQuizWithImages(topic, null, numImages);

      // Format message with images
      let message = `🖼️ <b>이미지 포함 퀴즈</b>\n\n`;
      message += `📚 <b>주제</b>: ${topic}\n`;
      message += `🎯 <b>영역</b>: ${knowledgeArea}\n\n`;
      message += result.text;

      if (result.images && result.images.length > 0) {
        message += `\n\n📸 <b>참고 이미지</b>: ${result.images.length}개 생성됨`;
      }

      return {
        text: message,
        images: result.images,
        type: 'quiz_with_images',
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Failed to generate quiz with images:', error);
      // Fallback to text-only quiz
      const textQuiz = await this.generateCustomQuiz(topic, knowledgeArea);
      return {
        text: textQuiz,
        images: [],
        type: 'text_only',
        error: error.message
      };
    }
  }

  /**
   * Generate quiz with short video
   * @param {string} topic - Quiz topic
   * @param {string} knowledgeArea - Knowledge area
   * @param {number} duration - Video duration in seconds
   * @returns {Promise<Object>} Quiz with text and video
   */
  async generateQuizWithVideo(topic, knowledgeArea, duration = 10) {
    try {
      // Check if provider supports video generation
      if (typeof this.aiProvider.generateQuizWithVideo !== 'function') {
        console.warn('Current AI provider does not support video generation. Falling back to text-only quiz.');
        const textQuiz = await this.generateCustomQuiz(topic, knowledgeArea);
        return {
          text: textQuiz,
          video: null,
          type: 'text_only',
          message: 'Video generation not supported by current provider'
        };
      }

      console.log(`🎬 Generating quiz with video for topic: ${topic}`);
      const result = await this.aiProvider.generateQuizWithVideo(topic, null, duration);

      // Format message with video
      let message = `🎬 <b>비디오 포함 퀴즈</b>\n\n`;
      message += `📚 <b>주제</b>: ${topic}\n`;
      message += `🎯 <b>영역</b>: ${knowledgeArea}\n\n`;
      message += result.text;

      if (result.video && result.video.url) {
        message += `\n\n🎥 <b>교육 비디오</b>: ${duration}초 생성됨`;
      }

      return {
        text: message,
        video: result.video,
        type: 'quiz_with_video',
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Failed to generate quiz with video:', error);
      // Fallback to text-only quiz
      const textQuiz = await this.generateCustomQuiz(topic, knowledgeArea);
      return {
        text: textQuiz,
        video: null,
        type: 'text_only',
        error: error.message
      };
    }
  }

  /**
   * Generate comprehensive multimedia quiz (text + images + video)
   * @param {string} topic - Quiz topic
   * @param {string} knowledgeArea - Knowledge area
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Complete multimedia quiz
   */
  async generateMultimediaQuiz(topic, knowledgeArea, options = {}) {
    const {
      numImages = 2,
      videoDuration = 10,
      includeImages = true,
      includeVideo = false
    } = options;

    try {
      // Check if provider supports multimedia generation
      if (typeof this.aiProvider.generateMultimediaQuiz !== 'function') {
        console.warn('Current AI provider does not support multimedia generation.');

        // Try individual methods if available
        if (includeImages && typeof this.aiProvider.generateQuizWithImages === 'function') {
          return await this.generateQuizWithImages(topic, knowledgeArea, numImages);
        } else if (includeVideo && typeof this.aiProvider.generateQuizWithVideo === 'function') {
          return await this.generateQuizWithVideo(topic, knowledgeArea, videoDuration);
        } else {
          const textQuiz = await this.generateCustomQuiz(topic, knowledgeArea);
          return {
            text: textQuiz,
            images: [],
            video: null,
            type: 'text_only',
            message: 'Multimedia generation not supported by current provider'
          };
        }
      }

      console.log(`🚀 Generating multimedia quiz for topic: ${topic}`);
      const result = await this.aiProvider.generateMultimediaQuiz(topic, {
        numImages,
        videoDuration,
        includeImages,
        includeVideo
      });

      // Format comprehensive message
      let message = `🎯 <b>멀티미디어 종합 퀴즈</b>\n\n`;
      message += `📚 <b>주제</b>: ${topic}\n`;
      message += `🎯 <b>영역</b>: ${knowledgeArea}\n\n`;
      message += result.text;

      if (result.images && result.images.length > 0) {
        message += `\n\n📸 <b>참고 이미지</b>: ${result.images.length}개`;
      }

      if (result.video && result.video.url) {
        message += `\n🎥 <b>교육 비디오</b>: ${videoDuration}초`;
      }

      return {
        text: message,
        images: result.images || [],
        video: result.video || null,
        type: 'multimedia_quiz',
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Failed to generate multimedia quiz:', error);
      // Fallback to text-only quiz
      const textQuiz = await this.generateCustomQuiz(topic, knowledgeArea);
      return {
        text: textQuiz,
        images: [],
        video: null,
        type: 'text_only',
        error: error.message
      };
    }
  }

  /**
   * Generate quiz prompt for AI providers
   */
  generateQuizPrompt(knowledgeArea) {
    return `항공 전문가로서 "${knowledgeArea}" 주제에 대한 상세한 4지 선다 문제를 1개 만들어 주세요.

요구사항:
1. 문제는 사업용 조종사 수준의 전문적인 내용
2. 4개의 선택지 (A, B, C, D)와 명확한 정답 1개
3. 각 선택지는 현실적이고 그럴듯한 내용
4. 정답 해설도 포함
5. 실무에 적용 가능한 실용적 내용

다음 형식으로 답변해 주세요:
**문제:**
[문제 내용]

**선택지:**
A) [선택지 1]
B) [선택지 2]
C) [선택지 3]
D) [선택지 4]

**정답:** [정답 번호]

**해설:**
[정답 해설 및 추가 설명]`;
  }

  async _getTimeSpecificContent(timeSlot, dayOfMonth, month) {
    if (timeSlot === 'morning') {
      return `💡 <b>학습 가이드</b>:\n- 실제 비행 상황에서의 적용 예시 포함\n- 조종사가 알아야 할 실무적 포인트 중심\n- 관련 FAR 조항과 체크리스트 항목 확인`;
    } else if (timeSlot === 'afternoon') {
      return `🔍 <b>심화 학습</b>:\n- 문제 상황 3가지와 대응 조치\n- 실제 비행 중 적용 방법\n- 안전 고려사항`;
    } else {
      const tomorrowDay = dayOfMonth + 1;
      const tomorrowMonth = tomorrowDay > 31 ? month + 1 : month;
      const tomorrowKnowledge = await this._getKnowledgeByDate(tomorrowDay, tomorrowMonth, new Date().getFullYear());
      return `📝 <b>복습 및 정리</b>:\n- 오늘 학습한 내용 요약\n- 실무 적용 포인트 재확인\n- 내일 학습 주제 미리보기: ${tomorrowKnowledge.topic}`;
    }
  }

  getWelcomeMessage() {
    return `
✈️ <b>항공지식 알림 봇에 오신 것을 환영합니다!</b>

🎯 <b>기능:</b>
- 하루 3번 (오전 9시, 오후 2시, 저녁 8시) 항공지식 알림
- 사업용 조종사 수준의 전문 지식 제공
- 요일별 다른 주제로 체계적 학습
- 구글 Gemini AI & Claude AI 지원
- 🆕 이미지 및 비디오 포함 멀티미디어 퀴즈 지원!

📅 <b>월간 학습 계획 (31일 체계):</b>
• 1-7일: 기초 항공지식
• 8-14일: 중급 항공지식
• 15-21일: 고급 항공지식
• 22-28일: 전문 항공지식
• 29-31일: 종합 및 계획

🚀 알림이 설정되었습니다! 매일 정해진 시간에 항공지식을 받아보세요.

<b>명령어:</b>
/stop - 알림 중지
/status - 현재 상태 확인
/now - 지금 즉시 학습 메시지 받기
/quiz - AI가 생성하는 4지 선다 문제 받기
/quiz [주제] - 특정 주제로 맞춤 퀴즈 생성
/quizimg [주제] - 이미지 포함 퀴즈 생성 🆕
/quizvid [주제] - 비디오 포함 퀴즈 생성 🆕
/quizmedia [주제] - 이미지+비디오 종합 퀴즈 생성 🆕
`;
  }

  async getStatusMessage(isSubscribed, subscriberCount) {
    const now = moment().tz('Asia/Seoul');
    const todayKnowledge = await this._getKnowledgeByDay(now.day());

    return `
📊 <b>현재 상태</b>
• 알림 상태: ${isSubscribed ? '✅ 활성화' : '❌ 비활성화'}
• 오늘의 주제: ${todayKnowledge.topic}
• 다음 알림: 오전 9시, 오후 2시, 저녁 8시
• 구독자: ${subscriberCount}명
• 데이터 소스: ${this.aviationKnowledgeService ? 'MySQL Database' : 'Static Data'}
• 멀티미디어 지원: ${typeof this.aiProvider.generateMultimediaQuiz === 'function' ? '✅ 활성화' : '❌ 비활성화'}
`;
  }

  async _getKnowledgeByDate(dayOfMonth, month, year) {
    try {
      if (this.aviationKnowledgeService) {
        const knowledge = await this.aviationKnowledgeService.getKnowledgeByDate(dayOfMonth, month, year);
        return {
          topic: knowledge.name,
          description: knowledge.description
        };
      }
    } catch (error) {
      console.error('DB query failed, using fallback:', error);
    }

    // Fallback data
    const fallback = {
      1: { topic: 'Engine Failure 대응', description: '엔진 고장 시 대응 절차와 안전 착륙 방법' },
      2: { topic: '양력 생성 원리', description: 'Bernoulli의 원리와 실제 양력 생성 메커니즘' },
      3: { topic: 'GPS 항법', description: 'GPS 시스템의 작동 원리와 WAAS 정밀접근' },
      // ... (abbreviated for brevity)
    };
    return fallback[dayOfMonth] || fallback[1];
  }

  async _getKnowledgeByDay(day) {
    // Implementation for day-based knowledge
    return await this._getKnowledgeByDate(day, 1, new Date().getFullYear());
  }
}

module.exports = MessageGeneratorEnhanced;
