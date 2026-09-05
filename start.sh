#!/bin/sh
set -eu

# Resolve project files relative to this script, regardless of the caller's directory.
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' '启动失败：请先安装 Node.js 18 或更高版本。' >&2
  exit 1
fi

if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)'; then
  printf '%s\n' '启动失败：需要 Node.js 18 或更高版本。' >&2
  exit 1
fi

printf '%s\n' '正在启动 Tsumori，按 Ctrl+C 停止服务。'
exec node "$PROJECT_DIR/server.js"
