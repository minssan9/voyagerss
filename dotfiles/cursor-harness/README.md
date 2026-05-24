# Cursor + Claude Code harness

- **`hooks.json`** — user-level Cursor hooks (`sessionStart`, `stop`, optional strict `beforeSubmitPrompt`).
- **`hooks/harness.mjs`** — Node implementation; reads **`harness-policy.md`** from the same directory as the script (after install: `~/.cursor/hooks/`).
- **`harness-policy.md`** — shared policy text for Cursor `additional_context` and Claude Code `~/.claude/CLAUDE.md`.

## Install

**Windows (PowerShell):**

```powershell
.\dotfiles\cursor-harness\install.ps1
```

**macOS / Linux:**

```bash
chmod +x dotfiles/cursor-harness/install.sh
./dotfiles/cursor-harness/install.sh
```

Restart Cursor. Confirm hooks under **View → Output → Hooks**.

## Options

| Goal | Action |
|------|--------|
| Strict prompt gate | Create empty file `%USERPROFILE%\.cursor\harness\strict-gate.txt` (Windows) or `~/.cursor/harness/strict-gate.txt` (Unix). Prompts must include `TEST PLAN:`, `### Tests`, or `### PLAN_FOR_SIDE_TERMINAL`. |
| Skip tests on agent stop | Set env `HARNESS_SKIP_STOP_TESTS=1` (e.g. in shell profile) — rarely needed. |

Requires **Node.js** on `PATH` for `node ./hooks/harness.mjs`.
