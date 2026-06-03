import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { IssueStatus, Prisma, RunKind, RunStatus } from '@prisma/client-aipr';
import { Queue } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import { FeedbackService } from '../feedback/feedback.service';
import type { IssueListQueryDto, PatchIssueDto } from './admin.dto';

// Audit action constants — keep in sync with AuditLog.action column (max 100 chars)
export const AUDIT_ACTIONS = {
  STATUS_TRANSITION: (to: IssueStatus) => `STATUS_TRANSITION:${to}`,
  APPROVE:          'APPROVE',            // TRIAGED → QUEUED  (plan enqueued)
  START_BUILD:      'START_BUILD',        // PLAN_READY → BUILDING  (build enqueued)
  CANCEL:           'CANCEL',             // any → CLOSED
  RETRY:            'RETRY',              // FAILED → QUEUED  (plan re-enqueued)
  ISSUE_PATCH:      'ISSUE_PATCH',        // metadata-only edit (no status change)
} as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma:          PrismaService,
    private readonly feedbackService: FeedbackService,
    @InjectQueue('plan')  private readonly planQueue:  Queue,
    @InjectQueue('build') private readonly buildQueue: Queue,
  ) {}

  async listIssues(query: IssueListQueryDto) {
    const { status, page = 1, limit = 20 } = query;
    const where: Prisma.IssueWhereInput = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { attachments: true, _count: { select: { runs: true } } },
      }),
      this.prisma.issue.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getIssue(id: string) {
    return this.prisma.issue.findUniqueOrThrow({
      where: { id },
      include: {
        attachments: true,
        planningDocs: { orderBy: { createdAt: 'desc' } },
        runs: { orderBy: { createdAt: 'desc' } },
        pullRequests: true,
      },
    });
  }

  async patchIssue(id: string, dto: PatchIssueDto, adminId: string) {
    if (dto.status) {
      const prevIssue = await this.prisma.issue.findUniqueOrThrow({ where: { id } });
      const issue = await this.feedbackService.transitionStatus(id, dto.status as IssueStatus);

      // Derive semantic action from the target status
      const semanticAction = this.resolveAction(dto.status as IssueStatus);

      let runId: string | undefined;

      // Enqueue BullMQ jobs based on transition
      if (dto.status === IssueStatus.QUEUED) {
        const run = await this.prisma.run.create({
          data: { issueId: id, kind: RunKind.PLAN, status: RunStatus.PENDING },
        });
        runId = run.id;
        await this.planQueue.add('plan', { issueId: id, runId });
      }

      if (dto.status === IssueStatus.BUILDING) {
        const run = await this.prisma.run.create({
          data: { issueId: id, kind: RunKind.BUILD, status: RunStatus.PENDING },
        });
        runId = run.id;
        await this.buildQueue.add('build', { issueId: id, runId });
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

    // Metadata-only patch (e.g., title/body edit) — still audit it
    const updated = await this.prisma.issue.update({ where: { id }, data: dto });

    await this.writeAuditLog({
      adminId,
      action: AUDIT_ACTIONS.ISSUE_PATCH,
      target: id,
      metadata: { fields: Object.keys(dto) },
    });

    return updated;
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

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
    await this.prisma.auditLog.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });
  }
}
