# Tsumori 服务器部署说明

本文以 Ubuntu 22.04/24.04、Docker Compose、Nginx 和 HTTPS 为推荐方案。

## 1. 部署限制

- 当前账号与云端学习数据保存在 `data/tsumori-db.json`。
- 数据库采用原子文件写入，适合单机、单实例运行。
- 不要启动多个应用副本，也不要使用 Docker 多副本扩容，否则可能覆盖数据。
- 正式扩大用户规模前，应迁移到 PostgreSQL。
- AI API Key 仍保存在用户浏览器，并通过 HTTPS 发送到本服务，再转发给所选 AI 服务商。

## 2. 服务器要求

- 2 核 CPU、2 GB 内存、20 GB 磁盘起步
- Ubuntu 22.04 或更新版本
- 已安装 Docker Engine、Docker Compose Plugin、Nginx、Certbot
- 一个已解析到服务器公网 IP 的域名，例如 `learn.example.com`
- 防火墙仅开放 SSH、TCP 80 和 TCP 443

应用的 `5173` 端口只绑定到服务器 `127.0.0.1`，不要向公网开放。

## 3. 上传项目

将项目放到服务器，例如：

```bash
sudo mkdir -p /opt/tsumori
sudo chown "$USER":"$USER" /opt/tsumori
cd /opt/tsumori
git clone YOUR_REPOSITORY_URL .
```

如果不使用 Git，也可以上传整个项目目录，但不要上传本机的 `data` 目录。

## 4. 配置应用

```bash
cd /opt/tsumori
cp .env.example .env
mkdir -p data backups
chmod 700 data backups
sudo chown -R 1000:1000 data
```

生产环境 `.env`：

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=5173
TRUST_PROXY=true
TSUMORI_DATA_DIR=/app/data
AUTH_RATE_LIMIT_MAX=60
```

`.env` 已加入 Git 忽略列表。

## 5. 构建并启动

```bash
docker compose build
docker compose up -d
docker compose ps
curl http://127.0.0.1:5173/healthz
```

健康检查应返回：

```json
{"status":"ok"}
```

查看日志：

```bash
docker compose logs -f --tail=200 app
```

## 6. 配置 HTTPS

先确认域名已经解析到服务器，然后使用 Certbot 获取证书。首次签发可使用 standalone 模式：

```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d learn.example.com
```

复制 Nginx 示例并替换所有 `learn.example.com`：

```bash
sudo cp deployment/nginx/tsumori.conf.example /etc/nginx/sites-available/tsumori
sudo sed -i 's/learn\.example\.com/你的域名/g' /etc/nginx/sites-available/tsumori
sudo ln -s /etc/nginx/sites-available/tsumori /etc/nginx/sites-enabled/tsumori
sudo nginx -t
sudo systemctl enable --now nginx
```

验证：

```bash
curl -I https://你的域名/
curl https://你的域名/healthz
```

Certbot 默认会安装证书续期任务。验证续期：

```bash
sudo certbot renew --dry-run
```

## 7. 防火墙

使用 UFW 时：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

不要添加 `5173/tcp` 公网入站规则。

## 8. 数据备份

手动备份：

```bash
cd /opt/tsumori
chmod +x scripts/backup.sh scripts/restore.sh
./scripts/backup.sh
```

默认备份到 `backups/` 并保留 30 天。建议每天执行，并将备份复制到服务器之外。

Cron 示例：

```cron
15 3 * * * cd /opt/tsumori && ./scripts/backup.sh >> /var/log/tsumori-backup.log 2>&1
```

恢复前先停止应用：

```bash
cd /opt/tsumori
docker compose stop app
./scripts/restore.sh backups/tsumori-db-YYYYMMDDTHHMMSSZ.json
docker compose up -d app
curl http://127.0.0.1:5173/healthz
```

## 9. 更新版本

```bash
cd /opt/tsumori
./scripts/backup.sh
git pull --ff-only
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:5173/healthz
```

## 10. 上线检查

- 域名 HTTPS 正常，HTTP 自动跳转 HTTPS
- `5173` 仅监听 `127.0.0.1`
- 注册、登录、退出正常
- 本地模式不会上传学习数据
- 云端模式换设备登录可恢复数据
- AI 和阅读主题接口未登录时返回 `401`
- `data/` 与 `backups/` 不在 Git 中
- 每日备份任务已启用并验证恢复
- 服务器时间同步正常

## 11. 不使用 Docker

可使用 `deployment/systemd/` 中的示例直接运行 Node.js。此方式应：

- 创建独立的 `tsumori` 系统用户
- 将数据目录设为 `/var/lib/tsumori`
- 仅监听 `127.0.0.1:5173`
- 仍由 Nginx 提供公网 HTTPS
