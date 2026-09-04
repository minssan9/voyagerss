#!/usr/bin/env bash
# One-time droplet prep — images from GHCR; deploy via GitHub Actions SSH (appleboy).
set -euo pipefail

DATA_DIR="${DATA_DIR:-/data/voyagerss}"
REPO_DIR="${REPO_DIR:-/opt/voyagerss}"

echo "==> Installing packages..."
sudo apt-get update -qq
sudo apt-get install -y docker.io docker-compose-plugin nginx git curl

sudo usermod -aG docker "${USER}" || true

echo "==> Creating runtime directory ${DATA_DIR}..."
sudo mkdir -p "${DATA_DIR}/data" "${DATA_DIR}/nginx" "${DATA_DIR}/scripts"
sudo chown -R "${USER}:${USER}" "${DATA_DIR}" || true

if [[ -d "${REPO_DIR}/.git" ]]; then
  bash "${REPO_DIR}/meta/deploy/scripts/install-nginx-site.sh"
else
  echo "Clone repo to ${REPO_DIR} and run: DATA_DIR=${DATA_DIR} bash meta/deploy/scripts/install-nginx-site.sh"
fi

echo ""
echo "==> Next steps:"
echo "  1. Set GitHub repository secrets (Settings → Secrets → Actions):"
echo "       DROPLET_HOST, DROPLET_USERNAME, DROPLET_KEY"
echo "       DOTENV_PROD (production .env — see .env.production.example)"
echo "  2. Gateway: add extra_hosts host.docker.internal to /data/gateway/docker-compose.yml"
echo "     Then: GATEWAY_DIR=/data/gateway bash meta/deploy/scripts/install-gateway-voyagerss.sh"
echo "  3. Configure DNS (voyagerss.com, api.voyagerss.com → Droplet host IP)"
echo "  4. Push to main — workflow 'Deploy Production (GHCR)' runs CI, build, and SSH deploy"
