import { Job } from 'bullmq';
import { IssueStatus, RunStatus } from '@prisma/client-aipr';
import {
  cloneRepo,
  createBranch,
  pushAndCreatePR,
  cleanupWorkdir,
} from '../agent/github-client';
import { runBuild } from '../agent/claude-runner';
import { aiprPrisma as prisma } from '../../../config/prisma';
import { logBroadcaster } from '../services/LogBroadcaster';

export interface BuildJobData {
  issueId: string;
  runId:   string;
}

export async function buildProcessor(job: Job<BuildJobData>): Promise<void> {
  const { issueId, runId } = job.data;

  await prisma.run.update({
    where: { id: runId },
    data:  { status: RunStatus.RUNNING, startedAt: new Date() },
  });

  await prisma.issue.update({
    where: { id: issueId },
    data:  { status: IssueStatus.BUILDING },
  });

  let seq = 0;
  const emit = async (stream: 'stdout' | 'stderr' | 'event', content: string) => {
    const entry = await prisma.runLog.create({
      data: { runId, seq: seq++, stream, content },
    });
    await logBroadcaster.publish(runId, { type: 'log', data: entry });
  };

  try {
    const issue = await prisma.issue.findUniqueOrThrow({
      where:   { id: issueId },
      include: { planningDocs: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!issue.repoFullName) throw new Error('repoFullName not set');
    if (!issue.planningDocs[0]) throw new Error('No planning doc found');

    const planContent = issue.planningDocs[0].content;
    const slug = issue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const branchName = `feat/issue-${issueId.slice(0, 8)}-${slug}`;

    await emit('event', `[build] Cloning ${issue.repoFullName}…`);
    const { workdir, git } = await cloneRepo(issue.repoFullName, runId);

    // Store branch name
    await prisma.run.update({ where: { id: runId }, data: { branchName } });

    await createBranch(git, branchName);
    await emit('event', `[build] Branch ${branchName} created.`);

    // Run Claude Code CLI
    const buildResult = await runBuild(
      workdir,
      planContent,
      runId,
      ({ stream, content }) => emit(stream, content),
    );

    if (!buildResult.success) {
      throw new Error(buildResult.errorSummary ?? 'Claude Code CLI failed');
    }

    // Push + create PR
    await emit('event', '[build] Pushing branch and creating PR…');
    const { prNumber, prUrl, headSha } = await pushAndCreatePR(
      issue.repoFullName,
      branchName,
      issue.baseBranch,
      `[Auto-PR] ${issue.title}`,
      `Automated implementation via Auto-PR platform.\n\nIssue ID: ${issueId}\nRun ID: ${runId}`,
    );

    // Persist PR record
    await prisma.pullRequest.create({
      data: { issueId, prNumber, prUrl, state: 'open', headSha },
    });

    await prisma.run.update({
      where: { id: runId },
      data: {
        status:     RunStatus.SUCCESS,
        finishedAt: new Date(),
        costUsd:    buildResult.costUsd,
        prNumber,
        prUrl,
        commitSha:  headSha,
      },
    });

    await prisma.issue.update({
      where: { id: issueId },
      data:  { status: IssueStatus.PR_OPEN },
    });

    await emit('event', `[build] ✅ PR created: ${prUrl}`);
    await cleanupWorkdir(runId);

  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Build job failed: ${msg}`);

    await emit('stderr', `[build] ❌ Error: ${msg}`);

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
    throw err;
  } finally {
    await logBroadcaster.publishDone(runId);
  }
}
