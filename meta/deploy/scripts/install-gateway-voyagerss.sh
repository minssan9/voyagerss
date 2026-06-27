#!/usr/bin/env bash
# Install Voyagerss server blocks into Docker gateway nginx (/data/gateway).
# Gateway container must reach host ports 9002/9003 via host.docker.internal.
set -euo pipefail

GATEWAY_DIR="${GATEWAY_DIR:-/data/gateway}"
VOYAGERSS_UPSTREAM_HOST="${VOYAGERSS_UPSTREAM_HOST:-host.docker.internal}"
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
sed "s/__VOYAGERSS_UPSTREAM_HOST__/${VOYAGERSS_UPSTREAM_HOST}/g" "${SOURCE_FILE}" > "${TARGET_FILE}"
echo "Installed ${TARGET_FILE} (upstream=${VOYAGERSS_UPSTREAM_HOST})"

if ! grep -q 'host.docker.internal:host-gateway' "${GATEWAY_DIR}/docker-compose.yml" 2>/dev/null; then
  OVERRIDE_FILE="${GATEWAY_DIR}/docker-compose.voyagerss.override.yml"
  cat > "${OVERRIDE_FILE}" <<'EOF'
services:
  nginx:
    extra_hosts:
      - "host.docker.internal:host-gateway"
EOF
  echo "Created ${OVERRIDE_FILE} (host.docker.internal → host-gateway)"
  COMPOSE_ARGS=(-f docker-compose.yml -f docker-compose.voyagerss.override.yml)
else
  COMPOSE_ARGS=(-f docker-compose.yml)
fi

cd "${GATEWAY_DIR}"
sudo docker compose "${COMPOSE_ARGS[@]}" up -d

sudo docker compose "${COMPOSE_ARGS[@]}" exec -T nginx nginx -t
sudo docker compose "${COMPOSE_ARGS[@]}" exec -T nginx nginx -s reload
echo "Gateway nginx reloaded."

echo ""
echo "Verify:"
echo "  curl -fsS -H \"Host: api.voyagerss.com\" http://127.0.0.1/health"
echo "  curl -fsS -o /dev/null -w \"FE %{http_code}\\n\" -H \"Host: voyagerss.com\" http://127.0.0.1/"
