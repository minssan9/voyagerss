import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { workschdPrisma as prisma } from '../../../config/prisma';
import { configService } from '../../../config/config-service';
import { Feedback } from '@prisma/client-workschd';

export interface CreateFeedbackInput {
  title: string;
  content: string;
  pageUrl?: string;
  fileName?: string;
  fileMime?: string;
  fileBase64?: string;
}

export interface FeedbackListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class FeedbackService {
  async create(accountId: number, input: CreateFeedbackInput): Promise<Feedback> {
    const feedback = await prisma.feedback.create({
      data: {
        accountId,
        title: input.title,
        content: input.content,
        pageUrl: input.pageUrl,
        fileName: input.fileName,
        fileMime: input.fileMime,
        fileData: input.fileBase64 ? Buffer.from(input.fileBase64, 'base64') : undefined,
      },
    });

    await this.notifySlack(feedback);

    return feedback;
  }

  async findAll(params: FeedbackListParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    const where = params.status ? { status: params.status } : {};

    const [items, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { account: { select: { accountId: true, username: true, email: true } } },
      }),
      prisma.feedback.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateStatus(id: number, status: string): Promise<Feedback> {
    const existing = await prisma.feedback.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Feedback not found');

    return prisma.feedback.update({
      where: { id },
      data: { status },
    });
  }

  async getFile(id: number): Promise<{ fileName: string; fileMime: string; fileData: Buffer }> {
    const feedback = await prisma.feedback.findUnique({ where: { id } });
    if (!feedback || !feedback.fileData) throw new NotFoundException('Attachment not found');

    return {
      fileName: feedback.fileName ?? `feedback-${id}`,
      fileMime: feedback.fileMime ?? 'application/octet-stream',
      fileData: Buffer.from(feedback.fileData),
    };
  }

  private async notifySlack(feedback: Feedback): Promise<void> {
    const webhookUrl = configService.get('SLACK_WEBHOOK_URL', '');
    if (!webhookUrl) return;

    try {
      await axios.post(webhookUrl, {
        text: `:loudspeaker: 새로운 기능 개선 요청이 접수되었습니다.\n*${feedback.title}*\n${feedback.content}`,
      });
    } catch (err) {
      // Slack 알림 실패가 피드백 등록 자체를 막아서는 안 됨
    }
  }
}
