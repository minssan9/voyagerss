import nodemailer, { Transporter } from 'nodemailer';
import { configService } from '../../../../config/config-service';

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailProvider {
  private transporter: Transporter | null = null;
  private transporterConfigSnapshot = '';

  private getSmtpConfig() {
    return {
      host: configService.get('SMTP_HOST'),
      port: configService.get('SMTP_PORT', '587')!,
      user: configService.get('SMTP_USER'),
      pass: configService.get('SMTP_PASS'),
      from: configService.get('SMTP_FROM', 'noreply@voyagerss.com')!,
    };
  }

  private getOrCreateTransporter(): Transporter | null {
    const cfg = this.getSmtpConfig();
    if (!cfg.host || !cfg.user || !cfg.pass) return null;

    const snapshot = JSON.stringify(cfg);
    if (this.transporter && snapshot === this.transporterConfigSnapshot) {
      return this.transporter;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: cfg.host,
        port: parseInt(cfg.port),
        secure: cfg.port === '465',
        auth: { user: cfg.user, pass: cfg.pass },
        tls: { rejectUnauthorized: false },
      });
      this.transporterConfigSnapshot = snapshot;
      console.log('Email transporter initialized');
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      this.transporter = null;
    }

    return this.transporter;
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      const transporter = this.getOrCreateTransporter();
      if (!transporter) {
        console.warn('Email transporter not available, skipping email');
        return false;
      }

      const from = this.getSmtpConfig().from;

      console.log('Sending email:', { to: params.to, subject: params.subject });

      const result = await transporter.sendMail({
        from: `"Workschd" <${from}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text || this.htmlToText(params.html),
      });

      console.log('Email sent successfully:', { messageId: result.messageId, to: params.to });
      return true;
    } catch (error: any) {
      console.error('Email send error:', { message: error.message, to: params.to, subject: params.subject });
      return false;
    }
  }

  async sendBulkEmails(
    recipients: string[],
    subject: string,
    html: string
  ): Promise<{ to: string; success: boolean }[]> {
    return Promise.all(
      recipients.map(async (to) => {
        const success = await this.sendEmail({ to, subject, html });
        return { to, success };
      })
    );
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

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

  async testConnection(): Promise<boolean> {
    try {
      const transporter = this.getOrCreateTransporter();
      if (!transporter) {
        console.warn('Email transporter not available');
        return false;
      }
      await transporter.verify();
      console.log('Email connection test successful');
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}
