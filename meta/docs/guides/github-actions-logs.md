# GitHub Actions pipeline logs (gh CLI)

View CI/CD run status and logs from the terminal using [GitHub CLI](https://cli.github.com/).

## Prerequisites

```bash
brew install gh          # macOS
gh auth login            # GitHub.com → HTTPS → browser login
gh auth status           # confirm repo + workflow scopes
```

Required token scope: **`workflow`** (included when you authorize `gh` for Actions).

## Workflows in this repo

| Workflow | File | Triggers |
|----------|------|----------|
| Unified CI | `.github/workflows/ci.yml` | PR to `main`/`dev`, push to `dev` |
| Deploy Production (GHCR) | `.github/workflows/deploy-production.yml` | Push to `main`, manual dispatch |

## Commands (repo root)

```bash
# List recent runs
gh run list --limit 15
gh run list --workflow "Deploy Production (GHCR)" --limit 5
gh run list --workflow "Unified CI" --limit 5

# Inspect a run
gh run view <run-id>              # summary
gh run view <run-id> --log        # full logs
gh run view <run-id> --log-failed # failed steps only
gh run watch <run-id>             # live tail
gh run view <run-id> --web        # open in browser
```

## npm shortcuts

From the monorepo root:

```bash
npm run ci:runs
npm run ci:runs:deploy
npm run ci:runs:ci
npm run ci:logs -- <run-id>   # e.g. npm run ci:logs -- 27948098848
npm run ci:watch -- <run-id>
```

## Related

- [github-runner-guide.md](github-runner-guide.md) — self-hosted runner setup
- [../deploy/DEPLOY-DIGITALOCEAN.md](../../deploy/DEPLOY-DIGITALOCEAN.md) — production deploy
