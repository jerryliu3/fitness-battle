#!/usr/bin/env bash
set -euo pipefail

# Copy server env vars needed by .github/workflows/hourly-sync.yml into GitHub Actions secrets.
# Usage:
#   bash scripts/sync-cron-secrets-to-github.sh              # pulls production env via Vercel CLI
#   bash scripts/sync-cron-secrets-to-github.sh path/to/.env # reads from an existing .env file

KEYS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  STRAVA_CLIENT_ID
  STRAVA_CLIENT_SECRET
  OURA_CLIENT_ID
  OURA_CLIENT_SECRET
  WHOOP_CLIENT_ID
  WHOOP_CLIENT_SECRET
  EXPO_ACCESS_TOKEN
)

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI is required (https://cli.github.com/)." >&2
  exit 1
fi

TMP_ENV=""
cleanup() {
  if [ -n "$TMP_ENV" ] && [ -f "$TMP_ENV" ]; then
    rm -f "$TMP_ENV"
  fi
}
trap cleanup EXIT

ENV_FILE="${1:-}"
if [ -z "$ENV_FILE" ]; then
  TMP_ENV="$(mktemp /tmp/overtaek-vercel-env.XXXXXX)"
  echo "Pulling production env from Vercel into temporary file (will be deleted on exit)..."
  pnpm dlx vercel env pull "$TMP_ENV" --environment=production --yes
  ENV_FILE="$TMP_ENV"
elif [ ! -f "$ENV_FILE" ]; then
  echo "Error: env file not found: $ENV_FILE" >&2
  exit 1
fi

uploaded=()
missing=()

for key in "${KEYS[@]}"; do
  val="$(node -e '
    const fs = require("node:fs");
    const key = process.argv[1];
    const lines = fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/);
    let found = "";
    for (const line of lines) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || m[1] !== key) continue;
      let v = m[2];
      if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'\''") && v.endsWith("'\''"))) {
        v = v.slice(1, -1);
      }
      found = v;
    }
    process.stdout.write(found);
  ' "$key" "$ENV_FILE")"

  if [ -n "$val" ] && [ "$val" != "[SENSITIVE]" ]; then
    printf '%s' "$val" | gh secret set "$key"
    uploaded+=("$key")
  else
    missing+=("$key")
  fi
done

echo ""
echo "Uploaded to GitHub Actions secrets (${#uploaded[@]}): ${uploaded[*]:-none}"
if [ "${#missing[@]}" -gt 0 ]; then
  echo "Missing/empty in source (${#missing[@]}): ${missing[*]}"
  echo "Set any missing secrets manually with: gh secret set <KEY_NAME>"
fi
