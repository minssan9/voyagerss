import { Job } from 'bullmq';
import { IssueStatus, RunStatus } from '@prisma/client-aipr';
import {
  cloneRepo,
  cleanupWorkdir,
  getRepoTree,
  getRecentLog,
} from '../agent/github-client';
import { runPlan } from '../agent/claude-runner';
import { aiprPrisma as prisma } from '../../../config/prisma';
import { logBroadcaster } from '../services/LogBroadcaster';

export interface PlanJobData {
  issueId: string;
  runId:   string;
}

export async function planProcessor(job: Job<PlanJobData>): Promise<void> {
  const { issueId, runId } = job.data;

  // 1. Mark run RUNNING
  await prisma.run.update({
    where: { id: runId },
    data:  { status: RunStatus.RUNNING, startedAt: new Date() },
  });

  await prisma.issue.update({
    where: { id: issueId },
    data:  { status: IssueStatus.QUEUED },
  });

  let seq = 0;
  const emit = async (stream: 'stdout' | 'stderr' | 'event', content: string) => {
    const entry = await prisma.runLog.create({
      data: { runId, seq: seq++, stream, content },
    });
    await logBroadcaster.publish(runId, { type: 'log', data: entry });
  };

  try {
    // 2. Fetch issue details
    const issue = await prisma.issue.findUniqueOrThrow({ where: { id: issueId } });
    if (!issue.repoFullName) throw new Error('repoFullName is not set on issue');

    await emit('event', `[plan] Cloning ${issue.repoFullName}…`);

    // 3. Clone repo
    const { workdir } = await cloneRepo(issue.repoFullName, runId);

    const repoTree   = await getRepoTree(workdir);
    const recentLog  = await getRecentLog(workdir);

    await emit('event', `[plan] Repo cloned. ${repoTree.split('\n').length} files.`);

    // 4. Run plan agent
    const planResult = await runPlan(
      { title: issue.title, body: issue.body },
      repoTree,
      recentLog,
      ({ stream, content }) => emit(stream, content),
    );

    // 5. Persist planning_doc
    await prisma.planningDoc.create({
      data: { issueId, version: 1, content: planResult.content },
    });

    // 6. Update run + issue status
    await prisma.run.update({
      where: { id: runId },
      data: {
        status:     RunStatus.SUCCESS,
        finishedAt: new Date(),
        costUsd:    planResult.costUsd,
        claudeSessionId: planResult.sessionId,
      },
    });

    await prisma.issue.update({
      where: { id: issueId },
      data:  { status: IssueStatus.PLAN_READY },
    });

    await emit('event', '[plan] ✅ Plan ready — awaiting admin approval.');

    // 7. Cleanup
    await cleanupWorkdir(runId);

  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Plan job failed: ${msg}`);

    await emit('stderr', `[plan] ❌ Error: ${msg}`);

    await prisma.run.update({
      where: { id: runId },
      data: {
        status:       RunStatus.FAILED,
        finishedAt:   new Date(),
        errorSummary: msg.slice(0, 1000),
      },
    });

    await prisma.issue.update({
      where: { id: issueId },
      data:  { status: IssueStatus.FAILED },
    });

    await cleanupWorkdir(runId).catch(() => {});
    throw err; // let BullMQ handle retry backoff
  } finally {
    await logBroadcaster.publishDone(runId);
  }
}
