const moment = require('moment-timezone');

class CommandHandlers {
  constructor(bot, userService, messageGenerator, aiProvider = null, scheduler = null, aviationKnowledgeService = null) {
    this.bot = bot;
    this.userService = userService;
    this.messageGenerator = messageGenerator;
    this.aiProvider = aiProvider;
    this.scheduler = scheduler;
    this.aviationKnowledgeService = aviationKnowledgeService;
    this.setupHandlers();
  }

  /**
   * Markdown 텍스트를 안전하게 이스케이프
   */
  escapeMarkdown(text) {
    if (!text) return text;
    
    // Telegram Markdown에서 특수문자 이스케이프
    const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    
    let escaped = text;
    specialChars.forEach(char => {
      const regex = new RegExp(`\\${char}`, 'g');
      escaped = escaped.replace(regex, `\\${char}`);
    });
    
    return escaped;
  }

  /**
   * 메시지를 안전하게 전송 (Markdown 파싱 오류 방지)
   */
  async sendSafeMessage(chatId, message, options = {}) {
    try {
      // 기본적으로 HTML 파싱 모드 사용 (더 안정적)
      const safeOptions = {
        parse_mode: 'HTML',
        ...options
      };
      
      // HTML 태그로 변환
      const htmlMessage = this.convertToHtml(message);
      
      return await this.bot.sendMessage(chatId, htmlMessage, safeOptions);
    } catch (error) {
      console.error('Message sending failed, trying without parse mode:', error);
      
      // HTML 파싱 실패시 일반 텍스트로 재시도
      try {
        return await this.bot.sendMessage(chatId, message, { parse_mode: undefined });
      } catch (secondError) {
        console.error('Second attempt failed:', secondError);
        // 최후의 수단: 메시지를 분할하여 전송
        return await this.sendSplitMessage(chatId, message);
      }
    }
  }

  /**
   * Markdown을 HTML로 변환
   */
  convertToHtml(text) {
    if (!text) return text;
    
    let html = text;
    
    // **bold** -> <b>bold</b>
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    
    // *italic* -> <i>italic</i>
    html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
    
    // `code` -> <code>code</code>
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // [text](url) -> <a href="url">text</a>
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // 줄바꿈 처리
    html = html.replace(/\n/g, '\n');
    
    return html;
  }

  /**
   * 긴 메시지를 분할하여 전송
   */
  async sendSplitMessage(chatId, message) {
    const maxLength = 4000; // Telegram 메시지 최대 길이
    
    if (message.length <= maxLength) {
      return await this.bot.sendMessage(chatId, message);
    }
    
    // 메시지를 줄 단위로 분할
    const lines = message.split('\n');
    let currentMessage = '';
    const messages = [];
    
    for (const line of lines) {
      if ((currentMessage + line + '\n').length > maxLength) {
        if (currentMessage.trim()) {
          messages.push(currentMessage.trim());
        }
        currentMessage = line + '\n';
      } else {
        currentMessage += line + '\n';
      }
    }
    
    if (currentMessage.trim()) {
      messages.push(currentMessage.trim());
    }
    
    // 분할된 메시지들을 순차적으로 전송
    const results = [];
    for (const msg of messages) {
      try {
        const result = await this.bot.sendMessage(chatId, msg);
        results.push(result);
      } catch (error) {
        console.error('Failed to send split message part:', error);
      }
    }
    
    return results[0]; // 첫 번째 메시지 결과 반환
  }

