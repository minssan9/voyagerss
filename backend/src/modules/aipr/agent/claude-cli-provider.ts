import Anthropic from '@anthropic-ai/sdk';
import { type ChildProcess, spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { aiprConfigService } from '../../../config/aipr-config-service';
import { formatPageContextBlock } from './page-context';
import type {
  AgentBuildInput,
  AgentPlanInput,
  AgentProvider,
  BuildResult,
  LogCallback,
  PlanResult,
} from './types';

function getAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: aiprConfigService.getRequired('ANTHROPIC_API_KEY') });
}

const PLAN_SYSTEM = `You are a senior software engineer. Given a user's feedback/issue and the repository context, write a concrete implementation plan in Markdown.

The plan must include:
1. **Goal** – one-line summary
2. **Files to change** – list with brief reason for each
3. **Steps** – numbered, actionable
4. **Tests** – what tests to add/modify
5. **Risks** – edge cases or breaking-change concerns

Ref actual file paths and function names where possible.`;

function buildPlanUserMessage(input: AgentPlanInput): string {
  const pageBlock = formatPageContextBlock(input.issue.pageContext);
  return `## Issue
**Title:** ${input.issue.title}

**Description:**
${input.issue.body}

${pageBlock}---

## Repository context

### File tree (truncated)
\`\`\`
${input.repoTree}
\`\`\`

### Recent git log
\`\`\`
${input.recentLog}
\`\`\`

Write the implementation plan now.`;
}

export class ClaudeCliProvider implements AgentProvider {
  readonly id = 'claude_cli' as const;

  async runPlan(input: AgentPlanInput, onLog: LogCallback): Promise<PlanResult> {
    onLog({ stream: 'event', content: '[plan] Calling Anthropic API (claude_cli)…' });

    const contentParts: string[] = [];

    const stream = getAnthropicClient().messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: PLAN_SYSTEM,
      messages: [{ role: 'user', content: buildPlanUserMessage(input) }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        contentParts.push(event.delta.text);
        onLog({ stream: 'stdout', content: event.delta.text });
      }
    }

    const finalMsg = await stream.finalMessage();
    const content = contentParts.join('');

    const inputTokens = finalMsg.usage.input_tokens;
    const outputTokens = finalMsg.usage.output_tokens;
    const costUsd = (inputTokens * 15 + outputTokens * 75) / 1_000_000;

    onLog({
      stream: 'event',
      content: `[plan] Done — ${inputTokens}in/${outputTokens}out tokens, $${costUsd.toFixed(4)}`,
      meta: { kind: 'cost' },
    });

    return { content, costUsd, sessionId: finalMsg.id };
  }

  async runBuild(input: AgentBuildInput, onLog: LogCallback): Promise<BuildResult> {
    const planPath = path.join(input.workdir, 'plan.md');
    await fs.writeFile(planPath, input.planContent, 'utf8');

    onLog({ stream: 'event', content: '[build] Spawning Claude Code CLI…' });

    return new Promise<BuildResult>((resolve) => {
      const proc: ChildProcess = spawn(
        'claude',
        [
          '--print',
          '--dangerously-skip-permissions',
          '--max-turns',
          '40',
          '--allowedTools',
          'Edit,Write,Bash',
          `Please implement the plan in plan.md. After implementation, run tests to verify. Commit all changes with message "feat: auto-pr implementation for run ${input.runId}".`,
        ],
        {
          cwd: input.workdir,
          env: { ...process.env },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      let costUsd = 0;
      let errorSummary: string | undefined;
      const stderrLines: string[] = [];

      proc.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        for (const line of text.split('\n').filter(Boolean)) {
          try {
            const obj = JSON.parse(line);
            if (obj?.usage?.input_tokens) {
              const i = obj.usage.input_tokens;
              const o = obj.usage.output_tokens ?? 0;
              costUsd += (i * 3 + o * 15) / 1_000_000;
            }
          } catch {
            // plain text output
          }
          onLog({ stream: 'stdout', content: line });
        }
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8').trim();
        stderrLines.push(text);
        onLog({ stream: 'stderr', content: text });
      });

      proc.on('close', (code) => {
        const success = code === 0;
        if (!success) {
          errorSummary = stderrLines.slice(-10).join('\n') || `Exit code ${code}`;
        }
        onLog({
          stream: 'event',
          content: `[build] Exit code ${code} — $${costUsd.toFixed(4)}`,
          meta: { kind: 'cost' },
        });
        resolve({ success, costUsd, errorSummary });
      });

      proc.on('error', (err) => {
        errorSummary = err.message;
        onLog({ stream: 'stderr', content: `[build] Spawn error: ${err.message}` });
        resolve({ success: false, costUsd: 0, errorSummary });
      });
    });
  }
}

export const claudeCliProvider = new ClaudeCliProvider();
