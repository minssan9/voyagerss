import axios from 'axios';
import crypto from 'crypto';

export interface KakaoNotificationParams {
  to: string;         // 수신자 전화번호 (01012345678 형식)
  templateId: string; // 카카오톡 알림톡 템플릿 ID
  variables: any;     // 템플릿 치환 변수
}

export interface SMSParams {
  to: string;      // 수신자 전화번호
  message: string; // SMS 메시지 내용
}

/**
 * Solapi를 사용한 카카오톡 알림톡 및 SMS 발송 서비스
 *
 * 환경 변수:
 * - SOLAPI_API_KEY: Solapi API 키
 * - SOLAPI_API_SECRET: Solapi API 시크릿
 * - SOLAPI_SENDER_PHONE: 발신 전화번호
 * - SOLAPI_KAKAO_PFID: 카카오톡 채널 ID
 */
export class SolapiProvider {
  private apiKey: string;
  private apiSecret: string;
  private senderPhone: string;
  private kakaoPfId: string;
  private baseUrl = 'https://api.solapi.com';

  constructor() {
    this.apiKey = process.env.SOLAPI_API_KEY || '';
    this.apiSecret = process.env.SOLAPI_API_SECRET || '';
    this.senderPhone = process.env.SOLAPI_SENDER_PHONE || '';
    this.kakaoPfId = process.env.SOLAPI_KAKAO_PFID || '';

    if (!this.apiKey || !this.apiSecret) {
      console.warn('Solapi credentials not configured');
    }
  }

  /**
   * HMAC-SHA256 서명 생성
   */
  private generateSignature(timestamp: string, salt: string): string {
    const message = timestamp + salt;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  /**
   * 인증 헤더 생성
   */
  private getAuthHeaders(): { [key: string]: string } {
    const timestamp = Date.now().toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const signature = this.generateSignature(timestamp, salt);

    return {
      'Authorization': `HMAC-SHA256 apiKey=${this.apiKey}, date=${timestamp}, salt=${salt}, signature=${signature}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 카카오톡 알림톡 발송
   *
   * @param params 알림톡 파라미터
   * @returns 성공 여부
   */
  async sendKakaoNotification(params: KakaoNotificationParams): Promise<boolean> {
    try {
      if (!this.apiKey || !this.apiSecret) {
        console.warn('Solapi not configured, skipping Kakao notification');
        return false;
      }

      const url = `${this.baseUrl}/messages/v4/send`;

      const payload = {
        message: {
          to: params.to,
          from: this.senderPhone,
          type: 'ATA', // 알림톡
          kakaoOptions: {
            pfId: this.kakaoPfId,
            templateId: params.templateId,
            variables: params.variables
          }
        }
      };

      console.log('Sending Kakao notification:', {
        to: params.to,
        templateId: params.templateId
      });

      const response = await axios.post(url, payload, {
        headers: this.getAuthHeaders()
      });

      const success = response.data.statusCode === '2000';

      if (success) {
        console.log('Kakao notification sent successfully:', response.data);
      } else {
        console.error('Kakao notification failed:', response.data);
      }

      return success;
    } catch (error: any) {
      console.error('Kakao notification error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return false;
    }
  }

  /**
   * SMS 발송 (폴백 또는 단독 사용)
   *
   * @param params SMS 파라미터
   * @returns 성공 여부
   */
  async sendSMS(params: SMSParams): Promise<boolean> {
    try {
      if (!this.apiKey || !this.apiSecret) {
        console.warn('Solapi not configured, skipping SMS');
        return false;
      }

      const url = `${this.baseUrl}/messages/v4/send`;

      // 메시지 길이에 따라 SMS/LMS 구분
      const messageType = params.message.length > 90 ? 'LMS' : 'SMS';

      const payload = {
        message: {
          to: params.to,
          from: this.senderPhone,
          type: messageType,
          text: params.message
        }
      };

      console.log('Sending SMS:', {
        to: params.to,
        type: messageType,
        length: params.message.length
      });

      const response = await axios.post(url, payload, {
        headers: this.getAuthHeaders()
      });

      const success = response.data.statusCode === '2000';

      if (success) {
        console.log('SMS sent successfully:', response.data);
      } else {
        console.error('SMS send failed:', response.data);
      }

      return success;
    } catch (error: any) {
      console.error('SMS send error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return false;
    }
  }

  /**
   * 카카오톡 알림톡 발송 (실패 시 SMS 폴백)
   *
   * @param kakaoParams 카카오톡 파라미터
   * @param smsMessage SMS 폴백 메시지
   * @param to 수신자 번호
   * @returns 성공 여부
   */
  async sendWithFallback(
    kakaoParams: KakaoNotificationParams,
    smsMessage: string
  ): Promise<{ success: boolean; method: 'kakao' | 'sms' | 'none' }> {
    // 먼저 카카오톡 시도
    const kakaoSuccess = await this.sendKakaoNotification(kakaoParams);

    if (kakaoSuccess) {
      return { success: true, method: 'kakao' };
    }

    // 카카오톡 실패 시 SMS 폴백
    console.log('Kakao notification failed, trying SMS fallback');
    const smsSuccess = await this.sendSMS({
      to: kakaoParams.to,
      message: smsMessage
    });

    if (smsSuccess) {
      return { success: true, method: 'sms' };
    }

    return { success: false, method: 'none' };
  }

  /**
   * 여러 수신자에게 동시 발송
   *
   * @param recipients 수신자 목록
   * @param templateId 템플릿 ID
   * @param variables 템플릿 변수
   * @returns 발송 결과 목록
   */
  async sendBulkKakaoNotifications(
    recipients: string[],
    templateId: string,
    variables: any
  ): Promise<{ to: string; success: boolean }[]> {
    const results = await Promise.all(
      recipients.map(async (to) => {
        const success = await this.sendKakaoNotification({
          to,
          templateId,
          variables
        });
        return { to, success };
      })
    );

    return results;
  }
}
