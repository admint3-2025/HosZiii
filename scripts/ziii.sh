#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_help() {
  cat >&2 <<'EOF'
Uso: ./scripts/ziii.sh <comando>

Comandos:
  workdir   Muestra el directorio real donde se ejecuta (shadow workdir si aplica)
  install   Instala dependencias (npm install) en el workdir correcto
  dev       Arranca desarrollo (next dev) en el workdir correcto
  build     Compila producción (next build) en el workdir correcto
  start     Arranca producción (next start) en el workdir correcto (auto-build si falta .next)
  lint      Ejecuta lint en el workdir correcto
  help      Muestra esta ayuda

Regla de oro (para evitar confusiones):
  NO uses "npm run dev/build/start" directamente.
  SIEMPRE usa: ./scripts/ziii.sh dev|build|start

Ejemplos típicos:
  ./scripts/ziii.sh install
  ./scripts/ziii.sh dev
  ./scripts/ziii.sh build
  ./scripts/ziii.sh start

Tips:
  - Puedes fijar el workdir: export ZIII_WORKDIR=/ruta/estable
EOF
}

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

NEXT_BIN=(node node_modules/next/dist/bin/next)

case "$cmd" in
  ""|help|-h|--help)
    print_help
    exit 0
    ;;
esac

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
        "${NEXT_BIN[@]}" dev "$@"
        kill "$sync_pid" >/dev/null 2>&1 || true
        wait "$sync_pid" >/dev/null 2>&1 || true
        exit 0
      else
        echo "[ziii] Aviso: sin inotify/rsync no hay sync continuo." >&2
        echo "[ziii] Recomendado: abrir VS Code en $RUN_DIR para dev con hot-reload." >&2
      fi
    fi
    exec "${NEXT_BIN[@]}" dev "$@"
    ;;
  build)
    exec "${NEXT_BIN[@]}" build "$@"
    ;;
  start)
    # next start requires a completed build in the *same* RUN_DIR.
    # If the user built elsewhere (or the build output was cleaned), we can
    # get runtime ENOENT errors like `.next/server/webpack-runtime.js` missing.
    if [[ ! -f ".next/server/webpack-runtime.js" ]]; then
      echo "[ziii] Build output faltante en: $RUN_DIR/.next (ejecutando build primero)" >&2
      "${NEXT_BIN[@]}" build
    fi
    exec "${NEXT_BIN[@]}" start "$@"
    ;;
  lint)
    exec "${NEXT_BIN[@]}" lint "$@"
    ;;
  *)
    echo "Comando no reconocido: $cmd" >&2
    print_help
    exit 2
    ;;
esac
