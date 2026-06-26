#!/usr/bin/env bash
# Render and sync Voyagerss gateway nginx from meta/deploy/nginx/voyagerss.conf (single source).
#
# INSTALL_MODE=reference-only (default) — copy rendered file to DATA_DIR/nginx only
# INSTALL_MODE=standalone — install voyagerss.conf into /etc/nginx/sites-enabled
#
# VOYAGERSS_UPSTREAM_HOST=127.0.0.1 (default) | host.docker.internal (gateway in Docker)
set -euo pipefail

INSTALL_MODE="${INSTALL_MODE:-reference-only}"
DATA_DIR="${DATA_DIR:-/data/voyagerss}"
VOYAGERSS_UPSTREAM_HOST="${VOYAGERSS_UPSTREAM_HOST:-127.0.0.1}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SOURCE_FILE="${NGINX_SOURCE_FILE:-${REPO_ROOT}/meta/deploy/nginx/voyagerss.conf}"
RENDERED_NAME="voyagerss.conf"
RENDERED_PATH="${DATA_DIR}/nginx/${RENDERED_NAME}"

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "Missing nginx source file: ${SOURCE_FILE}" >&2
  exit 1
fi

mkdir -p "${DATA_DIR}/nginx"
sed "s/__VOYAGERSS_UPSTREAM_HOST__/${VOYAGERSS_UPSTREAM_HOST}/g" "${SOURCE_FILE}" > "${RENDERED_PATH}"
echo "Rendered ${RENDERED_NAME} (upstream=${VOYAGERSS_UPSTREAM_HOST}) -> ${RENDERED_PATH}"

if [[ "${INSTALL_MODE}" == "reference-only" ]]; then
  echo ""
  echo "INSTALL_MODE=reference-only: gateway nginx not modified."
  echo "Merge using: ${REPO_ROOT}/meta/deploy/nginx/GATEWAY-NGINX-MERGE-PROMPT.md"
  exit 0
fi

if [[ "${INSTALL_MODE}" != "standalone" ]]; then
  echo "Unknown INSTALL_MODE=${INSTALL_MODE} (use reference-only or standalone)" >&2
  exit 1
fi

sudo cp "${RENDERED_PATH}" "/etc/nginx/sites-available/${RENDERED_NAME}"
sudo ln -sf "/etc/nginx/sites-available/${RENDERED_NAME}" "/etc/nginx/sites-enabled/${RENDERED_NAME}"
echo "Installed ${RENDERED_NAME}"

sudo nginx -t
sudo systemctl reload nginx
echo "Standalone nginx site enabled."
