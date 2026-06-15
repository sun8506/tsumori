# 不使用 Docker 的简易部署

适用于 Ubuntu 22.04/24.04。运行结构：

```text
浏览器 -> HTTPS/Nginx -> Node.js/systemd -> /var/lib/tsumori/tsumori-db.json
```

## 准备条件

1. 一台 Ubuntu 服务器。
2. 服务器可以访问 Ubuntu 软件源和 NodeSource；脚本会自动安装 Node.js 20。
3. 一个域名已解析到服务器公网 IP。
4. 云服务器安全组已开放 TCP 80 和 443。
5. 不需要开放 5173。

## 上传代码

从本机把整个项目上传到服务器临时目录。使用 `scp` 的示例：

```powershell
scp -r E:\Code\tsumori root@服务器IP:/root/tsumori
```

也可以使用 WinSCP 上传到 `/root/tsumori`。

不要把本机 `data` 目录作为服务器正式数据库使用。新服务器应建立自己的账号数据。

## 一键安装

登录服务器：

```bash
ssh root@服务器IP
cd /root/tsumori
chmod +x deployment/install-ubuntu.sh
sudo ./deployment/install-ubuntu.sh 你的域名 你的邮箱
```

例如：

```bash
sudo ./deployment/install-ubuntu.sh learn.example.com admin@example.com
```

脚本会自动：

- 安装 Nginx、Certbot 和 rsync
- 创建低权限 `tsumori` 用户
- 将程序安装到 `/opt/tsumori`
- 将数据库放在 `/var/lib/tsumori`
- 创建并启动 systemd 服务
- 配置 Nginx
- 申请并启用 HTTPS
- 创建每天凌晨 03:15 的数据库备份

成功后访问：

```text
https://你的域名/
```

## 常用命令

查看状态：

```bash
systemctl status tsumori
```

查看日志：

```bash
journalctl -u tsumori -f
```

重启：

```bash
sudo systemctl restart tsumori
```

健康检查：

```bash
curl http://127.0.0.1:5173/healthz
```

备份目录：

```text
/var/backups/tsumori
```

## 更新应用

把新版本再次上传到 `/root/tsumori` 后：

```bash
cd /root/tsumori
chmod +x deployment/update-ubuntu.sh
sudo ./deployment/update-ubuntu.sh
```

更新脚本会先备份数据库，再替换程序并重启服务。

## 安装失败时

检查：

```bash
systemctl status tsumori --no-pager
journalctl -u tsumori -n 100 --no-pager
nginx -t
curl http://127.0.0.1:5173/healthz
```

证书申请失败通常是以下原因：

- 域名尚未解析到服务器
- 云服务器安全组未开放 80/443
- 服务器防火墙未开放 Nginx
- 运营商或机房阻止了端口
