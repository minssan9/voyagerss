# Installs Cursor user hooks + Claude Code global policy from this repo folder.
# Run from repo root:  .\meta\dotfiles\cursor-harness\install.ps1
# Or from this dir:    .\install.ps1

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$cursorHome = Join-Path $env:USERPROFILE ".cursor"
$hooksDir = Join-Path $cursorHome "hooks"
$harnessDir = Join-Path $cursorHome "harness"
$claudeHome = Join-Path $env:USERPROFILE ".claude"

New-Item -ItemType Directory -Force -Path $hooksDir | Out-Null
New-Item -ItemType Directory -Force -Path $harnessDir | Out-Null
New-Item -ItemType Directory -Force -Path $claudeHome | Out-Null

Copy-Item -Force (Join-Path $here "hooks.json") (Join-Path $cursorHome "hooks.json")
Copy-Item -Force (Join-Path $here "hooks\harness.mjs") (Join-Path $hooksDir "harness.mjs")
Copy-Item -Force (Join-Path $here "harness-policy.md") (Join-Path $hooksDir "harness-policy.md")
Copy-Item -Force (Join-Path $here "harness-policy.md") (Join-Path $claudeHome "CLAUDE.md")

Write-Host "Installed:"
Write-Host "  $($cursorHome)\hooks.json"
Write-Host "  $($hooksDir)\harness.mjs"
Write-Host "  $($hooksDir)\harness-policy.md"
Write-Host "  $($claudeHome)\CLAUDE.md"
Write-Host ""
Write-Host "Optional strict prompt gate: New-Item -ItemType File -Force '$harnessDir\strict-gate.txt'"
Write-Host "Restart Cursor if hooks do not load. Hooks output: View -> Output -> Hooks"
