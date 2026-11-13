#!/usr/bin/env bash
# One-shot localhost Vitals Lab (offline auth, no Supabase required).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -f apps/web/.env.local ]]; then
  cp apps/web/.env.demo apps/web/.env.local
  echo "Wrote apps/web/.env.local (demo auth)."
fi
echo "Sign in: alice@example.com / demo (any password 4+ chars)"
echo "Open:    http://localhost:3000/ux/vitals-body"
if [[ ! -x "$ROOT/body-pipeline/.venv/bin/python3" && ! -x "$ROOT/body-pipeline/.venv/Scripts/python.exe" ]]; then
  echo ""
  echo "Note: Live Anny mesh + rig needs Python deps. One-time setup:"
  echo "  bash scripts/ensure-body-pipeline-venv.sh"
fi
exec pnpm dev
