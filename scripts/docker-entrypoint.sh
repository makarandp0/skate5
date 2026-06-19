#!/bin/sh
set -e

# Run migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  node packages/api/dist/db/migrate.js
fi

# Start the server
exec node packages/api/dist/server.js
