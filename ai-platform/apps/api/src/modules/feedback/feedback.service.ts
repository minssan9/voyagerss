import { BadRequestException, Injectable } from '@nestjs/common';
import { Issue, IssueStatus } from '@repo/db';

import { MetricsService } from '../../metrics/metrics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { type CreateFeedbackDto } from './feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma:   PrismaService,
    private readonly metrics:  MetricsService,
  ) {}

  async create(dto: CreateFeedbackDto, userAgent?: string): Promise<Issue> {
    const { attachmentS3Keys, ...rest } = dto;

    this.metrics.feedbackReceived.inc({ status: 'received' });
    const issue = await this.prisma.issue.create({
      data: {
        ...rest,
        userAgent,
        status: IssueStatus.NEW,
        labels: rest.labels ? JSON.stringify(rest.labels) : undefined,
        attachments: attachmentS3Keys?.length
          ? {
              create: attachmentS3Keys.map(({ s3Key, mime, size }) => ({ s3Key, mime, size })),
            }
          : undefined,
      },
    });

    return issue;
  }

  async findById(id: string): Promise<Issue | null> {
    return this.prisma.issue.findUnique({
      where: { id },
      include: { attachments: true },
    });
  }

  async transitionStatus(id: string, to: IssueStatus): Promise<Issue> {
    const issue = await this.prisma.issue.findUniqueOrThrow({ where: { id } });

    const allowed = TRANSITIONS[issue.status];
    if (!allowed?.includes(to)) {
      throw new BadRequestException(
        `Cannot transition from ${issue.status} to ${to}`,
      );
    }

    return this.prisma.issue.update({ where: { id }, data: { status: to } });
  }
}

// Valid forward transitions
const TRANSITIONS: Partial<Record<IssueStatus, IssueStatus[]>> = {
  [IssueStatus.NEW]:        [IssueStatus.TRIAGED, IssueStatus.CLOSED],
  [IssueStatus.TRIAGED]:    [IssueStatus.QUEUED, IssueStatus.CLOSED],
  [IssueStatus.QUEUED]:     [IssueStatus.PLAN_READY, IssueStatus.FAILED, IssueStatus.CLOSED],
  [IssueStatus.PLAN_READY]: [IssueStatus.BUILDING, IssueStatus.CLOSED],
  [IssueStatus.BUILDING]:   [IssueStatus.PR_OPEN, IssueStatus.FAILED, IssueStatus.CLOSED],
  [IssueStatus.PR_OPEN]:    [IssueStatus.MERGED, IssueStatus.CLOSED],
  [IssueStatus.FAILED]:     [IssueStatus.QUEUED],
};
