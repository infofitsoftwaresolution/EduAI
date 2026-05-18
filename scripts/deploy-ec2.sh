#!/usr/bin/env bash
set -euo pipefail

# Works whether the repo folder is ~/EduAI, ~/rag-system, or anything else.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

cd "$APP_DIR"
echo "==> Deploy from $APP_DIR"

echo "==> Pull latest code"
if git show-ref --verify --quiet refs/remotes/origin/main; then
  git pull origin main
elif git show-ref --verify --quiet refs/remotes/origin/master; then
  git pull origin master
else
  DEFAULT_BRANCH="$(git remote show origin | sed -n '/HEAD branch/s/.*: //p')"
  if [ -n "$DEFAULT_BRANCH" ]; then
    git pull origin "$DEFAULT_BRANCH"
  else
    echo "ERROR: Could not find origin/main or origin/master. Check git remote and branch name."
    exit 1
  fi
fi

echo "==> Rebuild and restart containers"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build -d

echo "==> Container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo "==> Health check"
curl -fsS "http://127.0.0.1/backend/health"
echo
echo "Deploy finished successfully."
