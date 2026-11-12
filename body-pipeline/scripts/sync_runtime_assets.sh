#!/usr/bin/env bash
# Copy generated Vitals body assets into the web public folder.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/body-pipeline/generated"
DST="$ROOT/apps/web/public/bodies"
mkdir -p "$DST"
mkdir -p "$DST/pointclouds" "$DST/meshes"
rm -rf "$DST/pointclouds"
cp -a "$SRC/pointclouds" "$DST/"
cp -a "$SRC/meshes/"*.glb "$DST/meshes/"
echo "Synced to $DST"
