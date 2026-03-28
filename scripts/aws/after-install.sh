#!/bin/bash
set -e

echo "[CodeDeploy] Running after-install tasks..."

APP_DIR="/home/ec2-user/voyagerss/backend"
ENV_FILE="/home/ec2-user/voyagerss/.env"

cd "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "[CodeDeploy] WARNING: $ENV_FILE not found. Create it with production environment variables."
fi

if [ ! -d "node_modules" ]; then
  echo "[CodeDeploy] node_modules missing, running npm ci..."
  npm ci --omit=dev
fi

echo "[CodeDeploy] After-install complete"
