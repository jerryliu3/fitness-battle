#!/usr/bin/env bash
# Copy generated Vitals body assets into the web public folder (per mesh source).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/body-pipeline/generated"
VARIANT="${1:-${BODY_VARIANT:-anny}}"
DST="$ROOT/apps/web/public/bodies/$VARIANT"
mkdir -p "$DST/meshes"
rm -rf "$DST/pointclouds"
cp -a "$SRC/pointclouds" "$DST/"
cp -a "$SRC/meshes/"*.glb "$DST/meshes/" 2>/dev/null || true
cp -a "$SRC/meshes/"*-vertex-regions.uint8 "$DST/meshes/" 2>/dev/null || true
echo "Synced $VARIANT to $DST"
