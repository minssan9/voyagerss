import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { IssueStatus, RunStatus } from '@repo/db';
import { Job } from 'bullmq';

import {
  cloneRepo,
  createBranch,
  pushAndCreatePR,
  cleanupWorkdir,
} from '../agent/github-client';
import { runBuild } from '../agent/claude-runner';
import { PrismaService } from '../prisma/prisma.service';
import { LogBroadcaster } from '../sse/log-broadcaster';

export interface BuildJobData {
  issueId: string;
  runId:   string;
}

@Processor('build')
export class BuildProcessor extends WorkerHost {
  private readonly log = new Logger(BuildProcessor.name);

  constructor(
    private readonly prisma:      PrismaService,
    private readonly broadcaster: LogBroadcaster,
  ) { super(); }

  async process(job: Job<BuildJobData>): Promise<void> {
    const { issueId, runId } = job.data;

    await this.prisma.run.update({
      where: { id: runId },
      data:  { status: RunStatus.RUNNING, startedAt: new Date() },
    });

    await this.prisma.issue.update({
      where: { id: issueId },
      data:  { status: IssueStatus.BUILDING },
    });

    let seq = 0;
    const emit = async (stream: 'stdout' | 'stderr' | 'event', content: string) => {
      const entry = await this.prisma.runLog.create({
        data: { runId, seq: seq++, stream, content },
      });
      await this.broadcaster.publish(runId, { type: 'log', data: entry });
    };

    try {
      const issue = await this.prisma.issue.findUniqueOrThrow({
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
      await this.prisma.run.update({ where: { id: runId }, data: { branchName } });

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
      await this.prisma.pullRequest.create({
        data: { issueId, prNumber, prUrl, state: 'open', headSha },
      });

      await this.prisma.run.update({
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

      await this.prisma.issue.update({
        where: { id: issueId },
        data:  { status: IssueStatus.PR_OPEN },
      });

      await emit('event', `[build] ✅ PR created: ${prUrl}`);
      await cleanupWorkdir(runId);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`Build job failed: ${msg}`);

      await emit('stderr', `[build] ❌ Error: ${msg}`);

      await this.prisma.run.update({
        where: { id: runId },
        data: {
          status:       RunStatus.FAILED,
          finishedAt:   new Date(),
          errorSummary: msg.slice(0, 1000),
        },
      });

      await this.prisma.issue.update({
        where: { id: issueId },
        data:  { status: IssueStatus.FAILED },
      });

      await cleanupWorkdir(runId).catch(() => {});
      throw err;
    } finally {
      await this.broadcaster.publishDone(runId);
    }
  }
}
