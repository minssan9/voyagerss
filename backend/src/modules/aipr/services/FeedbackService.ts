import { Issue, IssueStatus } from '@prisma/client-aipr';
import { aiprPrisma as prisma } from '../../../config/prisma';

export interface CreateFeedbackDto {
  title: string;
  body: string;
  reporterEmail?: string;
  sourceUrl?: string;
  repoFullName?: string;
  baseBranch: string;
  labels?: Record<string, any>;
  attachmentS3Keys?: { s3Key: string; mime: string; size: number }[];
}

export class FeedbackService {
  async create(dto: CreateFeedbackDto, userAgent?: string): Promise<Issue> {
    const { attachmentS3Keys, ...rest } = dto;

    const issue = await prisma.issue.create({
      data: {
        title: rest.title,
        body: rest.body,
        reporterEmail: rest.reporterEmail ?? null,
        sourceUrl: rest.sourceUrl ?? null,
        repoFullName: rest.repoFullName ?? null,
        baseBranch: rest.baseBranch,
        userAgent: userAgent ?? null,
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
    return prisma.issue.findUnique({
      where: { id },
      include: { attachments: true },
    });
  }

  async transitionStatus(id: string, to: IssueStatus): Promise<Issue> {
    const issue = await prisma.issue.findUniqueOrThrow({ where: { id } });

    const allowed = TRANSITIONS[issue.status];
    if (!allowed?.includes(to)) {
      throw new Error(`Cannot transition from ${issue.status} to ${to}`);
    }

    return prisma.issue.update({ where: { id }, data: { status: to } });
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

export const feedbackService = new FeedbackService();
