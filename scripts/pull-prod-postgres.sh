#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  PROD_DATABASE_URL=postgresql://... pnpm db:pull:prod

Clones the production PostgreSQL database into the local Docker database by
creating a .dump backup and restoring that dump locally.

Environment:
  PROD_DATABASE_URL              Production/public PostgreSQL URL to dump from.
  DATABASE_PUBLIC_URL            Fallback production/public PostgreSQL URL.
  RAILWAY_DATABASE_PUBLIC_URL    Fallback production/public PostgreSQL URL.
  LOCAL_DATABASE_URL             Local PostgreSQL URL to restore into.
                                 Default: postgresql://postgres:postgres@localhost:5434/skate5

Options:
  --source <url>       Production PostgreSQL URL. Overrides environment.
  --target <url>       Local PostgreSQL URL. Overrides LOCAL_DATABASE_URL.
  --dump-file <path>   Write the dump at this path instead of a temp file.
  --keep-dump          Keep the generated dump file.
  --yes                Skip the destructive confirmation prompt.
  --help               Show this help.
EOF
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_url="${PROD_DATABASE_URL:-${DATABASE_PUBLIC_URL:-${RAILWAY_DATABASE_PUBLIC_URL:-}}}"
target_url="${LOCAL_DATABASE_URL:-postgresql://postgres:postgres@localhost:5434/skate5}"
dump_file=""
keep_dump="false"
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
    --source)
      if [[ $# -lt 2 ]]; then
        echo "--source requires a PostgreSQL URL." >&2
        exit 1
      fi
      source_url="$2"
      shift 2
      ;;
    --target)
      if [[ $# -lt 2 ]]; then
        echo "--target requires a PostgreSQL URL." >&2
        exit 1
      fi
      target_url="$2"
      shift 2
      ;;
    --dump-file)
      if [[ $# -lt 2 ]]; then
        echo "--dump-file requires a path." >&2
        exit 1
      fi
      dump_file="$2"
      keep_dump="true"
      shift 2
      ;;
    --keep-dump)
      keep_dump="true"
      shift
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

if [[ -z "$source_url" ]]; then
  echo "PROD_DATABASE_URL is required." >&2
  echo "Use Railway's public DATABASE_PUBLIC_URL, not postgres.railway.internal." >&2
  exit 1
fi

if [[ "$source_url" != postgres://* && "$source_url" != postgresql://* ]]; then
  echo "Production URL must start with postgres:// or postgresql://." >&2
  exit 1
fi

if [[ "$target_url" != postgres://* && "$target_url" != postgresql://* ]]; then
  echo "Local URL must start with postgres:// or postgresql://." >&2
  exit 1
fi

if [[ "$source_url" == *"postgres.railway.internal"* ]]; then
  echo "Production URL points at Railway's private network host." >&2
  echo "Use Railway's public DATABASE_PUBLIC_URL (*.proxy.rlwy.net) from local machines." >&2
  exit 1
fi

if [[ "$source_url" == "$target_url" ]]; then
  echo "Production and local database URLs are identical; aborting." >&2
  exit 1
fi

if [[ -z "$dump_file" ]]; then
  dump_file="$(mktemp "${TMPDIR:-/tmp}/skate5-prod-postgres.XXXXXX")"
fi

cleanup() {
  if [[ "$keep_dump" != "true" && -n "$dump_file" && -f "$dump_file" ]]; then
    rm -f "$dump_file"
  fi
}
trap cleanup EXIT

echo "About to replace the local Skate5 database at:"
echo "  $(mask_database_url "$target_url")"
echo
echo "Source production database:"
echo "  $(mask_database_url "$source_url")"
echo

if [[ "$assume_yes" != "true" ]]; then
  read -r -p "Type 'pull prod' to continue: " confirmation
  if [[ "$confirmation" != "pull prod" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

"$script_dir/dump-postgres.sh" \
  --source "$source_url" \
  --output "$dump_file"

"$script_dir/restore-postgres.sh" \
  --target "$target_url" \
  --dump-file "$dump_file" \
  --yes

echo "Local database now matches the production dump."
if [[ "$keep_dump" == "true" ]]; then
  echo "Dump kept at: $dump_file"
fi
