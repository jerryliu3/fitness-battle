#!/usr/bin/env bash
# Python env for live Anny mesh/rig export, pose previews and mesh generation.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/body-pipeline/.venv"
REQ="$ROOT/body-pipeline/requirements.txt"

if [[ ! -d "$VENV" ]]; then
  echo "Creating $VENV"
  python3 -m venv "$VENV"
fi

PIP="$VENV/bin/pip"
PY="$VENV/bin/python3"
if [[ ! -x "$PIP" ]]; then
  PIP="$VENV/Scripts/pip.exe"
  PY="$VENV/Scripts/python.exe"
fi

"$PIP" install -r "$REQ"
echo "OK — preview uses: $PY"
"$PY" -c "import matplotlib, anny; print('matplotlib + anny importable')"
