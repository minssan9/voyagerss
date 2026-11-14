import { HttpStatus, Injectable } from '@nestjs/common';
import { I18nHttpException } from '../../common/i18n-http.exception';
import axios from 'axios';
import { workschdPrisma as prisma } from '../../../config/prisma';
import { configService } from '../../../config/config-service';
import { Feedback } from '@prisma/client-workschd';

export type FeedbackType = 'BUG' | 'IMPROVEMENT';

export interface CreateFeedbackInput {
  type?: string;
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

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'REJECTED'];
const SAFE_URL_PATTERN = /^https?:\/\//i;
const FEEDBACK_TYPES: FeedbackType[] = ['BUG', 'IMPROVEMENT'];
const TYPE_LABEL: Record<FeedbackType, string> = { BUG: '불편사항', IMPROVEMENT: '개선사항' };
const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';
const ISSUE_CREATE_MUTATION =
  'mutation FeedbackIssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { identifier url } } }';

@Injectable()
export class FeedbackService {
  async create(accountId: number, input: CreateFeedbackInput): Promise<Feedback> {
    const type = (input.type || 'IMPROVEMENT') as FeedbackType;
    if (!FEEDBACK_TYPES.includes(type)) {
      throw new I18nHttpException('workschd.feedback.invalidType', HttpStatus.BAD_REQUEST, { type });
    }
    if (input.pageUrl && !SAFE_URL_PATTERN.test(input.pageUrl)) {
      throw new I18nHttpException('workschd.feedback.pageUrl', HttpStatus.BAD_REQUEST);
    }

    let fileData: Buffer | undefined;
    if (input.fileBase64) {
      fileData = Buffer.from(input.fileBase64, 'base64');
      if (fileData.length > MAX_ATTACHMENT_BYTES) {
        throw new I18nHttpException('workschd.feedback.attachmentSize', HttpStatus.BAD_REQUEST);
      }
    }

    const feedback = await prisma.feedback.create({
      data: {
        accountId,
        type,
        title: input.title,
        content: input.content,
        pageUrl: input.pageUrl,
        fileName: input.fileName,
        fileMime: input.fileMime,
        fileData,
      },
    });

    void this.notifySlack(feedback);

    // 등록 즉시 Linear 이슈 생성 — 실패해도 등록은 성공으로 처리하고 linear 필드만 비워 둔다.
    const issue = await this.createLinearIssue(feedback);
    if (issue) {
      return prisma.feedback.update({
        where: { id: feedback.id },
        data: { linearIssueId: issue.identifier.slice(0, 64), linearIssueUrl: issue.url.slice(0, 500) },
      });
    }
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
        select: {
          id: true,
          accountId: true,
          type: true,
          title: true,
          content: true,
          pageUrl: true,
          status: true,
          fileName: true,
          fileMime: true,
          linearIssueId: true,
          linearIssueUrl: true,
          createdAt: true,
          updatedAt: true,
          account: { select: { accountId: true, username: true, email: true } },
        },
      }),
      prisma.feedback.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateStatus(id: number, status: string): Promise<Feedback> {
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new I18nHttpException('workschd.feedback.invalidStatus', HttpStatus.BAD_REQUEST, { status });
    }

    const existing = await prisma.feedback.findUnique({ where: { id } });
    if (!existing) throw new I18nHttpException('workschd.feedback.notFound', HttpStatus.NOT_FOUND);

    return prisma.feedback.update({
      where: { id },
      data: { status },
    });
  }

  async getFile(id: number): Promise<{ fileName: string; fileMime: string; fileData: Buffer }> {
    const feedback = await prisma.feedback.findUnique({ where: { id } });
    if (!feedback || !feedback.fileData) throw new I18nHttpException('workschd.feedback.attachmentNotFound', HttpStatus.NOT_FOUND);

    return {
      fileName: feedback.fileName ?? `feedback-${id}`,
      fileMime: feedback.fileMime ?? 'application/octet-stream',
      fileData: Buffer.from(feedback.fileData),
    };
  }

  private async createLinearIssue(feedback: Feedback): Promise<{ identifier: string; url: string } | null> {
    const apiKey = configService.get('LINEAR_API_KEY', '');
    const teamId = configService.get('LINEAR_TEAM_ID', '');
    if (!apiKey || !teamId) return null;

    const type = feedback.type as FeedbackType;
    const labelId = configService.get(type === 'BUG' ? 'LINEAR_BUG_LABEL_ID' : 'LINEAR_IMPROVEMENT_LABEL_ID', '');
    const description = [
      feedback.content,
      '',
      '---',
      `- 유형: ${TYPE_LABEL[type]}`,
      feedback.pageUrl ? `- 페이지: ${feedback.pageUrl}` : '',
      feedback.fileName ? `- 첨부파일: ${feedback.fileName} (관리자 화면에서 다운로드)` : '',
      `- voyagerss feedback #${feedback.id}`,
    ]
      .filter(Boolean)
      .join('\n');
    const input: Record<string, unknown> = {
      teamId,
      title: `[${TYPE_LABEL[type]}] ${feedback.title}`,
      description,
    };
    if (labelId) input.labelIds = [labelId];

    try {
      const { data } = await axios.post(
        LINEAR_GRAPHQL_URL,
        { query: ISSUE_CREATE_MUTATION, variables: { input } },
        { headers: { Authorization: apiKey, 'Content-Type': 'application/json' }, timeout: 10000 },
      );
      const created = data?.data?.issueCreate;
      return created?.success && created.issue ? created.issue : null;
    } catch (err) {
      // Linear 연동 실패가 피드백 등록 자체를 막아서는 안 됨
      return null;
    }
  }

  private async notifySlack(feedback: Feedback): Promise<void> {
    const webhookUrl = configService.get('SLACK_WEBHOOK_URL', '');
    if (!webhookUrl) return;

    try {
      await axios.post(webhookUrl, {
        text: `:loudspeaker: 새로운 ${TYPE_LABEL[feedback.type as FeedbackType] ?? '피드백'}이 접수되었습니다.\n*${feedback.title}*\n${feedback.content}`,
      });
    } catch (err) {
      // Slack 알림 실패가 피드백 등록 자체를 막아서는 안 됨
    }
  }
}
