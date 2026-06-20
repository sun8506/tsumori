# Google Cloud 单机多应用 Nginx 配置

同一台服务器通过不同二级域名分发：

```text
quant.example.com   -> QuantLab 静态文件 + 127.0.0.1:8080
tsumori.example.com -> Tsumori 127.0.0.1:5173
```

## 1. DNS

在域名服务商中添加两个 A 记录，均指向 Google Cloud 静态公网 IP：

```text
quant.example.com   A  35.212.251.35
tsumori.example.com A  35.212.251.35
```

请把示例域名替换成实际域名。

## 2. 安装配置

上传项目后，在服务器执行：

```bash
sudo cp deployment/nginx/multi-app-http.conf.example /etc/nginx/sites-available/apps
sudo sed -i 's/quant\.example\.com/实际的QuantLab域名/g' /etc/nginx/sites-available/apps
sudo sed -i 's/tsumori\.example\.com/实际的Tsumori域名/g' /etc/nginx/sites-available/apps
```

停用原来使用 IP 的 QuantLab 配置，启用新配置：

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/quantlab
sudo rm -f /etc/nginx/sites-enabled/tsumori
sudo ln -s /etc/nginx/sites-available/apps /etc/nginx/sites-enabled/apps
sudo nginx -t
sudo systemctl reload nginx
```

如果原配置文件名不是 `default` 或 `quantlab`，先执行：

```bash
ls -l /etc/nginx/sites-enabled/
```

然后只删除对应的符号链接，不要删除 `sites-available` 中的备份配置。

如果此前运行过 Tsumori 的 `deployment/install-ubuntu.sh`，它会生成
`/etc/nginx/sites-enabled/tsumori`。启用本文件前必须停用该链接，否则同一个
Tsumori 域名会被配置两次：

```bash
sudo rm -f /etc/nginx/sites-enabled/tsumori
```

应用后续更新只运行 `deployment/update-ubuntu.sh`，该脚本不会修改 Nginx。

## 3. 申请 HTTPS

确认两个域名已经解析到服务器，而且 Google Cloud 防火墙允许 TCP 80 和 443：

```bash
sudo certbot --nginx -d 实际的QuantLab域名
sudo certbot --nginx -d 实际的Tsumori域名
```

Certbot 会为两个 `server` 块增加 443 配置，并将 HTTP 跳转到 HTTPS。

验证：

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
curl -I https://实际的QuantLab域名
curl -I https://实际的Tsumori域名/healthz
```

## 4. 服务端口

只对公网开放：

```text
80/tcp
443/tcp
```

`8080` 和 `5173` 应仅监听 `127.0.0.1`，不要在 Google Cloud 防火墙中开放。

检查：

```bash
ss -lntp | grep -E ':80|:443|:8080|:5173'
curl http://127.0.0.1:8080
curl http://127.0.0.1:5173/healthz
```
