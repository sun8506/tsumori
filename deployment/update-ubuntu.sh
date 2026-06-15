#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo." >&2
  exit 1
fi

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="/opt/tsumori"

TSUMORI_DATA_DIR=/var/lib/tsumori \
TSUMORI_BACKUP_DIR=/var/backups/tsumori \
  "$APP_DIR/scripts/backup.sh"

rsync -a --delete \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'data' \
  --exclude 'backups' \
  "$SOURCE_DIR/" "$APP_DIR/"

chown -R root:root "$APP_DIR"
chmod +x "$APP_DIR/scripts/backup.sh" "$APP_DIR/scripts/restore.sh"
systemctl restart tsumori
curl --fail --silent --show-error http://127.0.0.1:5173/healthz
echo
echo "Tsumori updated."
