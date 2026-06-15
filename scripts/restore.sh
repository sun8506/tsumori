#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 BACKUP_FILE" >&2
  exit 1
fi

DATA_DIR="${TSUMORI_DATA_DIR:-./data}"
SOURCE="$1"
TARGET="${DATA_DIR}/tsumori-db.json"

if [ ! -f "$SOURCE" ]; then
  echo "Backup file not found: $SOURCE" >&2
  exit 1
fi

node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$SOURCE"
mkdir -p "$DATA_DIR"

if [ -f "$TARGET" ]; then
  cp "$TARGET" "${TARGET}.before-restore-$(date -u +%Y%m%dT%H%M%SZ)"
fi

cp "$SOURCE" "$TARGET"
chmod 600 "$TARGET" 2>/dev/null || true
echo "Restored $TARGET"
