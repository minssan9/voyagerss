#!/bin/bash
set -e

echo "[CodeDeploy] Stopping existing application..."

APP_DIR="/home/ec2-user/voyagerss/backend"

if command -v pm2 &> /dev/null; then
  pm2 stop voyagerss-backend 2>/dev/null || true
  pm2 delete voyagerss-backend 2>/dev/null || true
  echo "[CodeDeploy] PM2 process stopped"
else
  echo "[CodeDeploy] PM2 not found, skipping stop"
fi
