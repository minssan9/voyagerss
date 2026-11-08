#!/usr/bin/env bash
# Ensure Voyagerss stacks can reach the shared L7 gateway (en9door-net).
# Nginx vhost definitions live in the en9door repo: gateway/nginx/conf.d/voyagerss*.conf
# Deploy gateway with: en9door .github/workflows/gateway-en9door.yml (release branch).
set -euo pipefail

GATEWAY_DIR="${GATEWAY_DIR:-/data/gateway}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
OVERRIDE_SRC="${REPO_ROOT}/meta/deploy/nginx/gateway-docker-compose.voyagerss.override.yml"
OVERRIDE_DST="${GATEWAY_DIR}/docker-compose.voyagerss.override.yml"

if [[ ! -d "${GATEWAY_DIR}" ]]; then
  echo "Gateway directory not found: ${GATEWAY_DIR}" >&2
  echo "Deploy en9door gateway to /data/gateway first." >&2
  exit 1
fi

if ! sudo docker network inspect en9door-net >/dev/null 2>&1; then
  echo "Docker network en9door-net is missing. Start /data/gateway (en9door stack) first." >&2
  exit 1
fi

if [[ -f "${OVERRIDE_SRC}" ]]; then
  cp "${OVERRIDE_SRC}" "${OVERRIDE_DST}"
  echo "Synced ${OVERRIDE_DST}"
elif [[ ! -f "${OVERRIDE_DST}" ]]; then
  cat > "${OVERRIDE_DST}" <<'EOF'
services:
  nginx:
    extra_hosts:
      - "host.docker.internal:host-gateway"
EOF
  echo "Created ${OVERRIDE_DST} (host.docker.internal for legacy host upstreams)"
fi

COMPOSE_ARGS=(-f docker-compose.yml)
if [[ -f "${OVERRIDE_DST}" ]]; then
  COMPOSE_ARGS+=(-f docker-compose.voyagerss.override.yml)
fi

cd "${GATEWAY_DIR}"
sudo docker compose "${COMPOSE_ARGS[@]}" up -d

if [[ -f "${GATEWAY_DIR}/nginx/conf.d/voyagerss.conf" ]]; then
  sudo docker compose "${COMPOSE_ARGS[@]}" exec -T nginx nginx -t
  sudo docker compose "${COMPOSE_ARGS[@]}" exec -T nginx nginx -s reload
  echo "Gateway nginx reloaded (voyagerss vhosts from conf.d)."
else
  echo "Warning: ${GATEWAY_DIR}/nginx/conf.d/voyagerss.conf missing." >&2
  echo "Merge en9door gateway/nginx (voyagerss.conf) and redeploy gateway CD." >&2
fi

echo ""
echo "Verify:"
echo "  curl -fsS -H \"Host: api.voyagerss.com\" http://127.0.0.1/health"
echo "  curl -fsS -o /dev/null -w \"FE %{http_code}\\n\" -H \"Host: voyagerss.com\" http://127.0.0.1/"
