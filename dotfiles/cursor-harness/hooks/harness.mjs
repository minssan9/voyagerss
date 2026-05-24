#!/usr/bin/env node
/**
 * Cursor user hooks — sessionStart / stop / beforeSubmitPrompt
 * Installed under ~/.cursor/hooks/; cwd for user hooks is ~/.cursor/
 */
import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Repo layout: ../harness-policy.md next to hooks/. After install: policy copied into ~/.cursor/hooks/.
const POLICY_PATH = existsSync(join(__dirname, 'harness-policy.md'))
  ? join(__dirname, 'harness-policy.md')
  : join(__dirname, '..', 'harness-policy.md');
const STRICT_GATE = join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.cursor',
  'harness',
  'strict-gate.txt'
);

function readPolicy() {
  try {
    return readFileSync(POLICY_PATH, 'utf8');
  } catch {
    return (
      '[harness] Missing harness-policy.md next to harness.mjs. Re-run dotfiles/cursor-harness/install script.'
    );
  }
}

function parseStdin() {
  const raw = readFileSync(0, 'utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function out(obj) {
  console.log(JSON.stringify(obj));
}

function detectTestCommand(root) {
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    if (existsSync(join(root, 'pnpm-lock.yaml'))) {
      return 'pnpm test';
    }
    if (existsSync(join(root, 'yarn.lock'))) {
      return 'yarn test';
    }
    return 'npm test';
  }
  if (
    existsSync(join(root, 'pyproject.toml')) ||
    existsSync(join(root, 'pytest.ini')) ||
    existsSync(join(root, 'setup.cfg'))
  ) {
    return 'python -m pytest -q';
  }
  return null;
}

function runTests(root, shellCmd) {
  const env = {
    ...process.env,
    CI: 'true',
    HARNESS_STOP_HOOK: '1',
  };
  return spawnSync(shellCmd, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
    env,
  });
}

function main() {
  const event = process.argv[2];
  const input = parseStdin();

  if (event === 'sessionStart') {
    const harnessRoot = join(
      process.env.USERPROFILE || process.env.HOME || '',
      '.cursor',
      'harness'
    );
    out({
      additional_context: readPolicy(),
      env: {
        HARNESS_ROOT: harnessRoot,
      },
    });
    return;
  }

  if (event === 'beforeSubmitPrompt') {
    if (!existsSync(STRICT_GATE)) {
      out({ continue: true });
      return;
    }
    const prompt = input.prompt || '';
    const ok =
      /TEST PLAN:|### Tests|### PLAN_FOR_SIDE_TERMINAL/i.test(prompt);
    if (!ok) {
      out({
        continue: false,
        user_message:
          'Strict gate: include TEST PLAN:, ### Tests, or ### PLAN_FOR_SIDE_TERMINAL — or delete ~/.cursor/harness/strict-gate.txt',
      });
      return;
    }
    out({ continue: true });
    return;
  }

  if (event === 'stop') {
    if (process.env.HARNESS_SKIP_STOP_TESTS === '1') {
      out({});
      return;
    }
    const roots = input.workspace_roots || [];
    const root = roots[0];
    if (!root || !existsSync(root)) {
      out({});
      return;
    }
    const shellCmd = detectTestCommand(root);
    if (!shellCmd) {
      out({});
      return;
    }
    const result = runTests(root, shellCmd);
    const combined = `${result.stdout || ''}${result.stderr || ''}`;
    const excerpt =
      combined.length > 4000 ? combined.slice(-4000) : combined;
    if (result.status !== 0) {
      out({
        followup_message: `Harness stop-hook: tests failed (${shellCmd}).\n\n${excerpt}`,
      });
      return;
    }
    out({});
    return;
  }

  out({});
}

main();
