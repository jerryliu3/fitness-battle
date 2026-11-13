#!/usr/bin/env bash
# Pin Anny runtime + variant trees to origin/main assets (immune to MPFB regen).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REF="${1:-origin/main}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$ROOT" archive "$REF" apps/web/public/bodies/meshes apps/web/public/bodies/pointclouds \
  | tar -x -C "$TMP"
VARIANT="$ROOT/body-pipeline/variants/anny"
PUBLIC="$ROOT/apps/web/public/bodies/anny"
mkdir -p "$VARIANT/meshes" "$PUBLIC/meshes"
rm -rf "$VARIANT/pointclouds" "$PUBLIC/pointclouds"
cp -a "$TMP/apps/web/public/bodies/pointclouds" "$VARIANT/"
cp -a "$TMP/apps/web/public/bodies/meshes/"* "$VARIANT/meshes/"
cp -a "$VARIANT/pointclouds" "$PUBLIC/"
cp -a "$VARIANT/meshes/"* "$PUBLIC/meshes/"
echo "Restored anny from $REF -> $VARIANT and $PUBLIC"
