import { IssueStatus, Prisma, RunKind, RunStatus } from '@prisma/client-aipr';
import { aiprPrisma as prisma } from '../../../config/prisma';
import { feedbackService } from './FeedbackService';
import { planQueue, buildQueue } from '../worker/worker-setup';

export const AUDIT_ACTIONS = {
  STATUS_TRANSITION: (to: IssueStatus) => `STATUS_TRANSITION:${to}`,
  APPROVE:          'APPROVE',            // TRIAGED → QUEUED
  START_BUILD:      'START_BUILD',        // PLAN_READY → BUILDING
  CANCEL:           'CANCEL',             // any → CLOSED
  RETRY:            'RETRY',              // FAILED → QUEUED
  ISSUE_PATCH:      'ISSUE_PATCH',        // metadata-only edit
} as const;

export class AdminService {
  async listIssues(query: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = query;
    const where: Prisma.IssueWhereInput = status ? { status: status as IssueStatus } : {};
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { attachments: true, _count: { select: { runs: true } } },
      }),
      prisma.issue.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getIssue(id: string) {
    return prisma.issue.findUniqueOrThrow({
      where: { id },
      include: {
        attachments: true,
        planningDocs: { orderBy: { createdAt: 'desc' } },
        runs: { orderBy: { createdAt: 'desc' } },
        pullRequests: true,
      },
    });
  }

  async patchIssue(id: string, dto: { status?: string; title?: string; body?: string }, adminId: string) {
    if (dto.status) {
      const prevIssue = await prisma.issue.findUniqueOrThrow({ where: { id } });
      const issue = await feedbackService.transitionStatus(id, dto.status as IssueStatus);

      const semanticAction = this.resolveAction(dto.status as IssueStatus);
      let runId: string | undefined;

      // Enqueue jobs
      if (dto.status === IssueStatus.QUEUED) {
        const run = await prisma.run.create({
          data: { issueId: id, kind: RunKind.PLAN, status: RunStatus.PENDING },
        });
        runId = run.id;
        await planQueue.add('plan', { issueId: id, runId });
      }

      if (dto.status === IssueStatus.BUILDING) {
        const run = await prisma.run.create({
          data: { issueId: id, kind: RunKind.BUILD, status: RunStatus.PENDING },
        });
        runId = run.id;
        await buildQueue.add('build', { issueId: id, runId });
      }

      await this.writeAuditLog({
        adminId,
        action: semanticAction,
        target: id,
        metadata: {
          fromStatus: prevIssue.status,
          toStatus:   dto.status,
          ...(runId ? { runId } : {}),
        },
      });

      return issue;
    }

    // Metadata-only patch
    const { status, ...metadata } = dto;
    const updated = await prisma.issue.update({ where: { id }, data: metadata });

    await this.writeAuditLog({
      adminId,
      action: AUDIT_ACTIONS.ISSUE_PATCH,
      target: id,
      metadata: { fields: Object.keys(metadata) },
    });

    return updated;
  }

  private resolveAction(toStatus: IssueStatus): string {
    switch (toStatus) {
      case IssueStatus.QUEUED:    return AUDIT_ACTIONS.APPROVE;
      case IssueStatus.BUILDING:  return AUDIT_ACTIONS.START_BUILD;
      case IssueStatus.CLOSED:    return AUDIT_ACTIONS.CANCEL;
      default:
        return AUDIT_ACTIONS.STATUS_TRANSITION(toStatus);
    }
  }

  private async writeAuditLog(data: {
    adminId:  string;
    action:   string;
    target:   string;
    metadata: Record<string, unknown>;
  }) {
    await prisma.auditLog.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });
  }
}

export const adminService = new AdminService();
