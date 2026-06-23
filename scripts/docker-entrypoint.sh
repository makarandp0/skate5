#!/bin/sh
set -eu

log() {
  printf '%s\n' "$*"
}

fail() {
  printf 'FATAL startup: %s\n' "$*" >&2
  exit 1
}

missing_env=""
for env_name in DATABASE_URL FIREBASE_SERVICE_ACCOUNT_BASE64 FIREBASE_CLIENT_API_KEY FIREBASE_CLIENT_APP_ID; do
  eval "env_value=\${$env_name:-}"
  if [ -z "$env_value" ]; then
    missing_env="${missing_env} ${env_name}"
  fi
done

if [ -n "$missing_env" ]; then
  fail "missing required environment variable(s):${missing_env}. Set them on the Railway service before deploying."
fi

log "Starting Skate5 container"
log "Node: $(node --version)"
log "NODE_ENV: ${NODE_ENV:-unset}"
log "PORT: ${PORT:-unset}"
log "STATIC_PATH: ${STATIC_PATH:-unset}"
log "Commit: ${RAILWAY_GIT_COMMIT_SHA:-${GIT_COMMIT_SHA:-${COMMIT_SHA:-${SOURCE_VERSION:-unknown}}}}"

log "Running database migrations..."
if node packages/api/dist/db/migrate.js; then
  log "Database migrations completed."
else
  status=$?
  printf 'FATAL startup: database migrations failed with exit code %s. Check DATABASE_URL, database reachability, and migration logs above.\n' "$status" >&2
  exit "$status"
fi

log "Starting API server..."
exec node packages/api/dist/server.js
