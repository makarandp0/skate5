#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  SOURCE_DATABASE_URL=postgresql://... pnpm db:dump
  pnpm db:dump -- --source postgresql://... --output backups/skate5.dump

Dumps a PostgreSQL database to a custom-format .dump file.
The dump includes schema, data, indexes, sequences, and migration tables.

Environment:
  SOURCE_DATABASE_URL    PostgreSQL URL to dump from.
  DATABASE_URL           Fallback PostgreSQL URL to dump from.
  PROD_DATABASE_URL      Fallback PostgreSQL URL to dump from.

Options:
  --source <url>         PostgreSQL URL to dump from. Overrides environment.
  --output <path>        Output dump path.
                         Default: backups/skate5-YYYYmmdd-HHMMSS.dump
  --dump-file <path>     Alias for --output.
  --help                 Show this help.
EOF
}

source_url="${SOURCE_DATABASE_URL:-${DATABASE_URL:-${PROD_DATABASE_URL:-}}}"
dump_file=""

mask_database_url() {
  local url="$1"
  local scheme="$url"
  local rest=""
  local credentials=""
  local host=""
  local user=""

  if [[ "$url" != *"://"* || "$url" != *"@"* ]]; then
    echo "$url"
    return
  fi

  scheme="${url%%://*}"
  rest="${url#*://}"
  credentials="${rest%@*}"
  host="${rest#*@}"

  if [[ "$credentials" == *":"* ]]; then
    user="${credentials%%:*}"
    echo "$scheme://$user:***@$host"
    return
  fi

  echo "$scheme://***@$host"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      ;;
    --source)
      if [[ $# -lt 2 ]]; then
        echo "--source requires a PostgreSQL URL." >&2
        exit 1
      fi
      source_url="$2"
      shift 2
      ;;
    --output|--dump-file)
      if [[ $# -lt 2 ]]; then
        echo "$1 requires a path." >&2
        exit 1
      fi
      dump_file="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$source_url" ]]; then
  echo "SOURCE_DATABASE_URL is required." >&2
  exit 1
fi

if [[ "$source_url" != postgres://* && "$source_url" != postgresql://* ]]; then
  echo "Source URL must start with postgres:// or postgresql://." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required but was not found on PATH." >&2
  exit 1
fi

if [[ -z "$dump_file" ]]; then
  mkdir -p backups
  dump_file="backups/skate5-$(date +%Y%m%d-%H%M%S).dump"
else
  dump_dir="$(dirname "$dump_file")"
  if [[ "$dump_dir" != "." ]]; then
    mkdir -p "$dump_dir"
  fi
fi

echo "Dumping PostgreSQL database:"
echo "  $(mask_database_url "$source_url")"
echo
echo "Output:"
echo "  $dump_file"
echo

pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --dbname "$source_url" \
  --file "$dump_file"

echo "Database dump written to $dump_file"
