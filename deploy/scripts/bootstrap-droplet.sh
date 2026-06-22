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

  bash "${REPO_DIR}/deploy/scripts/install-nginx-site.sh"

else

  echo "Clone repo to ${REPO_DIR} and run: DATA_DIR=${DATA_DIR} bash deploy/scripts/install-nginx-site.sh"

fi



echo ""

echo "==> Next steps:"

echo "  1. Set GitHub repository secrets (Settings → Secrets → Actions):"

echo "       DROPLET_HOST, DROPLET_USERNAME, DROPLET_PASSWORD (or DROPLET_KEY)"

echo "       DOTENV_PROD (full backend .env — see .env.backend.example)"

echo "  2. Merge gateway nginx from deploy/nginx/voyagerss.conf (see GATEWAY-NGINX-MERGE-PROMPT.md)"

echo "  3. Configure DO LB + DNS (api.voyagerss.com, voyagerss.com)"

echo "  4. Push to main — workflow 'Deploy Production (GHCR)' runs CI, build, and SSH deploy"

