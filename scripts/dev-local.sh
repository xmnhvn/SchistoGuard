#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

if [[ ! -d "$BACKEND_DIR" || ! -d "$FRONTEND_DIR" ]]; then
  echo "Error: backend or frontend directory is missing."
  exit 1
fi

check_port_free() {
  local port="$1"
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Error: port $port is already in use."
    echo "Tip: stop old processes first, then rerun this script."
    exit 1
  fi
}

check_port_free 3000
check_port_free 3001

cleanup() {
  echo
  echo "Stopping local services..."

  if [[ -n "${BACK_PID:-}" ]] && kill -0 "$BACK_PID" 2>/dev/null; then
    kill "$BACK_PID" 2>/dev/null || true
  fi

  if [[ -n "${FRONT_PID:-}" ]] && kill -0 "$FRONT_PID" 2>/dev/null; then
    kill "$FRONT_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting backend on http://localhost:3001 ..."
(
  cd "$BACKEND_DIR"
  npm start
) &
BACK_PID=$!

echo "Starting frontend on http://localhost:3000 ..."
(
  cd "$FRONTEND_DIR"
  npm run dev:local
) &
FRONT_PID=$!

echo

echo "Local stack is launching..."
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both services."

while true; do
  if ! kill -0 "$BACK_PID" 2>/dev/null; then
    echo "Backend process exited."
    exit 1
  fi

  if ! kill -0 "$FRONT_PID" 2>/dev/null; then
    echo "Frontend process exited."
    exit 1
  fi

  sleep 1
done
