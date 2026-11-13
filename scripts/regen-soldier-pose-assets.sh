#!/usr/bin/env bash
# Regenerate FK/LBS fixtures and bake Anny point clouds with Soldier defaults.
# Requires: git checkout on cursor/vitals-pose-live-preview-d139 (or equivalent).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VENV_PY="$ROOT/body-pipeline/.venv/bin/python3"
if [[ ! -x "$VENV_PY" ]]; then
  echo "Run once: pnpm bodies:venv" >&2
  exit 1
fi

export PATH="$ROOT/body-pipeline/.venv/bin:$PATH"

"$VENV_PY" body-pipeline/scripts/generate_pose_rig_fixtures.py
pnpm bodies:generate
pnpm bodies:sync

pnpm --filter @fitness-battle/web exec vitest run \
  src/lib/vitals-pose-rig-layout.test.ts \
  src/lib/vitals-pose-arm-presets.test.ts \
  src/app/api/dev/vitals-pose/route.test.ts

echo "OK — commit apps/web/src/lib/__fixtures__/anny-pose-rig.json and any synced assets if needed."
