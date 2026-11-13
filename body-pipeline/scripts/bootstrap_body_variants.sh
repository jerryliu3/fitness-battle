#!/usr/bin/env bash
# Ensure apps/web/public/bodies/{anny,mpfb2} both exist for the Vitals mesh toggle.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC="$ROOT/apps/web/public/bodies"

mkdir -p "$PUBLIC/anny" "$PUBLIC/mpfb2"

if [[ -d "$PUBLIC/meshes" && ! -d "$PUBLIC/anny/meshes" ]]; then
  echo "Moving legacy public/bodies → public/bodies/anny"
  mv "$PUBLIC/meshes" "$PUBLIC/anny/"
  [[ -d "$PUBLIC/pointclouds" ]] && mv "$PUBLIC/pointclouds" "$PUBLIC/anny/"
fi

if [[ -d "$PUBLIC/anny/meshes" && ! -d "$PUBLIC/mpfb2/meshes" ]]; then
  REF="${MPFB2_ASSETS_REF:-origin/followup/mpfb2-body-pipeline}"
  if git -C "$ROOT" rev-parse --verify "$REF^{commit}" >/dev/null 2>&1; then
    echo "Copying MPFB2 assets from $REF"
    TMP="$(mktemp -d)"
    trap 'rm -rf "$TMP"' EXIT
    git -C "$ROOT" archive "$REF" apps/web/public/bodies/pointclouds apps/web/public/bodies/meshes \
      | tar -x -C "$TMP"
    cp -a "$TMP/apps/web/public/bodies/pointclouds" "$PUBLIC/mpfb2/"
    cp -a "$TMP/apps/web/public/bodies/meshes" "$PUBLIC/mpfb2/"
  else
    echo "No MPFB2 ref ($REF); run: pnpm bodies:generate:mpfb2 && pnpm bodies:sync:mpfb2" >&2
  fi
fi

echo "Anny:  $PUBLIC/anny"
echo "MPFB2: $PUBLIC/mpfb2"
