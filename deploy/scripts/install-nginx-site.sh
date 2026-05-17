#!/usr/bin/env bash
# Sync Voyagerss nginx reference configs and optionally install to sites-enabled.
#
# INSTALL_MODE=reference-only (default) — copy to /data/voyagerss/nginx only; merge manually via GATEWAY-NGINX-MERGE-PROMPT.md
# INSTALL_MODE=standalone — install each *.conf into /etc/nginx/sites-enabled (fresh droplet without existing gateway)
set -euo pipefail

INSTALL_MODE="${INSTALL_MODE:-reference-only}"
DATA_DIR="${DATA_DIR:-/data/voyagerss}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="${NGINX_SOURCE_DIR:-${REPO_ROOT}/deploy/nginx}"

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Missing nginx source dir: ${SOURCE_DIR}" >&2
  exit 1
fi

mkdir -p "${DATA_DIR}/nginx"
shopt -s nullglob
for conf in "${SOURCE_DIR}"/*.conf; do
  cp "${conf}" "${DATA_DIR}/nginx/"
  echo "Synced $(basename "${conf}") -> ${DATA_DIR}/nginx/"
done

if [[ "${INSTALL_MODE}" == "reference-only" ]]; then
  echo ""
  echo "INSTALL_MODE=reference-only: gateway nginx not modified."
  echo "Merge snippets using: ${REPO_ROOT}/deploy/nginx/GATEWAY-NGINX-MERGE-PROMPT.md"
  exit 0
fi

if [[ "${INSTALL_MODE}" != "standalone" ]]; then
  echo "Unknown INSTALL_MODE=${INSTALL_MODE} (use reference-only or standalone)" >&2
  exit 1
fi

for conf in "${DATA_DIR}/nginx"/*.conf; do
  name="$(basename "${conf}")"
  sudo cp "${conf}" "/etc/nginx/sites-available/${name}"
  sudo ln -sf "/etc/nginx/sites-available/${name}" "/etc/nginx/sites-enabled/${name}"
  echo "Installed ${name}"
done

sudo nginx -t
sudo systemctl reload nginx
echo "Standalone nginx sites enabled."
