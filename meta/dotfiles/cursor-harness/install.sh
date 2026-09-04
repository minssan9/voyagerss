#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURSOR_HOME="${HOME}/.cursor"
HOOKS_DIR="${CURSOR_HOME}/hooks"
HARNESS_DIR="${CURSOR_HOME}/harness"
CLAUDE_HOME="${HOME}/.claude"

mkdir -p "$HOOKS_DIR" "$HARNESS_DIR" "$CLAUDE_HOME"

install -m 0644 "$HERE/hooks.json" "${CURSOR_HOME}/hooks.json"
install -m 0755 "$HERE/hooks/harness.mjs" "${HOOKS_DIR}/harness.mjs"
install -m 0644 "$HERE/harness-policy.md" "${HOOKS_DIR}/harness-policy.md"
install -m 0644 "$HERE/harness-policy.md" "${CLAUDE_HOME}/CLAUDE.md"

echo "Installed:"
echo "  ${CURSOR_HOME}/hooks.json"
echo "  ${HOOKS_DIR}/harness.mjs"
echo "  ${HOOKS_DIR}/harness-policy.md"
echo "  ${CLAUDE_HOME}/CLAUDE.md"
echo ""
echo "Optional strict gate: touch ${HARNESS_DIR}/strict-gate.txt"
echo "Restart Cursor if hooks do not load."
