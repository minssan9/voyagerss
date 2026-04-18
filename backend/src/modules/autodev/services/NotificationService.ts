import axios from 'axios';
import { autodevPrisma } from '../../../config/prisma';

export class NotificationService {
  private slackWebhookUrl: string;

  constructor() {
    this.slackWebhookUrl = process.env.AUTODEV_SLACK_WEBHOOK_URL ?? '';
  }

  private async sendSlack(message: string): Promise<boolean> {
    if (!this.slackWebhookUrl) {
      console.warn('[NotificationService] No Slack webhook configured — skipping');
      return false;
    }
    try {
      await axios.post(this.slackWebhookUrl, { text: message });
      return true;
    } catch (err: any) {
      console.error('[NotificationService] Slack send failed:', err?.response?.data ?? err.message);
      return false;
    }
  }

  private async saveNotification(channel: string, message: string, success: boolean): Promise<void> {
    try {
      await autodevPrisma.notification.create({
        data: { channel, message, success, sentAt: success ? new Date() : null },
      });
    } catch (err) {
      console.error('[NotificationService] Failed to save notification record:', err);
    }
  }

  async sendMergeComplete(issueKey: string, prTitle: string, mergedBy: string): Promise<void> {
    const message = `:white_check_mark: PR merged for *${issueKey}*\n*${prTitle}*\nMerged by: ${mergedBy}`;
    const success = await this.sendSlack(message);
    await this.saveNotification('slack', message, success);
  }

  async sendPrDeclined(issueKey: string): Promise<void> {
    const message = `:x: PR declined for *${issueKey}* — issue reopened`;
    const success = await this.sendSlack(message);
    await this.saveNotification('slack', message, success);
  }

  async sendJobFailed(issueKey: string, errorSummary: string): Promise<void> {
    const message = `:warning: Job failed for *${issueKey}*\n${errorSummary}`;
    const success = await this.sendSlack(message);
    await this.saveNotification('slack', message, success);
  }
}
