#!/usr/bin/env bash
# Fail if public runtime copies drift from variant canonical assets.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VARIANT="${1:-${BODY_VARIANT:-anny}}"
SRC="$ROOT/body-pipeline/variants/$VARIANT"
DST="$ROOT/apps/web/public/bodies/$VARIANT"
missing=0
for f in "$SRC/meshes/"*.glb "$SRC/meshes/"*-vertex-regions.uint8; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  other="$DST/meshes/$base"
  if [[ ! -f "$other" ]]; then
    echo "Missing public copy: $other"
    missing=1
    continue
  fi
  if ! cmp -s "$f" "$other"; then
    echo "Out of sync: $base in $VARIANT (run pnpm bodies:sync:$VARIANT)"
    missing=1
  fi
done
for sex in male female; do
  sample="$SRC/pointclouds/$sex/outline-high.vbody"
  if [[ -f "$sample" ]] && ! cmp -s "$sample" "$DST/pointclouds/$sex/outline-high.vbody"; then
    echo "Point clouds out of sync for $sex in $VARIANT"
    missing=1
  fi
done
exit "$missing"
