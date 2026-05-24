#!/usr/bin/env bash
# One-time droplet prep — no image builds (GHCR + GitHub Actions deploy).
set -euo pipefail

DATA_DIR="${DATA_DIR:-/data/voyagerss}"
REPO_DIR="${REPO_DIR:-/opt/voyagerss}"

echo "==> Installing packages..."
sudo apt-get update -qq
sudo apt-get install -y docker.io docker-compose-plugin nginx git curl

sudo usermod -aG docker "${USER}" || true

echo "==> Creating runtime directory ${DATA_DIR}..."
sudo mkdir -p "${DATA_DIR}/data" "${DATA_DIR}/nginx"
sudo chown -R "${USER}:${USER}" "${DATA_DIR}" || true

if [[ -d "${REPO_DIR}/.git" ]]; then
  bash "${REPO_DIR}/deploy/scripts/install-nginx-site.sh"
else
  echo "Clone repo to ${REPO_DIR} and run: DATA_DIR=${DATA_DIR} bash deploy/scripts/install-nginx-site.sh"
fi

echo ""
echo "==> Next steps:"
echo "  1. Register self-hosted GitHub Actions runner on this droplet"
echo "  2. Set GitHub secret DOTENV_PROD (full backend .env)"
echo "  3. Merge gateway nginx from deploy/nginx/voyagerss.conf (see GATEWAY-NGINX-MERGE-PROMPT.md)"
echo "  4. Configure DO LB + DNS (api.voyagerss.com, voyagerss.com)"
echo "  5. Run workflow 'Deploy Production (GHCR)' on main"
