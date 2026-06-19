import Anthropic from '@anthropic-ai/sdk';
import { type ChildProcess, spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RunnerMode } from '@prisma/client-aipr';
import { aiprConfigService } from '../../../config/aipr-config-service';

const execAsync = promisify(exec);

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

// ── Plan dispatcher ───────────────────────────────────────────────────────────
export async function runPlan(
  mode: RunnerMode,
  issue: { title: string; body: string },
  repoTree: string,
  recentLog: string,
  workdir: string,
  onLog: LogCallback,
): Promise<PlanResult> {
  return mode === RunnerMode.CLI
    ? runPlanCli(issue, workdir, onLog)
    : runPlanSdk(issue, repoTree, recentLog, onLog);
}

// ── Plan job: SDK mode (Anthropic streaming Messages API, no tools) ──────────
async function runPlanSdk(
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

  const contentParts: string[] = [];

  const stream = getAnthropicClient().messages.stream({
    model:      'claude-opus-4-8',
    max_tokens: 4096,
    system:     PLAN_SYSTEM,
    messages:   [{ role: 'user', content: userMessage }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      contentParts.push(event.delta.text);
      onLog({ stream: 'stdout', content: event.delta.text });
    }
  }

  const finalMsg = await stream.finalMessage();
  const content = contentParts.join('');

  const inputTokens  = finalMsg.usage.input_tokens;
  const outputTokens = finalMsg.usage.output_tokens;
  // Opus 4: input $15/M, output $75/M
  const costUsd = (inputTokens * 15 + outputTokens * 75) / 1_000_000;

  onLog({ stream: 'event', content: `[plan] Done — ${inputTokens}in/${outputTokens}out tokens, $${costUsd.toFixed(4)}` });

  return { content, costUsd, sessionId: finalMsg.id };
}

// ── Plan job: CLI mode (Claude Code CLI, read-only repo exploration) ─────────
async function runPlanCli(
  issue: { title: string; body: string },
  workdir: string,
  onLog: LogCallback,
): Promise<PlanResult> {
  const prompt = `## Issue
**Title:** ${issue.title}

**Description:**
${issue.body}

---

Explore the repository checked out at the current working directory, then write a concrete implementation plan in Markdown. The plan must include:
1. **Goal** – one-line summary
2. **Files to change** – list with brief reason for each
3. **Steps** – numbered, actionable
4. **Tests** – what tests to add/modify
5. **Risks** – edge cases or breaking-change concerns

Reference actual file paths and function names where possible. Do not modify any files — only read and analyze the repository, then print the plan as your final answer.`;

  onLog({ stream: 'event', content: '[plan] Spawning Claude Code CLI (read-only)…' });

  return new Promise<PlanResult>((resolve, reject) => {
    const proc: ChildProcess = spawn(
      'claude',
      [
        '--print',
        '--output-format', 'stream-json',
        '--verbose',
        '--dangerously-skip-permissions',
        '--max-turns', '20',
        '--allowedTools', 'Read,Grep,Glob',
        prompt,
      ],
      {
        cwd: workdir,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let content = '';
    let costUsd = 0;
    let sessionId: string | undefined;
    const stderrLines: string[] = [];

    proc.stdout?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split('\n').filter(Boolean)) {
        try {
          const obj = JSON.parse(line);
          if (typeof obj.session_id === 'string') sessionId = obj.session_id;
          if (obj.type === 'assistant' && Array.isArray(obj.message?.content)) {
            for (const block of obj.message.content) {
              if (block.type === 'text' && typeof block.text === 'string') content += block.text;
            }
          }
          if (obj.type === 'result') {
            if (typeof obj.result === 'string' && obj.result.trim()) content = obj.result;
            if (typeof obj.total_cost_usd === 'number') costUsd = obj.total_cost_usd;
          }
        } catch {
          // plain text output line, ignore for parsing
        }
        onLog({ stream: 'stdout', content: line });
      }
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trim();
      if (text) {
        stderrLines.push(text);
        onLog({ stream: 'stderr', content: text });
      }
    });

    proc.on('close', (code) => {
      onLog({ stream: 'event', content: `[plan] CLI exit code ${code} — $${costUsd.toFixed(4)}` });
      if (code !== 0 || !content.trim()) {
        reject(new Error(stderrLines.slice(-10).join('\n') || `claude CLI exited with code ${code}`));
        return;
      }
      resolve({ content, costUsd, sessionId });
    });

    proc.on('error', (err) => reject(err));
  });
}

// ── Build dispatcher ──────────────────────────────────────────────────────────
export async function runBuild(
  mode: RunnerMode,
  workdir: string,
  planContent: string,
  runId: string,
  onLog: LogCallback,
): Promise<BuildResult> {
  return mode === RunnerMode.SDK
    ? runBuildSdk(workdir, planContent, runId, onLog)
    : runBuildCli(workdir, planContent, runId, onLog);
}

