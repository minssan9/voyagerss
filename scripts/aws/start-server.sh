#!/bin/bash
set -e

echo "[CodeDeploy] Starting application..."

APP_DIR="/home/ec2-user/voyagerss/backend"
ENV_FILE="/home/ec2-user/voyagerss/.env"

cd "$APP_DIR"

export NODE_ENV=production

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

if ! command -v pm2 &> /dev/null; then
  echo "[CodeDeploy] Installing PM2..."
  npm install -g pm2
fi

pm2 start dist/app.js \
  --name voyagerss-backend \
  --env production \
  --max-memory-restart 512M \
  --log /home/ec2-user/voyagerss/logs/app.log \
  --time

pm2 save

echo "[CodeDeploy] Application started"
