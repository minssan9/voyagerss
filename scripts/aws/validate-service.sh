#!/bin/bash
set -e

echo "[CodeDeploy] Validating service..."

MAX_RETRIES=10
RETRY_INTERVAL=3
HEALTH_URL="http://localhost:${BACKEND_PORT:-9002}/health"

for i in $(seq 1 $MAX_RETRIES); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[CodeDeploy] Service is healthy (HTTP $HTTP_CODE)"
    exit 0
  fi
  echo "[CodeDeploy] Waiting for service... attempt $i/$MAX_RETRIES (HTTP $HTTP_CODE)"
  sleep $RETRY_INTERVAL
done

echo "[CodeDeploy] Service failed health check after $MAX_RETRIES attempts"
exit 1