  setupHandlers() {
    // /start 명령어
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramData = {
        username: msg.from?.username,
        first_name: msg.from?.first_name,
        last_name: msg.from?.last_name,
        language_code: msg.from?.language_code
      };
      
      try {
        await this.userService.subscribe(chatId, telegramData);
        const welcomeMessage = this.messageGenerator.getWelcomeMessage();
        const sentMessage = await this.sendSafeMessage(chatId, welcomeMessage);
        
        // 메시지 로그
        await this.userService.logMessage(chatId, 'custom', {
          contentPreview: welcomeMessage.substring(0, 200),
          telegramMessageId: sentMessage.message_id,
          status: 'sent'
        });
      } catch (error) {
        console.error('Start command error:', error);
        this.bot.sendMessage(chatId, '⚠️ 서비스 초기화 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });

    // /stop 명령어
    this.bot.onText(/\/stop/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        await this.userService.unsubscribe(chatId);
        this.bot.sendMessage(chatId, '✅ 알림이 중지되었습니다. /start 명령어로 다시 시작할 수 있습니다.');
      } catch (error) {
        console.error('Stop command error:', error);
        this.bot.sendMessage(chatId, '⚠️ 구독 해제 중 오류가 발생했습니다.');
      }
    });

    // /status 명령어
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const isSubscribed = await this.userService.isSubscribed(chatId);
        const subscriberCount = await this.userService.getSubscriberCount();
        
        const statusMessage = await this.messageGenerator.getStatusMessage(isSubscribed, subscriberCount);
        await this.sendSafeMessage(chatId, statusMessage);
      } catch (error) {
        console.error('Status command error:', error);
        this.bot.sendMessage(chatId, '⚠️ 상태 조회 중 오류가 발생했습니다.');
      }
    });

    // /now 명령어
    this.bot.onText(/\/now/, async (msg) => {
      const chatId = msg.chat.id;
      const now = moment().tz('Asia/Seoul');
      const hour = now.hour();
      
      let timeSlot;
      if (hour < 13) timeSlot = 'morning';
      else if (hour < 19) timeSlot = 'afternoon';
      else timeSlot = 'evening';
      
      try {
        const message = await this.messageGenerator.generateMessage(timeSlot);
        await this.sendSafeMessage(chatId, message);
      } catch (error) {
        console.error('메시지 생성 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 메시지 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });

    // /quiz 명령어 - DB에서 랜덤 퀴즈 조회
    this.bot.onText(/\/quiz$/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        if (!this.aiProvider) {
          this.bot.sendMessage(chatId, '⚠️ AI 제공자가 초기화되지 않았습니다.');
          return;
        }
        
        const quizService = this.aiProvider.getQuizService();
        const randomQuiz = await quizService.getRandomQuiz();
        
        if (randomQuiz) {
          const formattedQuiz = quizService.formatQuizForTelegram(randomQuiz);
          await this.sendSafeMessage(chatId, formattedQuiz);
        } else {
          this.bot.sendMessage(chatId, '📝 저장된 퀴즈가 없습니다. 새로운 퀴즈를 생성합니다...');
          
          // 오늘의 주제로 새 퀴즈 생성
          const now = moment().tz('Asia/Seoul');
          const dayOfWeek = now.day();
          const todayKnowledge = await this.aviationKnowledgeService.getKnowledgeByDay(dayOfWeek);
          const randomTopic = await this.aviationKnowledgeService.getRandomTopicFromAll();
          
          const quizMessage = await this.messageGenerator.generateCustomQuiz(todayKnowledge.name, randomTopic);
          await this.sendSafeMessage(chatId, quizMessage);
        }
        
      } catch (error) {
        console.error('퀴즈 조회 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 퀴즈 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });

    // /quiz [주제] 명령어 - 특정 주제 퀴즈 생성
    this.bot.onText(/\/quiz (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const customTopic = match[1].trim();
      
      try {
        this.bot.sendMessage(chatId, '🤖 AI가 맞춤 문제를 생성하고 있습니다... 잠시만 기다려 주세요!');
        
        const quizMessage = await this.messageGenerator.generateCustomQuiz("맞춤 주제", customTopic);
        await this.sendSafeMessage(chatId, quizMessage);
        
      } catch (error) {
        console.error('맞춤 퀴즈 생성 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 퀴즈 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });

    // /quizstats 명령어 - 퀴즈 통계
    this.bot.onText(/\/quizstats/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        if (!this.aiProvider) {
          this.bot.sendMessage(chatId, '⚠️ AI 제공자가 초기화되지 않았습니다.');
          return;
        }
        
        const quizService = this.aiProvider.getQuizService();
        const stats = await quizService.getQuizStats();
        
        let message = `📊 <b>퀴즈 통계</b>\n\n`;
        message += `전체 퀴즈: ${stats.total}개\n\n`;
        
        if (stats.byTopic.length > 0) {
          message += `<b>주제별 분포:</b>\n`;
          stats.byTopic.forEach(item => {
            message += `• ${item.topic}: ${item.count}개\n`;
          });
          message += '\n';
        }
        
        if (stats.byProvider.length > 0) {
          message += `<b>AI 제공자별:</b>\n`;
          stats.byProvider.forEach(item => {
            message += `• ${item.provider}: ${item.count}개\n`;
          });
        }
        
        await this.sendSafeMessage(chatId, message);
        
      } catch (error) {
        console.error('퀴즈 통계 조회 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 통계 조회 중 오류가 발생했습니다.');
      }
    });

    // 위성사진 수집 명령어 (API 기반)
    this.bot.onText(/\/weather_collect/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        if (!this.scheduler) {
          this.bot.sendMessage(chatId, '⚠️ 스케줄러가 초기화되지 않았습니다.');
          return;
        }
        
        this.bot.sendMessage(chatId, '🛰️ 기상청 위성사진 수집을 시작합니다...');
        
        const result = await this.scheduler.manualWeatherImageCollection();
        
        let message = `🛰️ <b>위성사진 수집 완료</b>\n\n`;
        
        if (result.success) {
          const sizeKB = (result.size / 1024).toFixed(1);
          message += `✅ <b>수집 성공</b>\n`;
          message += `📁 파일명: ${result.filename}\n`;
          message += `📊 크기: ${sizeKB}KB\n`;
          message += `📅 타임스탬프: ${result.timestamp}\n`;
          message += `📝 이미지명: ${result.name}\n`;
        } else {
          message += `❌ <b>수집 실패</b>\n`;
          message += `⚠️ 오류: ${result.error}\n`;
        }
        
        await this.sendSafeMessage(chatId, message);
        
      } catch (error) {
        console.error('위성사진 수집 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 위성사진 수집 중 오류가 발생했습니다.');
      }
    });

    // 위성사진 직접 수집 명령어 (API 기반)
    this.bot.onText(/\/kma_collect/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        if (!this.scheduler || !this.scheduler.simpleWeatherService) {
          this.bot.sendMessage(chatId, '⚠️ 위성사진 서비스가 초기화되지 않았습니다.');
          return;
        }
        
        this.bot.sendMessage(chatId, '🛰️ 기상청 위성사진 직접 수집을 시작합니다...');
        
        // SimpleWeatherService 직접 호출
        const result = await this.scheduler.simpleWeatherService.downloadImage();
        
        let message = `🛰️ <b>위성사진 직접 수집 완료</b>\n\n`;
        
        if (result.success) {
          const sizeKB = (result.size / 1024).toFixed(1);
          message += `✅ <b>수집 성공</b>\n`;
          message += `📁 파일명: ${result.filename}\n`;
          message += `📊 크기: ${sizeKB}KB\n`;
          message += `📅 타임스탬프: ${result.timestamp}\n`;
          message += `📝 이미지명: ${result.name}\n`;
          message += `🔗 URL: ${result.url}\n`;
        } else {
          message += `❌ <b>수집 실패</b>\n`;
          message += `⚠️ 오류: ${result.error}\n`;
          if (result.timestamp) {
            message += `📅 시도한 타임스탬프: ${result.timestamp}\n`;
          }
        }
        
        await this.sendSafeMessage(chatId, message);
        
      } catch (error) {
        console.error('위성사진 직접 수집 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 위성사진 직접 수집 중 오류가 발생했습니다.');
      }
    });

    // 위성사진 목록 조회 명령어
    this.bot.onText(/\/weather_list/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        if (!this.scheduler) {
          this.bot.sendMessage(chatId, '⚠️ 스케줄러가 초기화되지 않았습니다.');
          return;
        }
        
        const images = await this.scheduler.getStoredWeatherImages(10);
        
        if (images.length === 0) {
          this.bot.sendMessage(chatId, '📂 저장된 위성사진이 없습니다.');
          return;
        }
        
        let message = `📂 <b>저장된 위성사진 목록</b> (최근 ${images.length}개)\n\n`;
        
        images.forEach((image, index) => {
          const sizeKB = (image.size / 1024).toFixed(1);
          const date = new Date(image.created).toLocaleString('ko-KR');
          message += `${index + 1}. ${image.filename}\n`;
          message += `   📊 크기: ${sizeKB}KB | 📅 ${date}\n\n`;
        });
        
        await this.sendSafeMessage(chatId, message);
        
      } catch (error) {
        console.error('위성사진 목록 조회 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 목록 조회 중 오류가 발생했습니다.');
      }
    });

    // 스케줄러 상태 조회 명령어
    this.bot.onText(/\/schedule_status/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        if (!this.scheduler) {
          this.bot.sendMessage(chatId, '⚠️ 스케줄러가 초기화되지 않았습니다.');
          return;
        }
        
        const jobs = this.scheduler.getJobStatus();
        
        let message = `📅 <b>스케줄러 상태</b>\n\n`;
        
        jobs.forEach(job => {
          const status = job.isRunning ? '🟢 활성' : '🔴 비활성';
          const description = this.getJobDescription(job.name);
          message += `• <b>${job.name}</b> ${status}\n`;
          message += `  ${description}\n\n`;
        });
        
        await this.sendSafeMessage(chatId, message);
        
      } catch (error) {
        console.error('스케줄러 상태 조회 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 상태 조회 중 오류가 발생했습니다.');
      }
    });

    // 위성사진 서비스 상태 조회 명령어
    this.bot.onText(/\/weather_status/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        if (!this.scheduler || !this.scheduler.simpleWeatherService) {
          this.bot.sendMessage(chatId, '⚠️ 위성사진 서비스가 초기화되지 않았습니다.');
          return;
        }
        
        this.bot.sendMessage(chatId, '📊 위성사진 서비스 상태를 확인하는 중...');
        
        const status = await this.scheduler.simpleWeatherService.getStatus();
        const imageInfo = await this.scheduler.simpleWeatherService.getLatestImageUrl();
        const storedImages = await this.scheduler.simpleWeatherService.getStoredImages(5);
        
        let message = `📊 <b>위성사진 서비스 상태</b>\n\n`;
        
        // 서비스 상태
        message += `🔧 <b>서비스 상태:</b>\n`;
        message += `• 상태: ${status.status === 'available' ? '🟢 정상' : '🔴 오류'}\n`;
        if (status.currentTimestamp) {
          message += `• 최신 타임스탬프: ${status.currentTimestamp}\n`;
        }
        if (status.imageName) {
          message += `• 최신 이미지: ${status.imageName}\n`;
        }
        if (status.error) {
          message += `• 오류: ${status.error}\n`;
        }
        message += '\n';
        
        // 최신 이미지 정보
        if (imageInfo.success) {
          message += `🛰️ <b>최신 이미지 정보:</b>\n`;
          message += `• 이름: ${imageInfo.name}\n`;
          message += `• 타임스탬프: ${imageInfo.timestamp}\n`;
          message += `• URL: ${imageInfo.url.substring(0, 50)}...\n`;
          message += '\n';
        }
        
        // 저장된 이미지 현황
        message += `📁 <b>저장된 이미지:</b>\n`;
        message += `• 총 개수: ${storedImages.length}개\n`;
        
        if (storedImages.length > 0) {
          const totalSize = storedImages.reduce((sum, img) => sum + img.size, 0);
          const totalSizeMB = (totalSize / 1024 / 1024).toFixed(1);
          message += `• 총 용량: ${totalSizeMB}MB\n`;
          message += `• 최신 파일: ${storedImages[0].filename}\n`;
        }
        
        await this.sendSafeMessage(chatId, message);
        
      } catch (error) {
        console.error('위성사진 서비스 상태 조회 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 서비스 상태 조회 중 오류가 발생했습니다.');
      }
    });

    // 위성사진 정리 명령어
    this.bot.onText(/\/weather_cleanup/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        if (!this.scheduler || !this.scheduler.simpleWeatherService) {
          this.bot.sendMessage(chatId, '⚠️ 위성사진 서비스가 초기화되지 않았습니다.');
          return;
        }
        
        this.bot.sendMessage(chatId, '🧹 오래된 위성사진 파일을 정리하는 중...');
        
        const deletedCount = await this.scheduler.simpleWeatherService.cleanup(7);
        
        let message = `🧹 <b>위성사진 정리 완료</b>\n\n`;
        message += `🗑️ 삭제된 파일: ${deletedCount}개\n`;
        message += `📅 보관 기간: 7일\n`;
        
        if (deletedCount > 0) {
          message += `\n✅ 정리 작업이 완료되었습니다.`;
        } else {
          message += `\nℹ️ 삭제할 오래된 파일이 없습니다.`;
        }
        
        await this.sendSafeMessage(chatId, message);
        
      } catch (error) {
        console.error('위성사진 정리 오류:', error);
        this.bot.sendMessage(chatId, '⚠️ 정리 작업 중 오류가 발생했습니다.');
      }
    });

    // Error handling
    this.bot.on('error', (error) => {
      console.error('봇 에러:', error);
    });
  }

  /**
   * 스케줄 작업 설명 반환
   */
  getJobDescription(jobName) {
    const descriptions = {
      'weather-images': '🛰️ 매 10분마다 기상청 위성사진 수집 (API 기반)',
      'cleanup': '🧹 매일 03:00 일주일 이상 된 파일 자동 정리',
      'morning': '🌅 매일 09:00 항공지식 알림',
      'afternoon': '🌤️ 매일 14:00 항공지식 알림',
      'evening': '🌙 매일 20:00 항공지식 알림'
    };
    
    return descriptions[jobName] || '알 수 없는 작업';
  }
}

module.exports = CommandHandlers;