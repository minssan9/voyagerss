# Deploy to DigitalOcean (`api.voyagerss.com` + `voyagerss.com`)

## Runtime layout

| Path | Purpose |
|------|---------|
| `/data/voyagerss/docker-compose.yml` | BE + FE services (from `meta/deploy/docker-compose.prod.yml`) |
| `/data/voyagerss/.env` | Backend secrets (`DOTENV_PROD` GitHub secret) |
| `/data/voyagerss/data/` | Persistent backend data (SQLite scraper, etc.) |
| `/data/voyagerss/nginx/voyagerss.conf` | Rendered gateway config (from `meta/deploy/nginx/voyagerss.conf`) |


## Compose files (repository)

| File | Purpose |
|------|---------|
| [`meta/deploy/docker-compose.yml`](docker-compose.yml) | Local dev: build from source |
| [`meta/deploy/docker-compose.prod.yml`](docker-compose.prod.yml) | Production: GHCR images only (no `build:`) |
| [`.env.production.example`](../../.env.production.example) | Production env template; compose vars `GITHUB_OWNER`, `IMAGE_TAG` in comments |

### Local Docker (from repo root)

```bash
docker compose -f meta/deploy/docker-compose.yml --env-file .env up -d --build
```

Images are built and pushed by [`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml). The droplet receives files via **SSH/SCP** (appleboy) and runs `docker compose pull && up -d` — no self-hosted runner required.

## CI/CD (main push)

| Job | Runner | Action |
|-----|--------|--------|
| `backend-build` / `frontend-build` | `ubuntu-latest` | npm build gate |
| `build-and-push` | `ubuntu-latest` | GHCR image push (BE + FE) |
| `deploy` | `ubuntu-latest` | SSH to Droplet → compose pull/up + health check |

**Trigger:** push to `main`, or manual `workflow_dispatch`.

**GitHub Secrets** (same names as en9door if sharing a Droplet):

| Secret | Purpose |
|--------|---------|
| `DROPLET_HOST` | Droplet IP or hostname |
| `DROPLET_USERNAME` | SSH user |
| `DROPLET_PASSWORD` | Droplet SSH password (preferred; same as en9door) |
| `DROPLET_KEY` | Legacy alias for `DROPLET_PASSWORD` |
| `DOTENV_PROD` | Production backend `.env` (synced each deploy) |
| `GHCR_PULL_TOKEN` | (optional) PAT with `read:packages` if images are private |

## Architecture

- **DNS**: `voyagerss.com`, `api.voyagerss.com` → Droplet **host IP** (A record)
- **Edge L7**: Docker gateway nginx at `/data/gateway` (shared with en9door) — port **80** entry
- **Voyagerss routing** (via `nginx/conf.d/voyagerss.conf`):
  - `api.voyagerss.com` → `host.docker.internal:9002` (BE: `/health`, `/api/`, `/socket.io/`)
  - `voyagerss.com` → `host.docker.internal:9003` (FE SPA)
- **App stack**: `/data/voyagerss/docker-compose.yml` — BE/FE bind `127.0.0.1:9002`, `:9003` on host

### Gateway one-time setup (same Droplet as en9door)

1. Ensure `/data/gateway` stack is running (`en9door_gateway` on :80).

2. Add **host gateway** to gateway compose (`/data/gateway/docker-compose.yml`):

```yaml
services:
  nginx:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

```bash
cd /data/gateway && sudo docker compose up -d
```

3. Install Voyagerss server blocks:

```bash
cd /opt/voyagerss   # or use files under /data/voyagerss/scripts
GATEWAY_DIR=/data/gateway bash meta/deploy/scripts/install-gateway-voyagerss.sh
```

CI deploy runs the same `install-gateway-voyagerss.sh` after each `docker compose up`.

### Host nginx (no Docker gateway)

Use [`meta/deploy/nginx/voyagerss.conf`](nginx/voyagerss.conf) with upstream `127.0.0.1` and `INSTALL_MODE=standalone` — see [`GATEWAY-NGINX-MERGE-PROMPT.md`](nginx/GATEWAY-NGINX-MERGE-PROMPT.md).

## DigitalOcean checklist

1. Droplet (Ubuntu 22.04+, 2 vCPU / 4 GB RAM recommended)
2. Cloud Firewall: SSH from admin IP; HTTP:80 from LB only; **do not** expose 9002/9003
3. Load Balancer: HTTPS:443 → HTTP:80; cert for `api.voyagerss.com` and `voyagerss.com`
4. Health check: HTTP :80, path `/health`, Host `api.voyagerss.com`
5. DNS: `api` and `@` (apex) A records → LB IP

## First-time bootstrap

```bash
git clone https://github.com/minssan9/voyagerss.git /opt/voyagerss
cd /opt/voyagerss
bash meta/deploy/scripts/bootstrap-droplet.sh
```

Merge gateway nginx using the prompt in [`GATEWAY-NGINX-MERGE-PROMPT.md`](nginx/GATEWAY-NGINX-MERGE-PROMPT.md).

Set GitHub secrets (`DROPLET_*`, `DOTENV_PROD`), then push to `main` — **Deploy Production (GHCR)** runs automatically.

Render reference config (default upstream `127.0.0.1`):

```bash
DATA_DIR=/data/voyagerss bash meta/deploy/scripts/install-nginx-site.sh
```

Fresh install without existing gateway:

```bash
INSTALL_MODE=standalone DATA_DIR=/data/voyagerss bash meta/deploy/scripts/install-nginx-site.sh
```

Gateway nginx in Docker (upstream via host):

```bash
VOYAGERSS_UPSTREAM_HOST=host.docker.internal DATA_DIR=/data/voyagerss bash meta/deploy/scripts/install-nginx-site.sh
```

## Environment

- Backend: [`.env.production.example`](../../.env.production.example) → `DOTENV_PROD`
- Frontend build args are set in CI (`VITE_API_*` → `https://api.voyagerss.com`)

Update Google/Kakao OAuth redirect URIs to `https://api.voyagerss.com/api/workschd/auth/.../callback`.

## Verify

```bash
npm run deploy:smoke      # API
npm run deploy:smoke:fe   # Frontend apex
```

On droplet (after gateway merge):

```bash
curl -fsS -H "Host: api.voyagerss.com" http://127.0.0.1/health
curl -fsS -o /dev/null -w "%{http_code}\n" -H "Host: voyagerss.com" http://127.0.0.1/
```


