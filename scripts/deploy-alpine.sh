#!/usr/bin/env bash
set -euo pipefail

# Deploy script for Alpine/OpenRC installs (SAFE by default).
# - Builds using scripts/ziii.sh (handles symlink-restricted filesystems)
# - Creates a timestamped backup of DEPLOY_DIR
# - Deploys into a fresh DEPLOY_DIR
# - If anything fails, it rolls back automatically
#
# Env:
#   DEPLOY_DIR=/opt/helpdesk
#   SERVICE_NAME=helpdesk
#   PORT=32123
#   NO_RESTART=1   # don't restart OpenRC

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -z "${DEPLOY_DIR:-}" ]]; then
  if [[ -d /opt/hosziii/HosZiii ]]; then
    DEPLOY_DIR="/opt/hosziii/HosZiii"
  else
    DEPLOY_DIR="/opt/helpdesk"
  fi
fi
SERVICE_NAME="${SERVICE_NAME:-helpdesk}"
PORT="${PORT:-32123}"
NO_RESTART="${NO_RESTART:-0}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[deploy] Falta comando requerido: $1" >&2
    exit 1
  }
}

require_cmd rsync

echo "[deploy] Building..."
"$ROOT_DIR/scripts/ziii.sh" build

BUILD_DIR="$("$ROOT_DIR/scripts/ziii.sh" workdir)"
if [[ ! -d "$BUILD_DIR/.next" ]]; then
  echo "[deploy] No encuentro .next en BUILD_DIR=$BUILD_DIR" >&2
  exit 1
fi

if [[ "$(id -u)" != "0" ]]; then
  echo "[deploy] Este script debe correrse como root (para escribir en $DEPLOY_DIR y reiniciar OpenRC)." >&2
  exit 1
fi

backup_dir=""
rollback() {
  local exit_code=$?
  if [[ $exit_code -ne 0 && -n "$backup_dir" && -d "$backup_dir" ]]; then
    echo "[deploy] ERROR: rollback a backup: $backup_dir" >&2
    rm -rf "$DEPLOY_DIR" >/dev/null 2>&1 || true
    mv "$backup_dir" "$DEPLOY_DIR" >/dev/null 2>&1 || true
    if command -v rc-service >/dev/null 2>&1 && [[ "$NO_RESTART" != "1" ]]; then
      rc-service "$SERVICE_NAME" restart >/dev/null 2>&1 || true
    fi
  fi
}
trap rollback EXIT

echo "[deploy] Preparando deploy en: $DEPLOY_DIR"
if [[ -d "$DEPLOY_DIR" && -n "$(ls -A "$DEPLOY_DIR" 2>/dev/null || true)" ]]; then
  ts="$(date +%Y%m%d-%H%M%S)"
  backup_dir="${DEPLOY_DIR}.bak.${ts}"
  echo "[deploy] Backup -> $backup_dir"
  mv "$DEPLOY_DIR" "$backup_dir"
fi

mkdir -p "$DEPLOY_DIR"

# Copy only what runtime needs. Do NOT copy .env* by default.
rsync -a \
  --exclude .git \
  --exclude node_modules \
  --exclude .next/cache \
  "$BUILD_DIR/.next" "$DEPLOY_DIR/"

rsync -a \
  --exclude .git \
  --exclude node_modules \
  --exclude .next \
  --exclude src \
  --exclude scripts \
  --exclude supabase \
  --exclude "*.md" \
  "$BUILD_DIR/public" "$DEPLOY_DIR/" || true

rsync -a \
  "$BUILD_DIR/package.json" \
  "$BUILD_DIR/package-lock.json" \
  "$DEPLOY_DIR/"

# Also ship the OpenRC script so install-alpine-service.sh can copy it.
rsync -a \
  "$BUILD_DIR/helpdesk-openrc" \
  "$DEPLOY_DIR/"

# Install production deps inside deploy dir.
echo "[deploy] npm ci --omit=dev in $DEPLOY_DIR"
(
  cd "$DEPLOY_DIR"
  npm ci --omit=dev
)

# Ensure OpenRC conf exists and points to DEPLOY_DIR.
if [[ -d /etc/conf.d ]]; then
  if [[ ! -f /etc/conf.d/helpdesk ]]; then
    echo "[deploy] Creando /etc/conf.d/helpdesk" >&2
    cat > /etc/conf.d/helpdesk <<EOF
# Ruta donde vive la app Next.js (cámbiala aquí si se mueve el directorio)
directory="$DEPLOY_DIR"

# Puerto del servicio
command_args="node_modules/next/dist/bin/next start -p $PORT"

# Usuario del servicio
command_user="node"
EOF
  fi
fi

# Restart service if OpenRC is available.
if command -v rc-service >/dev/null 2>&1 && [[ "$NO_RESTART" != "1" ]]; then
  echo "[deploy] Restarting service: $SERVICE_NAME"
  rc-service "$SERVICE_NAME" restart || rc-service "$SERVICE_NAME" start
  rc-service "$SERVICE_NAME" status || true
else
  echo "[deploy] Deploy terminado (sin restart)." >&2
fi

trap - EXIT

if [[ -n "$backup_dir" ]]; then
  echo "[deploy] OK (backup conservado en: $backup_dir)"
else
  echo "[deploy] OK"
fi