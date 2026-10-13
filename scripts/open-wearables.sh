#!/usr/bin/env bash
# Clone / start / stop the Open Wearables WHOOP pilot stack.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OW_DIR="${ROOT}/services/open-wearables"
OW_REPO="${OPEN_WEARABLES_REPO:-https://github.com/the-momentum/open-wearables.git}"
OW_REF="${OPEN_WEARABLES_REF:-main}"

compose() {
  if command -v docker >/dev/null 2>&1; then
    if docker compose version >/dev/null 2>&1; then
      docker compose "$@"
      return
    fi
  fi
  if command -v sudo >/dev/null 2>&1 && sudo docker compose version >/dev/null 2>&1; then
    sudo docker compose "$@"
    return
  fi
  echo "docker compose is required" >&2
  exit 1
}

ensure_clone() {
  if [[ -d "${OW_DIR}/.git" ]]; then
    return
  fi
  mkdir -p "${ROOT}/services"
  git clone --depth 1 --branch "${OW_REF}" "${OW_REPO}" "${OW_DIR}"
}

ensure_env() {
  if [[ ! -f "${OW_DIR}/backend/config/.env" ]]; then
    cp "${OW_DIR}/backend/config/.env.example" "${OW_DIR}/backend/config/.env"
  fi
  if [[ ! -f "${OW_DIR}/frontend/.env" ]]; then
    cp "${OW_DIR}/frontend/.env.example" "${OW_DIR}/frontend/.env"
  fi
  # Host ports that avoid Fitness Battle web (3000) and typical local Postgres (5432).
  cat > "${OW_DIR}/.env" <<'EOF'
API_PORT=8001
FRONTEND_PORT=3001
DB_PORT=5433
EOF
  # Optional: when Docker bridge blocks container→container TCP (some VMs),
  # hairpin DB/Redis through published host ports.
  if [[ "${OPEN_WEARABLES_HOST_GATEWAY:-0}" == "1" ]]; then
    cp "${ROOT}/scripts/open-wearables.compose.override.yml" "${OW_DIR}/docker-compose.override.yml"
    echo "Installed host-gateway compose override"
  fi
  python3 - <<'PY'
from pathlib import Path
ow = Path("'"${OW_DIR}"'")
p = ow / "backend/config/.env"
text = p.read_text()
# Host publish ports live in services/open-wearables/.env (compose interpolation).
# Inside the containers, Postgres stays on 5432 and the API listens on 8000
# unless the host-gateway override remaps DB/Redis to published host ports.
for old, new in [
    ("API_BASE_URL=http://localhost:8000", "API_BASE_URL=http://localhost:8001"),
    ("FRONTEND_URL=http://localhost:3000", "FRONTEND_URL=http://localhost:3001"),
    ('CORS_ORIGINS=["http://localhost:3000"]', 'CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]'),
    ("SENTRY_ENABLED=True", "SENTRY_ENABLED=False"),
    ("DB_PORT=5433", "DB_PORT=5432"),
    ("API_PORT=8001", "API_PORT=8000"),
]:
    text = text.replace(old, new)
p.write_text(text)
fe = ow / "frontend/.env"
fe.write_text(fe.read_text().replace("http://localhost:8000", "http://localhost:8001"))
print("Open Wearables env ready (API :8001, portal :3001, db :5433 on host)")
PY
}

cmd="${1:-help}"
case "$cmd" in
  clone)
    ensure_clone
    ensure_env
    echo "Cloned at ${OW_DIR}"
    ;;
  up)
    ensure_clone
    ensure_env
    (cd "${OW_DIR}" && compose up -d --build)
    echo "Waiting for API..."
    for _ in $(seq 1 60); do
      if curl -fsS "http://127.0.0.1:8001/" >/dev/null 2>&1; then
        curl -fsS "http://127.0.0.1:8001/"
        echo
        echo "Portal: http://localhost:3001  (login admin@admin.com / your-secure-password)"
        echo "Create an API key in Settings → Credentials, then set on Fitness Battle:"
        echo "  OPEN_WEARABLES_API_URL=http://localhost:8001"
        echo "  OPEN_WEARABLES_API_KEY=sk-..."
        echo "  OPEN_WEARABLES_WHOOP=true"
        echo "  NEXT_PUBLIC_USE_DEMO_DATA=false"
        exit 0
      fi
      sleep 3
    done
    echo "API did not become ready; check: (cd services/open-wearables && docker compose logs app)" >&2
    exit 1
    ;;
  down)
    if [[ -d "${OW_DIR}" ]]; then
      (cd "${OW_DIR}" && compose down)
    fi
    ;;
  logs)
    (cd "${OW_DIR}" && compose logs -f app celery-worker)
    ;;
  status)
    if [[ -d "${OW_DIR}" ]]; then
      (cd "${OW_DIR}" && compose ps)
    fi
    curl -fsS "http://127.0.0.1:8001/" || true
    echo
    ;;
  *)
    cat <<'EOF'
Usage: scripts/open-wearables.sh <clone|up|down|logs|status>

WHOOP pilot helper for the vendored Open Wearables clone under services/open-wearables.
EOF
    ;;
esac
