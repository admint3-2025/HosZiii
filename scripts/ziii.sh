#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

supports_symlinks() {
  local test_dir
  test_dir="$(mktemp -d "${ROOT_DIR%/}/.symlink-test.XXXXXX")"
  trap 'rm -rf "$test_dir"' RETURN
  touch "$test_dir/target"
  ln -s "target" "$test_dir/link" >/dev/null 2>&1
}

sync_to_shadow_dir() {
  local shadow_dir="$1"
  mkdir -p "$shadow_dir"

  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete \
      --exclude node_modules \
      --exclude .next \
      --exclude .git \
      --exclude .symlink-test.* \
      "$ROOT_DIR/" "$shadow_dir/"
  else
    # Fallback (menos eficiente): copia sin delete
    cp -a "$ROOT_DIR/." "$shadow_dir/"
  fi
}

RUN_DIR="$ROOT_DIR"
USING_SHADOW="0"
if ! supports_symlinks; then
  default_shadow="$HOME/ziii-helpdesk-dev"
  if [[ -d "$default_shadow" && -w "$default_shadow" ]]; then
    RUN_DIR="$default_shadow"
  else
    RUN_DIR="$HOME/.cache/ziii-helpdesk-workdir"
  fi

  RUN_DIR="${ZIII_WORKDIR:-$RUN_DIR}"
  USING_SHADOW="1"
  echo "[ziii] Filesystem sin symlinks en: $ROOT_DIR" >&2
  echo "[ziii] Usando workdir estable: $RUN_DIR" >&2
  sync_to_shadow_dir "$RUN_DIR"
fi

cd "$RUN_DIR"

cmd="${1:-}"
shift || true

case "$cmd" in
  workdir)
    echo "$RUN_DIR"
    exit 0
    ;;
  install)
    exec npm install "$@"
    ;;
  dev)
    if [[ "$USING_SHADOW" == "1" ]]; then
      if command -v inotifywait >/dev/null 2>&1 && command -v rsync >/dev/null 2>&1; then
        echo "[ziii] Sync continuo habilitado (inotify + rsync)" >&2
        (
          while inotifywait -r -q -e modify,create,delete,move \
            --exclude '(/\.git/|/node_modules/|/\.next/|/\.symlink-test\.)' \
            "$ROOT_DIR" >/dev/null 2>&1; do
            rsync -a --delete \
              --exclude node_modules \
              --exclude .next \
              --exclude .git \
              --exclude .symlink-test.* \
              "$ROOT_DIR/" "$RUN_DIR/" >/dev/null 2>&1 || true
          done
        ) &
        sync_pid=$!
        npm run dev -- "$@"
        kill "$sync_pid" >/dev/null 2>&1 || true
        wait "$sync_pid" >/dev/null 2>&1 || true
        exit 0
      else
        echo "[ziii] Aviso: sin inotify/rsync no hay sync continuo." >&2
        echo "[ziii] Recomendado: abrir VS Code en $RUN_DIR para dev con hot-reload." >&2
      fi
    fi
    exec npm run dev -- "$@"
    ;;
  build)
    exec npm run build -- "$@"
    ;;
  start)
    exec npm run start -- "$@"
    ;;
  lint)
    exec npm run lint -- "$@"
    ;;
  *)
    echo "Uso: $(basename "$0") {workdir|install|dev|build|start|lint}" >&2
    echo "Tip: export ZIII_WORKDIR=... para fijar un workdir" >&2
    exit 2
    ;;
esac
