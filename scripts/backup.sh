#!/usr/bin/env sh
set -eu

DATA_DIR="${TSUMORI_DATA_DIR:-./data}"
BACKUP_DIR="${TSUMORI_BACKUP_DIR:-./backups}"
KEEP_DAYS="${TSUMORI_BACKUP_KEEP_DAYS:-30}"
SOURCE="${DATA_DIR}/tsumori-db.json"

if [ ! -f "$SOURCE" ]; then
  echo "Database file not found: $SOURCE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="${BACKUP_DIR}/tsumori-db-${STAMP}.json"

cp "$SOURCE" "$TARGET"
chmod 600 "$TARGET" 2>/dev/null || true
find "$BACKUP_DIR" -type f -name 'tsumori-db-*.json' -mtime "+${KEEP_DAYS}" -delete

echo "$TARGET"
