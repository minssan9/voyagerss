import { autodevPrisma } from '../../../config/prisma';
import { JiraService } from './JiraService';
import { NotificationService } from './NotificationService';

export class PrMergeService {
  private jiraService: JiraService;
  private notificationService: NotificationService;

  constructor() {
    this.jiraService = new JiraService();
    this.notificationService = new NotificationService();
  }

  async processMerged(payload: any): Promise<void> {
    const pr = payload?.pullrequest ?? payload?.pull_request ?? payload;
    const issueKey = this.extractIssueKey(pr?.title ?? '') ?? this.extractIssueKey(pr?.source?.branch?.name ?? '');

    if (!issueKey) {
      console.warn('[PrMergeService] Could not extract issue key from merged PR payload');
      return;
    }

    const prTitle: string = pr?.title ?? '';
    const mergedBy: string = pr?.author?.display_name ?? pr?.merged_by?.login ?? 'unknown';
    const prId: number = pr?.id ?? null;

    // Update issue status
    await autodevPrisma.issue.updateMany({
      where: { issueKey },
      data: { status: 'DONE', completedAt: new Date() },
    });

    // Update latest job for this issue
    const latestJob = await autodevPrisma.job.findFirst({
      where: { issueKey },
      orderBy: { createdAt: 'desc' },
    });
    if (latestJob) {
      await autodevPrisma.job.update({
        where: { id: latestJob.id },
        data: { status: 'MERGED', finishedAt: new Date() },
      });
    }

    // Mark all open todos as resolved
    await autodevPrisma.todo.updateMany({
      where: {
        issue: { issueKey },
        resolved: false,
      },
      data: { resolved: true, resolvedAt: new Date() },
    });

    // Save completion history
    let jiraTransitioned = false;
    let slackNotified = false;

    try {
      await this.jiraService.transitionToDone(issueKey);
      jiraTransitioned = true;
    } catch (err) {
      console.error('[PrMergeService] Jira transition failed:', err);
    }

    try {
      await this.notificationService.sendMergeComplete(issueKey, prTitle, mergedBy);
      slackNotified = true;
    } catch (err) {
      console.error('[PrMergeService] Slack notification failed:', err);
    }

    await autodevPrisma.completionHistory.create({
      data: {
        issueKey,
        prId: prId ? Number(prId) : null,
        prTitle,
        mergedBy,
        mergedAt: new Date(),
        jiraTransitioned,
        slackNotified,
      },
    });

    console.log(`[PrMergeService] processMerged complete for ${issueKey}`);
  }

  async processDeclined(payload: any): Promise<void> {
    const pr = payload?.pullrequest ?? payload?.pull_request ?? payload;
    const issueKey = this.extractIssueKey(pr?.title ?? '') ?? this.extractIssueKey(pr?.source?.branch?.name ?? '');

    if (!issueKey) {
      console.warn('[PrMergeService] Could not extract issue key from declined PR payload');
      return;
    }

    await autodevPrisma.issue.updateMany({
      where: { issueKey },
      data: { status: 'REOPENED' },
    });

    const latestJob = await autodevPrisma.job.findFirst({
      where: { issueKey },
      orderBy: { createdAt: 'desc' },
    });
    if (latestJob) {
      await autodevPrisma.job.update({
        where: { id: latestJob.id },
        data: { status: 'FAILED', finishedAt: new Date() },
      });
    }

    await this.notificationService.sendPrDeclined(issueKey);

    console.log(`[PrMergeService] processDeclined complete for ${issueKey}`);
  }

  async manualComplete(issueKey: string): Promise<void> {
    await autodevPrisma.issue.updateMany({
      where: { issueKey },
      data: { status: 'DONE', completedAt: new Date() },
    });

    await autodevPrisma.todo.updateMany({
      where: { issue: { issueKey }, resolved: false },
      data: { resolved: true, resolvedAt: new Date() },
    });

    await this.jiraService.transitionToDone(issueKey).catch((err) =>
      console.error('[PrMergeService] Jira transition failed on manualComplete:', err),
    );

    await autodevPrisma.completionHistory.create({
      data: {
        issueKey,
        mergedAt: new Date(),
        jiraTransitioned: true,
        slackNotified: false,
      },
    });

    console.log(`[PrMergeService] manualComplete for ${issueKey}`);
  }

  async reopen(issueKey: string): Promise<void> {
    await autodevPrisma.issue.updateMany({
      where: { issueKey },
      data: { status: 'REOPENED', completedAt: null },
    });

    console.log(`[PrMergeService] reopened ${issueKey}`);
  }

  private extractIssueKey(text: string): string | null {
    const match = text.match(/[A-Z]+-\d+/);
    return match ? match[0] : null;
  }
}
