#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  pnpm db:restore -- --target postgresql://... --input backups/skate5.dump

Restores a custom-format PostgreSQL .dump file into a target database.
The target public schema is dropped and recreated before restore.

Options:
  --target <url>         PostgreSQL URL to restore into.
  --input <path>         Dump file to restore from.
  --yes                  Skip the destructive confirmation prompt.
  --help                 Show this help.
EOF
}

target_url=""
dump_file=""
assume_yes="false"

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
    --target)
      if [[ $# -lt 2 ]]; then
        echo "--target requires a PostgreSQL URL." >&2
        exit 1
      fi
      target_url="$2"
      shift 2
      ;;
    --input)
      if [[ $# -lt 2 ]]; then
        echo "--input requires a path." >&2
        exit 1
      fi
      dump_file="$2"
      shift 2
      ;;
    --yes)
      assume_yes="true"
      shift
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

if [[ -z "$target_url" ]]; then
  echo "--target is required." >&2
  exit 1
fi

if [[ "$target_url" != postgres://* && "$target_url" != postgresql://* ]]; then
  echo "Target URL must start with postgres:// or postgresql://." >&2
  exit 1
fi

if [[ -z "$dump_file" ]]; then
  echo "--input is required." >&2
  exit 1
fi

if [[ ! -f "$dump_file" ]]; then
  echo "Dump file not found: $dump_file" >&2
  exit 1
fi

for command_name in pg_restore psql; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "$command_name is required but was not found on PATH." >&2
    exit 1
  fi
done

echo "About to replace the target PostgreSQL database at:"
echo "  $(mask_database_url "$target_url")"
echo
echo "Dump file:"
echo "  $dump_file"
echo

if [[ "$assume_yes" != "true" ]]; then
  read -r -p "Type 'restore dump' to continue: " confirmation
  if [[ "$confirmation" != "restore dump" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "Resetting target public schema..."
psql "$target_url" \
  --set ON_ERROR_STOP=1 \
  --command "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"

echo "Restoring dump into target database..."
pg_restore \
  --no-owner \
  --no-acl \
  --dbname "$target_url" \
  "$dump_file"

echo "Target database now matches the dump."
