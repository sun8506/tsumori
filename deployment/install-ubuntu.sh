#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo." >&2
  exit 1
fi

if [ "$#" -lt 2 ]; then
  echo "Usage: sudo ./deployment/install-ubuntu.sh DOMAIN EMAIL" >&2
  exit 1
fi

DOMAIN="$1"
EMAIL="$2"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="/opt/tsumori"
DATA_DIR="/var/lib/tsumori"
BACKUP_DIR="/var/backups/tsumori"
ENV_DIR="/etc/tsumori"

if ! [[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
  echo "Invalid domain: $DOMAIN" >&2
  exit 1
fi

if ! [[ "$EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo "Invalid email: $EMAIL" >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl nginx certbot python3-certbot-nginx rsync

NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
fi
if [ "$NODE_MAJOR" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
  rm -f /tmp/nodesource_setup.sh
fi

if ! id tsumori >/dev/null 2>&1; then
  useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin tsumori
fi

mkdir -p "$APP_DIR" "$DATA_DIR" "$BACKUP_DIR" "$ENV_DIR"

if [ "$SOURCE_DIR" = "$APP_DIR" ]; then
  echo "Run this installer from an upload directory such as /root/tsumori, not from $APP_DIR." >&2
  exit 1
fi

rsync -a --delete \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'data' \
  --exclude 'backups' \
  "$SOURCE_DIR/" "$APP_DIR/"

cat > "$ENV_DIR/tsumori.env" <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=5173
TRUST_PROXY=true
TSUMORI_DATA_DIR=$DATA_DIR
AUTH_RATE_LIMIT_MAX=60
EOF

NODE_PATH="$(command -v node)"
sed \
  -e "s|ExecStart=/usr/bin/node|ExecStart=$NODE_PATH|" \
  "$APP_DIR/deployment/systemd/tsumori.service.example" \
  > /etc/systemd/system/tsumori.service

sed "s/__DOMAIN__/$DOMAIN/g" \
  "$APP_DIR/deployment/nginx/tsumori-http.conf.example" \
  > /etc/nginx/sites-available/tsumori

ln -sfn /etc/nginx/sites-available/tsumori /etc/nginx/sites-enabled/tsumori
rm -f /etc/nginx/sites-enabled/default

chown -R root:root "$APP_DIR" "$ENV_DIR"
chown -R tsumori:tsumori "$DATA_DIR" "$BACKUP_DIR"
chmod 700 "$DATA_DIR" "$BACKUP_DIR" "$ENV_DIR"
chmod 600 "$ENV_DIR/tsumori.env"
chmod +x "$APP_DIR/scripts/backup.sh" "$APP_DIR/scripts/restore.sh"
touch /var/log/tsumori-backup.log
chown tsumori:tsumori /var/log/tsumori-backup.log
chmod 640 /var/log/tsumori-backup.log

systemctl daemon-reload
systemctl enable --now tsumori
nginx -t
systemctl enable --now nginx

curl --fail --silent --show-error http://127.0.0.1:5173/healthz >/dev/null

certbot --nginx \
  --non-interactive \
  --agree-tos \
  --redirect \
  --email "$EMAIL" \
  -d "$DOMAIN"

cat > /etc/cron.d/tsumori-backup <<EOF
15 3 * * * tsumori TSUMORI_DATA_DIR=$DATA_DIR TSUMORI_BACKUP_DIR=$BACKUP_DIR $APP_DIR/scripts/backup.sh >> /var/log/tsumori-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/tsumori-backup

systemctl restart tsumori nginx

echo
echo "Tsumori is running at https://$DOMAIN/"
echo "Application status: systemctl status tsumori"
echo "Application logs:  journalctl -u tsumori -f"
echo "Backups:          $BACKUP_DIR"
