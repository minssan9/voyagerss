# Deploy to DigitalOcean (`api.voyagerss.com` + `voyagerss.com`)

## Runtime layout

| Path | Purpose |
|------|---------|
| `/data/voyagerss/docker-compose.yml` | BE + FE services (from `deploy/docker-compose.api.yml`) |
| `/data/voyagerss/.env` | Backend secrets (`DOTENV_PROD` GitHub secret) |
| `/data/voyagerss/data/` | Persistent backend data (SQLite scraper, etc.) |
| `/data/voyagerss/nginx/voyagerss.conf` | Rendered gateway config (from `deploy/nginx/voyagerss.conf`) |

Images are built and pushed by [`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml). The droplet only runs `docker compose pull && up -d`.

## Architecture

- **TLS**: DigitalOcean Load Balancer (HTTPS:443 → HTTP:80)
- **Gateway nginx** (existing): merge from single source [`deploy/nginx/voyagerss.conf`](nginx/voyagerss.conf) — do **not** overwrite other vhosts; see [`GATEWAY-NGINX-MERGE-PROMPT.md`](nginx/GATEWAY-NGINX-MERGE-PROMPT.md)
- **Backend**: `127.0.0.1:9002` — `api.voyagerss.com`
- **Frontend**: `127.0.0.1:9003` — `voyagerss.com` (Vue SPA in Docker)

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
bash deploy/scripts/bootstrap-droplet.sh
```

Merge gateway nginx using the prompt in [`GATEWAY-NGINX-MERGE-PROMPT.md`](nginx/GATEWAY-NGINX-MERGE-PROMPT.md).

Register a **self-hosted** GitHub Actions runner, set `DOTENV_PROD`, then run **Deploy Production (GHCR)** on `main`.

Render reference config (default upstream `127.0.0.1`):

```bash
DATA_DIR=/data/voyagerss bash deploy/scripts/install-nginx-site.sh
```

Fresh install without existing gateway:

```bash
INSTALL_MODE=standalone DATA_DIR=/data/voyagerss bash deploy/scripts/install-nginx-site.sh
```

Gateway nginx in Docker (upstream via host):

```bash
VOYAGERSS_UPSTREAM_HOST=host.docker.internal DATA_DIR=/data/voyagerss bash deploy/scripts/install-nginx-site.sh
```

## Environment

- Backend: [`.env.backend.example`](../.env.backend.example) → `DOTENV_PROD`
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
