# 把网站部署到 VPS（memmatch.fyi）

网站只有静态文件：页面、脚本、字体、问卷配置和项目数据，推荐在访客的浏览器里计算。服务器上只需要一个网页服务器程序 Caddy，不需要数据库，也不需要后端程序。

下面的命令按 Debian 或 Ubuntu 写。`203.0.113.5` 换成你 VPS 的 IP，`root` 换成你登录 VPS 用的用户名。

## 第一次部署

### 1. 在 Cloudflare 上把域名指向 VPS

登录 Cloudflare → 选 memmatch.fyi → 左边“DNS” → “记录” → 添加两条：

| 类型 | 名称 | 内容 | 代理状态 |
|---|---|---|---|
| A | `@` | `203.0.113.5` | 已代理（橙色云朵） |
| CNAME | `www` | `memmatch.fyi` | 已代理（橙色云朵） |

再到左边“SSL/TLS” → “概述”，把加密模式设成 **完全（严格）**。不设的话，Cloudflare 和 Caddy 会互相跳转，页面打不开（浏览器提示“重定向次数过多”）。

DNS 生效一般要几分钟。在自己电脑上运行 `nslookup memmatch.fyi`，看到 Cloudflare 的地址（不一定是你的 IP，开了代理时显示的是 Cloudflare 的）就说明生效了。

### 2. 在 VPS 上安装 Caddy

用 SSH 登录 VPS（Windows 上可以在 PowerShell 里运行 `ssh root@203.0.113.5`），然后依次运行（来自 Caddy 官方安装说明）：

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

装好后 Caddy 会作为系统服务运行，开机自动启动，出错会自动重启。

如果 VPS 开了防火墙，要放开 80 和 443 两个端口（用 ufw 的话：`sudo ufw allow 80,443/tcp`）。有的云服务商在网页控制台里还有一层“安全组”，也要放开这两个端口。

### 3. 放上 Caddy 配置

把仓库里的 `deploy/Caddyfile` 传到 VPS。在自己电脑的仓库目录里运行：

```bash
scp deploy/Caddyfile root@203.0.113.5:/etc/caddy/Caddyfile
```

再在 VPS 上运行：

```bash
sudo mkdir -p /var/www/memmatch
sudo systemctl reload caddy
```

Caddy 会自动为 memmatch.fyi 申请 HTTPS 证书，并在到期前自动续期。

### 4. 上传网站

在自己电脑的仓库目录里，用 Git Bash 运行：

```bash
MEMMATCH_HOST=root@203.0.113.5 bash deploy/publish.sh
```

它会先打包（`npm run build`，生成 `dist/`），再上传、替换服务器上的网站。完成后打开 https://memmatch.fyi/ 看看。

每次上传都要输一次 VPS 的密码。嫌麻烦的话，可以设置 SSH 密钥免密登录，要的话让 Claude 帮你设。

## 以后更新网站

改了问卷、项目数据或页面以后，运行同一条命令：

```bash
MEMMATCH_HOST=root@203.0.113.5 bash deploy/publish.sh
```

上一版会留在 VPS 的 `/var/www/memmatch.old`。新版有问题时，在 VPS 上运行下面这条就能退回上一版：

```bash
sudo rm -rf /var/www/memmatch && sudo mv /var/www/memmatch.old /var/www/memmatch
```

## 上传前在自己电脑上预览

```bash
npm run preview
```

然后打开 http://localhost:5174/ 。这时看到的就是要上传的那一份。

## 出问题时

- **打不开，提示“重定向次数过多”**：Cloudflare 的 SSL/TLS 加密模式不是“完全（严格）”，见第 1 步。
- **打不开，提示证书错误**：Caddy 还没申请到证书。在 VPS 上运行 `sudo journalctl -u caddy --since "10 minutes ago"` 看日志，常见原因是 80、443 端口没放开，或者 DNS 还没生效。
- **改了内容但页面没变**：Cloudflare 可能缓存了旧文件。到 Cloudflare 的“缓存” → “配置” → “清除所有内容”。
