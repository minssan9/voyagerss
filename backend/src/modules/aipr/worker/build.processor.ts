import { Job } from 'bullmq';
import { IssueStatus, RunStatus, RunnerMode } from '@prisma/client-aipr';
import { getProviderClient } from '../agent/provider-client';
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

  let client = getProviderClient(null); // default GitHub App; overridden below once issue is loaded

  try {
    const issue = await prisma.issue.findUniqueOrThrow({
      where:   { id: issueId },
      include: {
        planningDocs: { orderBy: { createdAt: 'desc' }, take: 1 },
        repository: { include: { provider: true } },
      },
    });
    client = getProviderClient(issue.repository?.provider ?? null);

    if (!issue.repoFullName) throw new Error('repoFullName not set');
    if (!issue.planningDocs[0]) throw new Error('No planning doc found');

    const planContent = issue.planningDocs[0].content;
    const slug = issue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const branchName = `feat/issue-${issueId.slice(0, 8)}-${slug}`;

    await emit('event', `[build] Cloning ${issue.repoFullName}…`);
    const { workdir, git } = await client.cloneRepo(
      issue.repoFullName!,
      issue.repository?.webUrl ?? '',
      runId,
    );

    // Store branch name
    await prisma.run.update({ where: { id: runId }, data: { branchName } });

    await client.createBranch(git, branchName);
    await emit('event', `[build] Branch ${branchName} created.`);

    // Run build agent
    const buildResult = await runBuild(
      issue.repository?.buildRunner ?? RunnerMode.CLI,
      workdir,
      planContent,
      runId,
      ({ stream, content }) => emit(stream, content),
    );

    if (!buildResult.success) {
      throw new Error(buildResult.errorSummary ?? 'Build agent failed');
    }

    // Push + create PR. Auto-pilot-originated builds open as draft since no
    // admin reviewed the plan before the build ran; manually-approved builds
    // keep the existing non-draft behavior.
    const draft = issue.repository?.autoPilot === true;
    await emit('event', `[build] Pushing branch and creating ${draft ? 'draft ' : ''}PR…`);
    const { prNumber, prUrl, headSha } = await client.pushAndCreate(
      workdir,
      issue.repoFullName!,
      issue.repository?.webUrl ?? '',
      branchName,
      issue.baseBranch,
      `[Auto-PR] ${issue.title}`,
      `Automated implementation via Auto-PR platform.\n\nIssue ID: ${issueId}\nRun ID: ${runId}`,
      draft,
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
    await client.cleanupWorkdir(runId);

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

    await client.cleanupWorkdir(runId).catch(() => {});
    throw err;
  } finally {
    await logBroadcaster.publishDone(runId);
  }
}
