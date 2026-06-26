import { Response } from 'express';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { AiprRequest } from '../middleware/auth';
import { AgentProviderFactory } from '../agent/agent-provider-factory';
import { testOmpProvider } from '../agent/omp-runner';
import { claudeCliProvider } from '../agent/claude-cli-provider';

export class AgentController {
  async testProvider(req: AiprRequest, res: Response) {
    const logs: string[] = [];
    const onLog = (line: { stream: string; content: string }) => {
      logs.push(`[${line.stream}] ${line.content}`);
    };

    const providerId = (req.body?.provider as string) || AgentProviderFactory.get().id;
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aipr-agent-test-'));

    try {
      if (providerId === 'omp_sdk') {
        await testOmpProvider(tmpDir, onLog);
      } else {
        await claudeCliProvider.runPlan(
          {
            issue: { title: 'Test', body: 'List 3 files in repo tree only.' },
            repoTree: 'README.md\npackage.json',
            recentLog: 'abc123 init',
            workdir: tmpDir,
          },
          onLog,
        );
      }
      res.json({ success: true, provider: providerId, logs });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        provider: providerId,
        message: err.message,
        logs,
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export const agentController = new AgentController();
