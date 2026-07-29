#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

node "$ROOT_DIR/query-union-capabilities.js" "$ROOT_DIR"
