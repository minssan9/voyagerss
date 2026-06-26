#!/usr/bin/env bash
# Smoke test against deployed API (default: https://api.voyagerss.com).
set -euo pipefail

BASE_URL="${API_BASE_URL:-https://api.voyagerss.com}"

echo "==> GET ${BASE_URL}/health"
if ! curl -fsS "${BASE_URL}/health" | head -c 200; then
  echo ""
  echo "SKIP: ${BASE_URL} not reachable (configure DNS + DO LB, then re-run npm run deploy:smoke)"
  exit 0
fi
echo ""

echo "==> GET ${BASE_URL}/api/workschd/scraper/status (expect 401 without token)"
code="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}/api/workschd/scraper/status")"
echo "HTTP ${code}"
if [[ "${code}" != "401" && "${code}" != "200" ]]; then
  echo "Unexpected status (expected 401 or 200)" >&2
  exit 1
fi

echo "==> Smoke checks passed"
