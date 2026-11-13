#!/usr/bin/env bash
# Copy variant body assets into apps/web/public/bodies/<variant>/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VARIANT="${1:-${BODY_VARIANT:-anny}}"
SRC="$ROOT/body-pipeline/variants/$VARIANT"
DST="$ROOT/apps/web/public/bodies/$VARIANT"
if [[ ! -d "$SRC/meshes" ]]; then
  echo "Missing $SRC/meshes — run the matching pnpm bodies:generate* pipeline first." >&2
  exit 1
fi
mkdir -p "$DST/meshes"
rm -rf "$DST/pointclouds"
cp -a "$SRC/pointclouds" "$DST/"
cp -a "$SRC/meshes/"*.glb "$DST/meshes/" 2>/dev/null || true
cp -a "$SRC/meshes/"*-vertex-regions.uint8 "$DST/meshes/" 2>/dev/null || true
echo "Synced $VARIANT to $DST"
