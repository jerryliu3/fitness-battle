#!/usr/bin/env bash
# Build MPFB 2.x from source and install into the user's Blender extensions repo.
# Requires: blender on PATH (4.2+; tested with 5.2), git, curl.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TAG="${MPFB2_TAG:-v2.0.18}"
BUILD_DIR="${TMPDIR:-/tmp}/mpfb2-src-$$"
DIST_DIR="${TMPDIR:-/tmp}/mpfb-dist-$$"

if ! command -v blender >/dev/null 2>&1; then
  echo "blender not on PATH. Install via: brew install --cask blender" >&2
  exit 1
fi

BLENDER_VERSION="$(blender --version 2>/dev/null | head -1 | awk '{print $2}')"
MAJOR="${BLENDER_VERSION%%.*}"
MINOR="${BLENDER_VERSION#*.}"
MINOR="${MINOR%%.*}"
if [[ "${MAJOR}" -lt 4 ]] || [[ "${MAJOR}" -eq 4 && "${MINOR}" -lt 2 ]]; then
  echo "Blender ${BLENDER_VERSION} is too old; MPFB2 needs 4.2+." >&2
  exit 1
fi

echo "Blender ${BLENDER_VERSION} — fetching MPFB2 ${TAG}…"
rm -rf "${BUILD_DIR}" "${DIST_DIR}"
git clone --depth 1 --branch "${TAG}" https://github.com/makehumancommunity/mpfb2.git "${BUILD_DIR}"
mkdir -p "${DIST_DIR}"
blender --command extension build --source-dir "${BUILD_DIR}/src/mpfb" --output-dir "${DIST_DIR}"

ZIP="$(ls "${DIST_DIR}"/mpfb-*.zip | head -1)"
mkdir -p "${HOME}/Library/Application Support/Blender/${MAJOR}.${MINOR}/extensions/user_default"
blender --command extension install-file -r user_default -e "${ZIP}"

echo "MPFB2 installed. Verify with:"
echo "  cd \"${ROOT}\" && blender --background --python body-pipeline/scripts/generate_humans_mpfb2.py"
