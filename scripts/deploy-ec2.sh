#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/rag-system}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

cd "$APP_DIR"

echo "==> Pull latest code"
git pull origin main

echo "==> Rebuild and restart containers"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build -d

echo "==> Container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo "==> Health check"
curl -fsS "http://127.0.0.1/backend/health"
echo
echo "Deploy finished successfully."
