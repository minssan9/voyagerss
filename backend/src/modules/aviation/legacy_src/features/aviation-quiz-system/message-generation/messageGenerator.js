const moment = require('moment-timezone');

class MessageGenerator {
  constructor(aiProvider, aviationKnowledgeService = null) {
    this.aiProvider = aiProvider;
    this.aviationKnowledgeService = aviationKnowledgeService;
  }

  async generateMessage(timeSlot) {
    const now = moment().tz('Asia/Seoul');
    const dayOfMonth = now.date();
    const month = now.month() + 1; // moment uses 0-based months
    const year = now.year();
    
    // DB에서 데이터 가져오기 (fallback 지원)
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
        message += `🧠 <b>AI 생성 문제</b>\n\n${aiResponse}\n\n`;
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

  async generateCustomQuiz(topic, knowledgeArea) {
    try {
      const aiResponse = await this.aiProvider.generateQuiz(topic, knowledgeArea);
      
      let message = `🧠 <b>맞춤형 퀴즈</b>\n\n`;
      message += `📚 <b>주제</b>: ${topic}\n`;
      message += `🎯 <b>영역</b>: ${knowledgeArea}\n\n`;
      message += aiResponse;
      
      return message;
    } catch (error) {
      throw new Error('퀴즈 생성에 실패했습니다. AI API 연결을 확인해 주세요.');
    }
  }

  /**
   * Generate standardized quiz prompt for AI providers
   * @param {string} knowledgeArea - Knowledge area for the quiz
   * @returns {string} Formatted prompt
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

📅 <b>월간 학습 계획 (31일 체계):</b>
• 1-7일: 기초 항공지식 (응급상황, 역학, 항법, 기상, 시스템, 규정, 계획)
• 8-14일: 중급 항공지식 (고급 역학, 항법, 기상, 시스템, 규정, 계획, 안전)
• 15-21일: 고급 항공지식 (인적요소, 의학, 통신, 복합상황, 고속비행, RNAV, 제트류)
• 22-28일: 전문 항공지식 (자동비행, 국제규정, 장거리, 안전관리, 팀워크, 스트레스, 비상통신)
• 29-31일: 종합 및 계획 (복습, 실무적용, 다음달 준비)

🚀 알림이 설정되었습니다! 매일 정해진 시간에 항공지식을 받아보세요.

<b>명령어:</b>
/stop - 알림 중지
/status - 현재 상태 확인
/now - 지금 즉시 학습 메시지 받기
/quiz - AI가 생성하는 4지 선다 문제 받기
/quiz [주제] - 특정 주제로 맞춤 퀴즈 생성
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
`;
  }

  // 내부 메서드: DB 우선, fallback 지원
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
    
    // Fallback data - 31 days of topics
    const fallback = {
      1: { topic: 'Engine Failure 대응', description: '엔진 고장 시 대응 절차와 안전 착륙 방법' },
      2: { topic: '양력 생성 원리', description: 'Bernoulli의 원리와 실제 양력 생성 메커니즘' },
      3: { topic: 'GPS 항법', description: 'GPS 시스템의 작동 원리와 WAAS 정밀접근' },
      4: { topic: '대기 구조', description: '대기의 성층과 기상 현상의 관계' },
      5: { topic: '엔진 시스템', description: '피스톤 엔진과 터빈 엔진의 작동 원리' },
      6: { topic: '공역 분류', description: 'Class A, B, C, D, E 공역의 특성과 요구사항' },
      7: { topic: '중량과 균형', description: 'Weight & Balance 계산과 CG 관리' },
      8: { topic: '실속과 회복', description: 'Stall의 종류와 회복 절차' },
      9: { topic: 'ILS 접근', description: 'ILS 시스템의 구성요소와 정밀접근 절차' },
      10: { topic: '뇌우와 위험 기상', description: 'Thunderstorm의 생성과 조종사 대응방법' },
      11: { topic: '전기 시스템', description: '항공기 전기 시스템과 고장 시 절차' },
      12: { topic: 'IFR 규정', description: 'IFR 운항 규정과 Alternate Airport 요구사항' },
      13: { topic: '성능 계산', description: 'Density Altitude와 항공기 성능 계산' },
      14: { topic: '위험 관리', description: '위험 식별과 완화 전략' },
      15: { topic: '의사결정', description: '조종사의 의사결정 과정과 CRM' },
      16: { topic: '고도와 건강', description: '고도가 인체에 미치는 영향과 Hypoxia' },
      17: { topic: '통신 절차', description: '표준 항공 통신 절차와 ICAO 용어' },
      18: { topic: '복합 비상상황', description: '여러 시스템 고장 시 대응 절차' },
      19: { topic: '고속 비행', description: '초음속 비행과 압축성 효과' },
      20: { topic: 'RNAV/RNP', description: 'Performance Based Navigation의 개념과 활용' },
      21: { topic: '제트류와 대류권계면', description: '고고도 기상과 제트류의 영향' },
      22: { topic: '자동비행 시스템', description: '오토파일럿과 비행 관리 시스템' },
      23: { topic: '국제 규정', description: 'ICAO 규정과 국제 운항 요구사항' },
      24: { topic: '장거리 비행', description: 'ETOPS와 장거리 비행 계획' },
      25: { topic: '안전 관리 시스템', description: 'SMS와 안전 문화 구축' },
      26: { topic: '팀워크와 리더십', description: '크루 리소스 관리와 리더십' },
      27: { topic: '스트레스와 피로', description: '조종사의 스트레스 관리와 피로 대응' },
      28: { topic: '비상 통신', description: '비상상황 시 통신 절차와 표준 용어' },
      29: { topic: '종합 복습', description: '이번 달 학습 내용 종합 복습' },
      30: { topic: '실무 적용', description: '학습한 지식의 실제 적용 방법' },
      31: { topic: '다음 달 준비', description: '다음 달 학습 계획 수립' }
    };
    return fallback[dayOfMonth] || fallback[1];
  }

}

module.exports = MessageGenerator;