#!/bin/bash

# Local Build & Deploy Pipeline Script
# This script mimics the GitHub Action behavior locally.

echo "Stopping existing containers..."
docker-compose down

echo "Building and starting containers in detached mode..."
docker-compose up -d --build

echo "Deployment complete."
echo "Frontend: http://localhost:6171"
echo "Backend: http://localhost:6172"
