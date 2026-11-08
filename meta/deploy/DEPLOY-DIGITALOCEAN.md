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

- **DNS**: `voyagerss.com`, `api.voyagerss.com`, `en9door.com` → Droplet **A record** (no DO Load Balancer)
- **Edge L7**: `en9door_gateway` at `/data/gateway` — **HTTP :80** and **HTTPS :443** on the droplet (Let's Encrypt)
- **TLS files**: `nginx/ssl/fullchain.pem` + `privkey.pem` (unified; copy legacy with `cp -L`, not `install -L`)
- **Voyagerss routing** ([`minssan9/en9door`](https://github.com/minssan9/en9door) `gateway/nginx/conf.d/voyagerss*.conf`):
  - `api.voyagerss.com` → `voyagerss-backend:9002` on `en9door-net`
  - `voyagerss.com` → `voyagerss-frontend:80` on `en9door-net`
- **App stack**: `/data/voyagerss/docker-compose.prod.yml` — containers join **`en9door-net`**

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

3. Voyagerss L7 vhosts are versioned in **[`minssan9/en9door`](https://github.com/minssan9/en9door)** under `gateway/nginx/conf.d/voyagerss.conf` (+ `voyagerss-ssl.conf`). Deploy via **gateway-en9door CD** (`release` branch) or rsync `gateway/nginx` to `/data/gateway`.

4. Voyagerss app containers must join Docker network **`en9door-net`** (same as gateway). After gateway deploy, reload from voyagerss:

```bash
GATEWAY_DIR=/data/gateway bash meta/deploy/scripts/install-gateway-voyagerss.sh
```

CI voyagerss deploy runs the same script after `docker compose up` (reload only; does not overwrite gateway conf.d).

### Host nginx (no Docker gateway)

Use [`meta/deploy/nginx/voyagerss.conf`](nginx/voyagerss.conf) with upstream `127.0.0.1` and `INSTALL_MODE=standalone` — see [`GATEWAY-NGINX-MERGE-PROMPT.md`](nginx/GATEWAY-NGINX-MERGE-PROMPT.md).

## DigitalOcean checklist

1. Droplet (Ubuntu 22.04+, 2 vCPU / 4 GB RAM recommended)
2. Cloud Firewall: **:22** (admin), **:80**, **:443** to the internet; **do not** expose app ports `9002`/`9003` publicly
3. **Gateway TLS**: deploy [`minssan9/en9door`](https://github.com/minssan9/en9door) **`release`** → workflow **gateway-en9door CD** (`/data/gateway`)
4. Health: HTTP `GET /health` on gateway (default_server); HTTPS smoke `https://voyagerss.com/`, `https://en9door.com/`
5. DNS: apex + `api` (and `www` as needed) **A** → droplet IP

### Gateway TLS emergency (on droplet)

```bash
cd /data/gateway
cp -L nginx/ssl/en9door/fullchain.pem nginx/ssl/fullchain.pem
cp -L nginx/ssl/en9door/privkey.pem   nginx/ssl/privkey.pem
chmod 0644 nginx/ssl/fullchain.pem && chmod 0600 nginx/ssl/privkey.pem
# enable *-ssl.conf (rename .off → .conf), then: docker compose … exec nginx nginx -t && restart nginx
```

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
curl -fsS http://127.0.0.1/health
curl -fsS -o /dev/null -w "%{http_code}\n" https://voyagerss.com/
curl -fsS -o /dev/null -w "%{http_code}\n" https://api.voyagerss.com/health
```


