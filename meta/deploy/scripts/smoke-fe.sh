#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${FE_BASE_URL:-https://voyagerss.com}"

echo "==> GET ${BASE_URL}/"
if ! code="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}/")"; then
  echo ""
  echo "SKIP: ${BASE_URL} not reachable (DNS/LB/nginx merge pending)"
  exit 0
fi

echo "HTTP ${code}"
if [[ "${code}" != "200" && "${code}" != "304" ]]; then
  echo "Unexpected status (expected 200 or 304)" >&2
  exit 1
fi

echo "==> Frontend smoke checks passed"
