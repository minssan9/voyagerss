import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { aiprConfigService } from '../../../config/aipr-config-service';
import type {
  AgentBuildInput,
  AgentPlanInput,
  AgentProvider,
  BuildResult,
  LogCallback,
  LogLine,
  PlanResult,
} from './types';

const BRIDGE_SCRIPT = path.join(__dirname, 'omp-bun-bridge.ts');

function resolveBunPath(): string {
  const candidates = [
    process.env.BUN_PATH,
    path.join(os.homedir(), '.bun', 'bin', 'bun'),
    '/opt/homebrew/bin/bun',
    'bun',
  ].filter(Boolean) as string[];
  return candidates[0]!;
}

function buildOmpEnv(): Record<string, string | undefined> {
  return {
    ANTHROPIC_API_KEY: aiprConfigService.get('ANTHROPIC_API_KEY'),
    AIPR_OMP_MODEL: aiprConfigService.get('AIPR_OMP_MODEL'),
    AIPR_OMP_THINKING_LEVEL: aiprConfigService.get('AIPR_OMP_THINKING_LEVEL', 'off'),
    AIPR_OMP_MAX_TURNS: aiprConfigService.get('AIPR_OMP_MAX_TURNS', '40'),
  };
}

async function runBunBridge<T>(
  command: 'plan' | 'build' | 'test',
  input: unknown,
  onLog: LogCallback,
): Promise<T> {
  const bun = resolveBunPath();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aipr-omp-'));
  const inputPath = path.join(tmpDir, 'input.json');
  const outputPath = path.join(tmpDir, 'output.json');

  await fs.writeFile(inputPath, JSON.stringify({ input, env: buildOmpEnv() }), 'utf8');

  return new Promise<T>((resolve, reject) => {
    const args =
      command === 'test'
        ? [BRIDGE_SCRIPT, 'test', inputPath, outputPath]
        : [BRIDGE_SCRIPT, command, inputPath, outputPath];

    const child = spawn(bun, args, {
      cwd: path.resolve(__dirname, '../../../../..'),
      env: { ...process.env, ...buildOmpEnv() },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const parsed = JSON.parse(trimmed) as {
          type?: string;
          stream?: LogLine['stream'];
          content?: string;
          meta?: LogLine['meta'];
          result?: T;
          message?: string;
        };
        if (parsed.type === 'log' && parsed.stream && parsed.content != null) {
          void onLog({ stream: parsed.stream, content: parsed.content, meta: parsed.meta });
          return;
        }
        if (parsed.type === 'result' && parsed.result !== undefined) {
          resolve(parsed.result);
          return;
        }
        if (parsed.type === 'error') {
          reject(new Error(parsed.message ?? 'OMP bridge error'));
        }
      } catch {
        void onLog({ stream: 'stderr', content: trimmed });
      }
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split('\n')) handleLine(line);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (err) => {
      fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      reject(new Error(`Failed to spawn Bun (${bun}): ${err.message}. Install: curl -fsSL https://bun.sh/install | bash`));
    });

    child.on('close', async (code) => {
      try {
        if (code !== 0) {
          reject(new Error(stderr.trim() || `OMP bridge exited with code ${code}`));
          return;
        }
        const raw = await fs.readFile(outputPath, 'utf8');
        resolve(JSON.parse(raw) as T);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    });
  });
}

export class OmpSdkProvider implements AgentProvider {
  readonly id = 'omp_sdk' as const;

  async runPlan(input: AgentPlanInput, onLog: LogCallback): Promise<PlanResult> {
    return runBunBridge<PlanResult>('plan', input, onLog);
  }

  async runBuild(input: AgentBuildInput, onLog: LogCallback): Promise<BuildResult> {
    return runBunBridge<BuildResult>('build', input, onLog);
  }
}

export const ompSdkProvider = new OmpSdkProvider();

export async function testOmpProvider(workdir: string, onLog: LogCallback): Promise<void> {
  await runBunBridge<{ ok: true }>('test', { workdir }, onLog);
}
