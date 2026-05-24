import { Injectable, Logger } from '@nestjs/common';
import { IssueStatus, PrState } from '@prisma/client-aipr';

import { PrismaService } from '../../prisma/prisma.service';

interface PullRequestPayload {
  action: string;
  pull_request: {
    number:    number;
    html_url:  string;
    state:     string;
    merged:    boolean;
    head:      { sha: string };
    user:      { login: string };
    merged_at: string | null;
  };
  repository: { full_name: string };
}

@Injectable()
export class WebhooksService {
  private readonly log = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handlePullRequest(payload: PullRequestPayload): Promise<void> {
    const { action, pull_request: pr, repository } = payload;

    this.log.log(`GitHub PR event: ${action} #${pr.number} in ${repository.full_name}`);

    // Find matching pull_request row by prNumber + repoFullName (via issue)
    const existing = await this.prisma.pullRequest.findFirst({
      where: {
        prNumber: pr.number,
        issue: { repoFullName: repository.full_name },
      },
      include: { issue: true },
    });

    if (!existing) {
      this.log.warn(`No matching pull_request found for #${pr.number} in ${repository.full_name}`);
      return;
    }

    // Determine new PR state
    let prState: PrState;
    let issueStatus: IssueStatus;

    if (action === 'closed' && pr.merged) {
      prState     = PrState.merged;
      issueStatus = IssueStatus.MERGED;
    } else if (action === 'closed' && !pr.merged) {
      prState     = PrState.closed;
      issueStatus = IssueStatus.CLOSED;
    } else if (['opened', 'reopened'].includes(action)) {
      prState     = PrState.open;
      issueStatus = IssueStatus.PR_OPEN;
    } else {
      // synchronize / labeled / etc — just update headSha
      await this.prisma.pullRequest.update({
        where: { id: existing.id },
        data:  { headSha: pr.head.sha, lastEventAt: new Date() },
      });
      return;
    }

    // Upsert pull_request row
    await this.prisma.pullRequest.update({
      where: { id: existing.id },
      data: {
        state:       prState,
        headSha:     pr.head.sha,
        mergedAt:    pr.merged_at ? new Date(pr.merged_at) : null,
        lastEventAt: new Date(),
      },
    });

    // Transition issue status
    await this.prisma.issue.update({
      where: { id: existing.issueId },
      data:  { status: issueStatus },
    });

    this.log.log(`Issue ${existing.issueId} → ${issueStatus}`);
  }
}
