import nodemailer, { Transporter } from 'nodemailer';

export interface EmailParams {
  to: string;      // 수신자 이메일
  subject: string; // 이메일 제목
  html: string;    // HTML 본문
  text?: string;   // 텍스트 본문 (선택)
}

/**
 * Nodemailer를 사용한 이메일 발송 서비스
 *
 * 환경 변수:
 * - SMTP_HOST: SMTP 서버 호스트
 * - SMTP_PORT: SMTP 서버 포트
 * - SMTP_USER: SMTP 사용자명
 * - SMTP_PASS: SMTP 비밀번호
 * - SMTP_FROM: 발신자 이메일
 */
export class EmailProvider {
  private transporter: Transporter | null = null;
  private from: string;

  constructor() {
    this.from = process.env.SMTP_FROM || 'noreply@voyagerss.com';

    if (this.isConfigured()) {
      this.initializeTransporter();
    } else {
      console.warn('Email provider not configured');
    }
  }

  /**
   * 이메일 설정이 완료되었는지 확인
   */
  private isConfigured(): boolean {
    return !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
  }

  /**
   * Nodemailer Transporter 초기화
   */
  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // SSL 사용 여부
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        // 추가 옵션
        tls: {
          rejectUnauthorized: false // 자체 서명 인증서 허용
        }
      });

      console.log('Email transporter initialized');
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  /**
   * 이메일 발송
   *
   * @param params 이메일 파라미터
   * @returns 성공 여부
   */
  async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.warn('Email transporter not available, skipping email');
        return false;
      }

      console.log('Sending email:', {
        to: params.to,
        subject: params.subject
      });

      const result = await this.transporter.sendMail({
        from: `"Workschd" <${this.from}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text || this.htmlToText(params.html)
      });

      console.log('Email sent successfully:', {
        messageId: result.messageId,
        to: params.to
      });

      return true;
    } catch (error: any) {
      console.error('Email send error:', {
        message: error.message,
        to: params.to,
        subject: params.subject
      });
      return false;
    }
  }

  /**
   * 여러 수신자에게 동일한 이메일 발송
   *
   * @param recipients 수신자 목록
   * @param subject 제목
   * @param html HTML 본문
   * @returns 발송 결과 목록
   */
  async sendBulkEmails(
    recipients: string[],
    subject: string,
    html: string
  ): Promise<{ to: string; success: boolean }[]> {
    const results = await Promise.all(
      recipients.map(async (to) => {
        const success = await this.sendEmail({ to, subject, html });
        return { to, success };
      })
    );

    return results;
  }

  /**
   * 간단한 HTML to Text 변환
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * 이메일 템플릿 생성 헬퍼
   */
  createEmailTemplate(params: {
    title: string;
    content: string;
    buttonText?: string;
    buttonUrl?: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
  <style>
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #1976d2;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #1976d2;
      color: white !important;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Workschd</h1>
  </div>
  <div class="content">
    <h2>${params.title}</h2>
    <p>${params.content}</p>
    ${
      params.buttonText && params.buttonUrl
        ? `<a href="${params.buttonUrl}" class="button">${params.buttonText}</a>`
        : ''
    }
  </div>
  <div class="footer">
    <p>© 2026 Workschd. All rights reserved.</p>
    <p>이 메일은 발신 전용입니다. 문의사항은 고객센터를 이용해주세요.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.warn('Email transporter not available');
        return false;
      }

      await this.transporter.verify();
      console.log('Email connection test successful');
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}
