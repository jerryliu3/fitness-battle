#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_URL="${RANKINGS_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54422/postgres}"
for file in "$ROOT/supabase/tests"/*.sql; do
  echo "==> $(basename "$file")"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file"
done
echo "All rankings SQL scenarios passed."
