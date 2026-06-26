/**
 * Bun-only bridge for @oh-my-pi/pi-coding-agent (OMP requires Bun runtime).
 * Invoked from Node via omp-runner.ts — do not import this file from Node.
 *
 * Usage:
 *   bun omp-bun-bridge.ts plan  <input.json> <output.json>
 *   bun omp-bun-bridge.ts build <input.json> <output.json>
 *   bun omp-bun-bridge.ts test  <workdir>
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  createAgentSession,
  discoverAuthStorage,
  ModelRegistry,
  SessionManager,
} from '@oh-my-pi/pi-coding-agent';
import { formatPageContextBlock } from './page-context';
import type { AgentBuildInput, AgentPlanInput, BuildResult, LogLine, PlanResult } from './types';

const PLAN_PROMPT_SUFFIX = `
Write a concrete implementation plan in Markdown with:
1. **Goal** – one-line summary
2. **Files to change** – cite paths with hashline anchors (\`path:LINE#HASH\`) where possible
3. **Steps** – numbered, actionable
4. **Tests** – what tests to add/modify
5. **Risks** – edge cases or breaking-change concerns

Read relevant source files first (hashline-annotated output) before writing the plan.`;

function emit(line: LogLine) {
  process.stdout.write(`${JSON.stringify({ type: 'log', ...line })}\n`);
}

function resolveThinkingLevel(raw?: string): 'off' | 'low' | 'medium' | 'high' | 'xhigh' {
  const allowed = new Set(['off', 'low', 'medium', 'high', 'xhigh']);
  return allowed.has(raw ?? '') ? (raw as 'medium') : 'medium';
}

async function createSession(workdir: string, env: Record<string, string | undefined>) {
  if (env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  }

  const authStorage = await discoverAuthStorage();
  const modelRegistry = new ModelRegistry(authStorage);
  await modelRegistry.refresh();

  const modelPattern = env.AIPR_OMP_MODEL;
  let model = modelPattern
    ? modelRegistry.getAvailable().find((m) => `${m.provider}/${m.id}` === modelPattern || m.id === modelPattern)
    : undefined;
  if (!model) {
    model = modelRegistry.getAvailable().find((m) => m.provider === 'mlx-local') ?? modelRegistry.getAvailable()[0];
  }
  if (!model) {
    throw new Error('No OMP models available — run ~/repository/local-llm/mlx/configure-omp.sh and start MLX server');
  }

  const { session, modelFallbackMessage } = await createAgentSession({
    cwd: workdir,
    authStorage,
    modelRegistry,
    model,
    thinkingLevel: resolveThinkingLevel(env.AIPR_OMP_THINKING_LEVEL),
    sessionManager: SessionManager.inMemory(workdir),
    autoApprove: true,
    hasUI: false,
    enableMCP: false,
  });

  return { session, modelFallbackMessage };
}

function extractTextFromMessage(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const m = message as { role?: string; content?: unknown };
  if (typeof m.content === 'string') return m.content;
  if (Array.isArray(m.content)) {
    return m.content
      .filter((b: { type?: string }) => b?.type === 'text')
      .map((b: { text?: string }) => b.text ?? '')
      .join('');
  }
  return '';
}

function subscribe(session: Awaited<ReturnType<typeof createSession>>['session']) {
  return session.subscribe((event: { type: string; [key: string]: unknown }) => {
    if (event.type === 'message_update') {
      const assistantEvent = event.assistantMessageEvent as { type?: string; delta?: string };
      if (assistantEvent?.type === 'text_delta' && assistantEvent.delta) {
        emit({ stream: 'stdout', content: assistantEvent.delta });
      }
      return;
    }
    if (event.type === 'tool_execution_start') {
      const toolName = String(event.toolName ?? 'tool');
      emit({ stream: 'event', content: `[${toolName}] start` });
      return;
    }
    if (event.type === 'tool_execution_end') {
      const toolName = String(event.toolName ?? 'tool');
      emit({ stream: 'event', content: `[${toolName}] end` });
      if (event.isError) {
        emit({ stream: 'stderr', content: `[${toolName}] error: ${JSON.stringify(event.result)}` });
      }
    }
  });
}

function buildIssueBlock(input: AgentPlanInput): string {
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
\`\`\``;
}

async function runPlan(input: AgentPlanInput, env: Record<string, string | undefined>): Promise<PlanResult> {
  emit({ stream: 'event', content: '[plan] Starting oh-my-pi SDK session…' });
  const { session, modelFallbackMessage } = await createSession(input.workdir, env);
  if (modelFallbackMessage) {
    emit({ stream: 'stderr', content: `[plan] Model fallback: ${modelFallbackMessage}` });
  }
  const unsubscribe = subscribe(session);
  try {
    await session.prompt(`${buildIssueBlock(input)}\n\n${PLAN_PROMPT_SUFFIX}`);
    const lastAssistant = [...session.messages].reverse().find((m) => (m as { role?: string }).role === 'assistant');
    const content = extractTextFromMessage(lastAssistant);
    if (!content.trim()) throw new Error('OMP plan produced empty content');
    const stats = session.getSessionStats();
    return { content, costUsd: stats.cost, sessionId: session.sessionId };
  } finally {
    unsubscribe();
    await session.dispose();
  }
}

async function runBuild(input: AgentBuildInput, env: Record<string, string | undefined>): Promise<BuildResult> {
  const planPath = path.join(input.workdir, 'plan.md');
  await fs.writeFile(planPath, input.planContent, 'utf8');
  emit({ stream: 'event', content: '[build] Starting oh-my-pi SDK (hashline edit)…' });

  const { session, modelFallbackMessage } = await createSession(input.workdir, env);
  if (modelFallbackMessage) {
    emit({ stream: 'stderr', content: `[build] Model fallback: ${modelFallbackMessage}` });
  }
  const unsubscribe = subscribe(session);
  const maxTurns = Number(env.AIPR_OMP_MAX_TURNS ?? '40');

  try {
    const buildPrompt =
      (input.pageContext ? `${formatPageContextBlock(input.pageContext)}\n` : '') +
      `Implement the plan in plan.md. Use hashline edit anchors when modifying files. ` +
      `After implementation, run tests to verify. ` +
      `Commit all changes with message "feat: auto-pr implementation for run ${input.runId}".`;

    let turns = 0;
    let forwarded = await session.prompt(buildPrompt);
    turns++;
    while (forwarded && turns < maxTurns && session.isStreaming) {
      await session.waitForIdle();
      turns++;
    }
    await session.waitForIdle();

    const stats = session.getSessionStats();
    const hasError = Boolean(session.state.error);
    return {
      success: !hasError,
      costUsd: stats.cost,
      sessionId: session.sessionId,
      errorSummary: hasError ? session.state.error : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, costUsd: 0, errorSummary: msg };
  } finally {
    unsubscribe();
    await session.dispose();
  }
}

async function runTest(workdir: string, env: Record<string, string | undefined>) {
  const { session } = await createSession(workdir, env);
  const unsubscribe = subscribe(session);
  try {
    await session.prompt('List up to 3 files in the current directory. Reply briefly.');
    emit({ stream: 'event', content: '[test] OMP provider OK' });
  } finally {
    unsubscribe();
    await session.dispose();
  }
}

async function main() {
  const [command, inputPath, outputPath] = process.argv.slice(2);
  if (!command) {
    console.error('Usage: bun omp-bun-bridge.ts <plan|build|test> <input.json> [output.json]');
    process.exit(1);
  }

  const raw = await fs.readFile(inputPath!, 'utf8');
  const payload = JSON.parse(raw) as {
    input: AgentPlanInput | AgentBuildInput | { workdir: string };
    env: Record<string, string | undefined>;
  };

  let result: PlanResult | BuildResult | { ok: true };
  if (command === 'plan') {
    result = await runPlan(payload.input as AgentPlanInput, payload.env);
  } else if (command === 'build') {
    result = await runBuild(payload.input as AgentBuildInput, payload.env);
  } else if (command === 'test') {
    await runTest((payload.input as { workdir: string }).workdir, payload.env);
    result = { ok: true };
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  if (outputPath) {
    await fs.writeFile(outputPath, JSON.stringify(result), 'utf8');
  }
  process.stdout.write(`${JSON.stringify({ type: 'result', result })}\n`);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${JSON.stringify({ type: 'error', message: msg })}\n`);
  process.exit(1);
});
