#!/usr/bin/env bash
# Fail if public runtime copies drift from generated canonical assets.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/body-pipeline/generated"
DST="$ROOT/apps/web/public/bodies"
missing=0
for f in "$SRC/meshes/"*.glb "$SRC/meshes/"*-vertex-regions.uint8; do
  base="$(basename "$f")"
  other="$DST/meshes/$base"
  if [[ ! -f "$other" ]]; then
    echo "Missing public copy: $other"
    missing=1
    continue
  fi
  if ! cmp -s "$f" "$other"; then
    echo "Out of sync: $base (run pnpm bodies:sync)"
    missing=1
  fi
done
for sex in male female; do
  sample="$SRC/pointclouds/$sex/outline-high.vbody"
  if [[ -f "$sample" ]] && ! cmp -s "$sample" "$DST/pointclouds/$sex/outline-high.vbody"; then
    echo "Point clouds out of sync for $sex (run pnpm bodies:sync)"
    missing=1
  fi
done
exit "$missing"
