#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3.10}"

echo "[cozepy-check] project root: $PROJECT_ROOT"
echo "[cozepy-check] using python: $PYTHON_BIN"

"$PYTHON_BIN" "$SCRIPT_DIR/check_cozepy.py" "$@"