// ── Build job: CLI mode (Claude Code CLI headless) ────────────────────────────
async function runBuildCli(
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

// ── Build job: SDK mode (Anthropic Messages API + custom tool-use loop) ──────
const BUILD_SDK_MODEL = 'claude-sonnet-4-6';
const BUILD_SDK_MAX_TURNS = 40;

const BUILD_TOOLS: Anthropic.Tool[] = [
  {
    name: 'Read',
    description: 'Read the full contents of a file in the repository.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path relative to the repository root' },
      },
      required: ['path'],
    },
  },
  {
    name: 'Write',
    description: 'Create a file or overwrite it entirely with the given content.',
    input_schema: {
      type: 'object',
      properties: {
        path:    { type: 'string', description: 'Path relative to the repository root' },
        content: { type: 'string', description: 'Full file content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'Edit',
    description: 'Replace a unique, exact occurrence of old_string with new_string in a file.',
    input_schema: {
      type: 'object',
      properties: {
        path:       { type: 'string', description: 'Path relative to the repository root' },
        old_string: { type: 'string', description: 'Exact text to find (must be unique in the file)' },
        new_string: { type: 'string', description: 'Replacement text' },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'Bash',
    description: 'Run a shell command in the repository root and return its stdout/stderr.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
      },
      required: ['command'],
    },
  },
];

function resolveWorkdirPath(workdir: string, relPath: string): string {
  const root     = path.resolve(workdir);
  const resolved = path.resolve(root, relPath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Path escapes repository root: ${relPath}`);
  }
  return resolved;
}

async function executeBuildTool(workdir: string, name: string, input: any): Promise<string> {
  switch (name) {
    case 'Read': {
      const p = resolveWorkdirPath(workdir, input.path);
      return await fs.readFile(p, 'utf8');
    }
    case 'Write': {
      const p = resolveWorkdirPath(workdir, input.path);
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, input.content, 'utf8');
      return `Wrote ${input.content.length} bytes to ${input.path}`;
    }
    case 'Edit': {
      const p = resolveWorkdirPath(workdir, input.path);
      const original = await fs.readFile(p, 'utf8');
      const occurrences = original.split(input.old_string).length - 1;
      if (occurrences === 0) throw new Error(`old_string not found in ${input.path}`);
      if (occurrences > 1) throw new Error(`old_string is not unique in ${input.path} (${occurrences} occurrences)`);
      await fs.writeFile(p, original.replace(input.old_string, input.new_string), 'utf8');
      return `Edited ${input.path}`;
    }
    case 'Bash': {
      try {
        const { stdout, stderr } = await execAsync(input.command, {
          cwd: workdir,
          timeout: 120_000,
          maxBuffer: 10 * 1024 * 1024,
        });
        return `stdout:\n${stdout}\nstderr:\n${stderr}`.slice(0, 8000);
      } catch (err: any) {
        return `Command failed (exit ${err.code}):\nstdout:\n${err.stdout ?? ''}\nstderr:\n${err.stderr ?? err.message}`.slice(0, 8000);
      }
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function runBuildSdk(
  workdir: string,
  planContent: string,
  runId: string,
  onLog: LogCallback,
): Promise<BuildResult> {
  await fs.writeFile(path.join(workdir, 'plan.md'), planContent, 'utf8');

  onLog({ stream: 'event', content: '[build] Running Anthropic SDK tool-use loop…' });

  const client = getAnthropicClient();
  const system = `You are a senior software engineer with Read/Write/Edit/Bash tool access to a git repository checked out at the current working directory. Implement the plan in plan.md. After implementation, run the project's tests via Bash to verify your changes. When finished, commit all changes via Bash using "git add -A && git commit -m "feat: auto-pr implementation for run ${runId}"", then reply with a short summary in text and stop calling tools.`;

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: 'Implement the plan in plan.md, run the tests, and commit the changes.' },
  ];

  let costUsd = 0;

  try {
    for (let turn = 0; turn < BUILD_SDK_MAX_TURNS; turn++) {
      const response = await client.messages.create({
        model:      BUILD_SDK_MODEL,
        max_tokens: 4096,
        system,
        messages,
        tools:      BUILD_TOOLS,
      });

      // Sonnet pricing estimate: input $3/M, output $15/M
      costUsd += (response.usage.input_tokens * 3 + response.usage.output_tokens * 15) / 1_000_000;

      for (const block of response.content) {
        if (block.type === 'text' && block.text.trim()) {
          onLog({ stream: 'stdout', content: block.text });
        }
      }

      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason !== 'tool_use') {
        onLog({ stream: 'event', content: `[build] Agent finished after ${turn + 1} turn(s) — $${costUsd.toFixed(4)}` });
        return { success: true, costUsd };
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        onLog({ stream: 'event', content: `[build] ${block.name}(${JSON.stringify(block.input).slice(0, 200)})` });
        try {
          const result = await executeBuildTool(workdir, block.name, block.input as any);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        } catch (err: any) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${err.message}`, is_error: true });
        }
      }
      messages.push({ role: 'user', content: toolResults });
    }

    const errorSummary = `Exceeded max turns (${BUILD_SDK_MAX_TURNS}) without completion`;
    onLog({ stream: 'stderr', content: `[build] ${errorSummary}` });
    return { success: false, costUsd, errorSummary };
  } catch (err: any) {
    const errorSummary = err instanceof Error ? err.message : String(err);
    onLog({ stream: 'stderr', content: `[build] SDK loop error: ${errorSummary}` });
    return { success: false, costUsd, errorSummary };
  }
}
