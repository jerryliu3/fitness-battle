#!/usr/bin/env bash
# One-shot localhost Vitals Lab (offline auth, no Supabase required).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
cp -f apps/web/.env.demo apps/web/.env.local
echo "Wrote apps/web/.env.local (demo auth)."
echo "Sign in: alice@example.com / demo (any password 4+ chars)"
echo "Open:    http://localhost:3000/ux/vitals-body"
exec pnpm dev
