import Anthropic from '@anthropic-ai/sdk';
import { type ChildProcess, spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PlanResult {
  content:  string;       // plan.md markdown
  costUsd:  number;
  sessionId?: string;
}

export interface BuildResult {
  success:  boolean;
  costUsd:  number;
  errorSummary?: string;
}

export type LogLine = {
  stream: 'stdout' | 'stderr' | 'event';
  content: string;
};

export type LogCallback = (line: LogLine) => void;

// ── Anthropic client ──────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLAN_SYSTEM = `You are a senior software engineer. Given a user's feedback/issue and the repository context, write a concrete implementation plan in Markdown.

The plan must include:
1. **Goal** – one-line summary
2. **Files to change** – list with brief reason for each
3. **Steps** – numbered, actionable
4. **Tests** – what tests to add/modify
5. **Risks** – edge cases or breaking-change concerns

Ref actual file paths and function names where possible.`;

// ── Plan job (Anthropic Messages API) ────────────────────────────────────────
export async function runPlan(
  issue: { title: string; body: string },
  repoTree: string,
  recentLog: string,
  onLog: LogCallback,
): Promise<PlanResult> {
  onLog({ stream: 'event', content: '[plan] Calling Anthropic API…' });

  const userMessage = `## Issue
**Title:** ${issue.title}

**Description:**
${issue.body}

---

## Repository context

### File tree (truncated)
\`\`\`
${repoTree}
\`\`\`

### Recent git log
\`\`\`
${recentLog}
\`\`\`

Write the implementation plan now.`;

  const response = await anthropic.messages.create({
    model:      'claude-opus-4-6',
    max_tokens: 4096,
    system:     PLAN_SYSTEM,
    messages:   [{ role: 'user', content: userMessage }],
  });

  const content = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as Anthropic.TextBlock).text)
    .join('\n');

  const inputTokens  = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  // Rough cost estimate: Opus input $15/M, output $75/M
  const costUsd = (inputTokens * 15 + outputTokens * 75) / 1_000_000;

  onLog({ stream: 'event', content: `[plan] Done — ${inputTokens}in/${outputTokens}out tokens, $${costUsd.toFixed(4)}` });

  return { content, costUsd, sessionId: response.id };
}

// ── Build job (Claude Code CLI headless) ──────────────────────────────────────
export async function runBuild(
  workdir: string,
  planContent: string,
  runId: string,
  onLog: LogCallback,
): Promise<BuildResult> {
  const planPath = path.join(workdir, 'plan.md');
  await fs.writeFile(planPath, planContent, 'utf8');

  onLog({ stream: 'event', content: '[build] Spawning Claude Code CLI…' });

  return new Promise<BuildResult>((resolve) => {
    const proc: ChildProcess = spawn(
      'claude',
      [
        '--print',
        '--dangerously-skip-permissions',
        '--max-turns', '40',
        '--allowedTools', 'Edit,Write,Bash',
        `Please implement the plan in plan.md. After implementation, run tests to verify. Commit all changes with message "feat: auto-pr implementation for run ${runId}".`,
      ],
      {
        cwd: workdir,
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
            costUsd += (i * 3 + o * 15) / 1_000_000; // Sonnet pricing estimate
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
      onLog({ stream: 'event', content: `[build] Exit code ${code} — $${costUsd.toFixed(4)}` });
      resolve({ success, costUsd, errorSummary });
    });

    proc.on('error', (err) => {
      errorSummary = err.message;
      onLog({ stream: 'stderr', content: `[build] Spawn error: ${err.message}` });
      resolve({ success: false, costUsd: 0, errorSummary });
    });
  });
}
