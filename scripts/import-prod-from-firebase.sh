#!/usr/bin/env bash
set -euo pipefail

FIREBASE_PROJECT="${FIREBASE_PROJECT:-skate1-test}"
RTDB_INSTANCE="${RTDB_INSTANCE:-skate1-test-default-rtdb}"
EXPORT_DIR="${EXPORT_DIR:-/Users/mpatwardhan/Downloads}"
DATE_STAMP="$(date +%Y-%m-%d-%H%M%S)"
AUTH_JSON="${AUTH_JSON:-$EXPORT_DIR/skate1-auth-users.json}"
RTDB_JSON="${RTDB_JSON:-$EXPORT_DIR/skate1-test-default-rtdb-export-$DATE_STAMP.json}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required."
  echo "Use Railway's public DATABASE_PUBLIC_URL, not postgres.railway.internal."
  exit 1
fi

if [[ "$DATABASE_URL" == *"postgres.railway.internal"* ]]; then
  echo "DATABASE_URL points at Railway's private network host."
  echo "Use Railway's public DATABASE_PUBLIC_URL (*.proxy.rlwy.net) for local imports."
  exit 1
fi

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI not found. Install it with: npm install -g firebase-tools"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found."
  exit 1
fi

mkdir -p "$EXPORT_DIR"

echo "Checking Firebase login..."
if ! firebase login:list >/dev/null 2>&1; then
  firebase login
fi

echo "Exporting Firebase Auth users to $AUTH_JSON..."
firebase auth:export "$AUTH_JSON" \
  --format=json \
  --project "$FIREBASE_PROJECT"

echo "Exporting Realtime Database to $RTDB_JSON..."
firebase database:get / \
  --project "$FIREBASE_PROJECT" \
  --instance "$RTDB_INSTANCE" \
  --output "$RTDB_JSON"

echo "Importing into Postgres with --force..."
pnpm db:import "$RTDB_JSON" \
  --auth-users-json "$AUTH_JSON" \
  --force
