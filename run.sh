#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$REPO_DIR"

for command in node npm; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing $command. Install Node 24 LTS (24.15 or newer) and npm 11 or newer." >&2
    exit 1
  fi
done

node --input-type=module <<'JS'
const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 24 || (major === 24 && minor < 15)) {
  console.error('Node 24.15 or newer is required. Node 24 LTS is recommended.')
  process.exit(1)
}
JS

NPM_VERSION="$(npm --version)"
if [ "${NPM_VERSION%%.*}" -lt 11 ]; then
  echo 'npm 11 or newer is required.' >&2
  exit 1
fi

if [ ! -x node_modules/.bin/vite ] || ! npm ls --depth=0 >/dev/null 2>&1; then
  echo "Dependencies are missing or out of sync. Run npm ci in $REPO_DIR." >&2
  exit 1
fi

if [ ! -f .env ] && [ ! -f .env.local ] && [ -z "${VITE_BACKEND_URL:-}" ]; then
  echo 'Backend configuration is missing. Run: cp .env.example .env' >&2
  exit 1
fi

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-3000}"
if [[ ! "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
  echo 'PORT must be an integer between 1 and 65535.' >&2
  exit 1
fi

# Replace this shell so Ctrl-C reaches Vite and never touches another port owner.
exec node node_modules/vite/bin/vite.js --host "$HOST" --port "$PORT" --strictPort
