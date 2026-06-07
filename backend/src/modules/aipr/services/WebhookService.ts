import { IssueStatus, PrState } from '@prisma/client-aipr';
import { aiprPrisma as prisma } from '../../../config/prisma';

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

interface MergeRequestPayload {
  object_kind: string;
  object_attributes: {
    iid:              number;
    url:              string;
    state:            string; // opened | closed | locked | merged
    merge_commit_sha: string | null;
    last_commit:      { id: string };
  };
  project: { path_with_namespace: string };
}

export class WebhookService {
  async handlePullRequest(payload: PullRequestPayload): Promise<void> {
    const { action, pull_request: pr, repository } = payload;

    console.log(`GitHub PR event: ${action} #${pr.number} in ${repository.full_name}`);

    const existing = await prisma.pullRequest.findFirst({
      where: {
        prNumber: pr.number,
        issue: { repoFullName: repository.full_name },
      },
      include: { issue: true },
    });

    if (!existing) {
      console.warn(`No matching pull_request found for #${pr.number} in ${repository.full_name}`);
      return;
    }

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
      await prisma.pullRequest.update({
        where: { id: existing.id },
        data:  { headSha: pr.head.sha, lastEventAt: new Date() },
      });
      return;
    }

    await prisma.pullRequest.update({
      where: { id: existing.id },
      data: {
        state:       prState,
        headSha:     pr.head.sha,
        mergedAt:    pr.merged_at ? new Date(pr.merged_at) : null,
        lastEventAt: new Date(),
      },
    });

    await prisma.issue.update({
      where: { id: existing.issueId },
      data:  { status: issueStatus },
    });

    console.log(`Issue ${existing.issueId} → ${issueStatus}`);
  }

  async handleMergeRequest(payload: MergeRequestPayload): Promise<void> {
    const { object_attributes: mr, project } = payload;

    console.log(`GitLab MR event: state=${mr.state} iid=${mr.iid} in ${project.path_with_namespace}`);

    const existing = await prisma.pullRequest.findFirst({
      where: {
        prNumber: mr.iid,
        issue: { repoFullName: project.path_with_namespace },
      },
      include: { issue: true },
    });

    if (!existing) {
      console.warn(`No matching pull_request found for MR !${mr.iid} in ${project.path_with_namespace}`);
      return;
    }

    let prState: PrState;
    let issueStatus: IssueStatus;

    if (mr.state === 'merged') {
      prState     = PrState.merged;
      issueStatus = IssueStatus.MERGED;
    } else if (mr.state === 'closed') {
      prState     = PrState.closed;
      issueStatus = IssueStatus.CLOSED;
    } else if (mr.state === 'opened') {
      prState     = PrState.open;
      issueStatus = IssueStatus.PR_OPEN;
    } else {
      await prisma.pullRequest.update({
        where: { id: existing.id },
        data:  { headSha: mr.last_commit.id, lastEventAt: new Date() },
      });
      return;
    }

    await prisma.pullRequest.update({
      where: { id: existing.id },
      data: {
        state:       prState,
        headSha:     mr.last_commit.id,
        mergedAt:    mr.state === 'merged' ? new Date() : null,
        lastEventAt: new Date(),
      },
    });

    await prisma.issue.update({
      where: { id: existing.issueId },
      data:  { status: issueStatus },
    });

    console.log(`Issue ${existing.issueId} → ${issueStatus}`);
  }
}

export const webhookService = new WebhookService();
