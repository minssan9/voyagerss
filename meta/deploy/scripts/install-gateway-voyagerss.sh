#!/usr/bin/env bash
# Install Voyagerss server blocks into Docker gateway nginx (/data/gateway).
# Default upstream: voyagerss containers on shared en9door_net.
set -euo pipefail

GATEWAY_DIR="${GATEWAY_DIR:-/data/gateway}"
VOYAGERSS_API_UPSTREAM="${VOYAGERSS_API_UPSTREAM:-voyagerss-backend:9002}"
VOYAGERSS_FE_UPSTREAM="${VOYAGERSS_FE_UPSTREAM:-voyagerss-frontend:80}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SOURCE_FILE="${NGINX_SOURCE_FILE:-${REPO_ROOT}/meta/deploy/nginx/gateway-conf.d-voyagerss.conf}"
TARGET_FILE="${GATEWAY_DIR}/nginx/conf.d/voyagerss.conf"

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "Missing nginx source: ${SOURCE_FILE}" >&2
  exit 1
fi

if [[ ! -d "${GATEWAY_DIR}/nginx/conf.d" ]]; then
  echo "Gateway conf.d not found: ${GATEWAY_DIR}/nginx/conf.d" >&2
  echo "Ensure /data/gateway stack is deployed (see en9door gateway README)." >&2
  exit 1
fi

mkdir -p "${GATEWAY_DIR}/nginx/conf.d"
sed -e "s/__VOYAGERSS_API_UPSTREAM__/${VOYAGERSS_API_UPSTREAM}/g" \
    -e "s/__VOYAGERSS_FE_UPSTREAM__/${VOYAGERSS_FE_UPSTREAM}/g" \
    "${SOURCE_FILE}" > "${TARGET_FILE}"
echo "Installed ${TARGET_FILE} (api=${VOYAGERSS_API_UPSTREAM}, fe=${VOYAGERSS_FE_UPSTREAM})"

OVERRIDE_FILE="${GATEWAY_DIR}/docker-compose.voyagerss.override.yml"
if [[ ! -f "${OVERRIDE_FILE}" ]] || ! grep -q 'en9door_net' "${OVERRIDE_FILE}" 2>/dev/null; then
  cat > "${OVERRIDE_FILE}" <<'EOF'
services:
  nginx:
    networks:
      - en9door_net

networks:
  en9door_net:
    external: true
EOF
  echo "Created ${OVERRIDE_FILE} (gateway nginx → en9door_net)"
fi

COMPOSE_ARGS=(-f docker-compose.yml -f docker-compose.voyagerss.override.yml)

cd "${GATEWAY_DIR}"
sudo docker compose "${COMPOSE_ARGS[@]}" up -d

sudo docker compose "${COMPOSE_ARGS[@]}" exec -T nginx nginx -t
sudo docker compose "${COMPOSE_ARGS[@]}" exec -T nginx nginx -s reload
echo "Gateway nginx reloaded."

echo ""
echo "Verify:"
echo "  curl -fsS -H \"Host: api.voyagerss.com\" http://127.0.0.1/health"
echo "  curl -fsS -o /dev/null -w \"FE %{http_code}\\n\" -H \"Host: voyagerss.com\" http://127.0.0.1/"
