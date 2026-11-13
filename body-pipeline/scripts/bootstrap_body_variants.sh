#!/usr/bin/env bash
# Restore Anny variant from main; MPFB2 comes from pnpm bodies:generate:mpfb2 && pnpm bodies:sync:mpfb2.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
"$ROOT/body-pipeline/scripts/restore_anny_runtime_from_main.sh" "${1:-origin/main}"
if [[ ! -d "$ROOT/body-pipeline/variants/mpfb2/meshes" ]]; then
  echo "MPFB2 variant missing — run: pnpm bodies:generate:mpfb2 && pnpm bodies:sync:mpfb2" >&2
fi
