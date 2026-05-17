import { spawn } from 'child_process';
import { autodevPrisma } from '../../../config/prisma';
import { SseRegistry } from './SseRegistry';

export class ClaudeRunnerService {
  private claudeBin: string;
  private maxTurns: number;

  constructor() {
    this.claudeBin = process.env.AUTODEV_CLAUDE_BIN ?? '/usr/local/bin/claude';
    this.maxTurns = parseInt(process.env.AUTODEV_CLAUDE_MAX_TURNS ?? '30', 10);
  }

  async runAsync(
    jobId: number,
    prompt: string,
    workDir: string,
    tools?: string[],
    maxTurns?: number,
  ): Promise<void> {
    await autodevPrisma.job.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const args: string[] = [
      '--print',
      '--max-turns', String(maxTurns ?? this.maxTurns),
    ];
    if (tools && tools.length > 0) {
      args.push('--allowedTools', tools.join(','));
    }
    args.push(prompt);

    const child = spawn(this.claudeBin, args, { cwd: workDir });

    const saveLog = async (line: string, stream: 'stdout' | 'stderr') => {
      try {
        await autodevPrisma.jobLog.create({
          data: { jobId, line, stream },
        });
      } catch (err) {
        console.error('[ClaudeRunnerService] Failed to save log:', err);
      }
      SseRegistry.send(jobId, line);
    };

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          setImmediate(() => saveLog(line, 'stdout'));
        }
      }
    });

    child.stderr.on('data', (chunk: string) => {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          setImmediate(() => saveLog(line, 'stderr'));
        }
      }
    });

    await new Promise<void>((resolve) => {
      child.on('close', async (code) => {
        const status = code === 0 ? 'SUCCESS' : 'FAILED';
        try {
          await autodevPrisma.job.update({
            where: { id: jobId },
            data: { status, finishedAt: new Date() },
          });
        } catch (err) {
          console.error('[ClaudeRunnerService] Failed to update job status:', err);
        }
        SseRegistry.remove(jobId);
        resolve();
      });
    });
  }

  async triggerIssueImplementation(jobId: number, issueKey: string): Promise<void> {
    const job = await autodevPrisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const issue = await autodevPrisma.issue.findUnique({ where: { issueKey } });
    if (!issue) {
      throw new Error(`Issue ${issueKey} not found`);
    }

    const prompt = [
      `Implement the following issue: ${issueKey}`,
      `Summary: ${issue.summary}`,
      issue.description ? `Description: ${issue.description}` : '',
    ].filter(Boolean).join('\n');

    const workDir = process.cwd();

    // Fire-and-forget — caller does not need to await
    this.runAsync(jobId, prompt, workDir).catch((err) => {
      console.error(`[ClaudeRunnerService] runAsync failed for job ${jobId}:`, err);
    });
  }
}
