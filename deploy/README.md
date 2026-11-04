# 把网站部署到 VPS（memmatch.fyi）

网站只有静态文件：页面、脚本、字体、问卷配置和项目数据，推荐在访客的浏览器里计算。服务器上只需要一个网页服务器程序 Caddy，不需要数据库，也不需要后端程序。

下面的命令按 Debian 或 Ubuntu 写。VPS 的 IP 是 `<VPS 的 IP>`（Cloudflare 的 DNS 记录里写的就是它）。`root` 是登录 VPS 的用户名，有的服务商默认叫 `ubuntu`、`admin` 或 `ecs-user`，以服务商控制台里写的为准。

## 第一次部署

### 1. 在 Cloudflare 上把域名指向 VPS

登录 Cloudflare → 选 memmatch.fyi → 左边“DNS” → “记录”，要有两条（2026-11-04 已经加好）：

| 类型 | 名称 | 内容 | 代理状态 |
|---|---|---|---|
| A | `memmatch.fyi` | VPS 的 IP | 仅 DNS（灰色云朵） |
| A | `www` | VPS 的 IP | 仅 DNS（灰色云朵） |

第一次部署用“仅 DNS”最省事：访客直接连到 VPS，Caddy 申请证书最顺利，也不用改 SSL/TLS 的设置。

DNS 生效一般要几分钟。在自己电脑上运行 `nslookup memmatch.fyi`，看到的是 VPS 的 IP 就说明生效了。

**如果 VPS 在中国大陆的机房**（如阿里云、腾讯云的大陆地域），域名要先做 ICP 备案，否则服务商会拦截 80、443 端口，网站打不开。香港和海外机房不用备案。

**以后想用 Cloudflare 的加速和防护**：把两条记录点“编辑”改成“已代理”（橙色云朵），同时到左边“SSL/TLS” → “概述”，把加密模式设成 **完全（严格）**。不设的话，Cloudflare 和 Caddy 会互相跳转，页面打不开，浏览器提示“重定向次数过多”。

### 2. 在 VPS 上安装 Caddy

用 SSH 登录 VPS（Windows 上可以在 PowerShell 里运行 `ssh root@<VPS 的 IP>`），然后依次运行（来自 Caddy 官方安装说明）：

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
scp deploy/Caddyfile root@<VPS 的 IP>:/etc/caddy/Caddyfile
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
MEMMATCH_HOST=root@<VPS 的 IP> bash deploy/publish.sh
```

它会先打包（`npm run build`，生成 `dist/`），再上传、替换服务器上的网站。完成后打开 https://memmatch.fyi/ 看看。

每次上传都要输一次 VPS 的密码。嫌麻烦的话，可以设置 SSH 密钥免密登录，要的话让 Claude 帮你设。

## 以后更新网站

改了问卷、项目数据或页面以后，运行同一条命令：

```bash
MEMMATCH_HOST=root@<VPS 的 IP> bash deploy/publish.sh
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

- **打不开，提示“重定向次数过多”**：开了橙色云朵，但 Cloudflare 的 SSL/TLS 加密模式不是“完全（严格）”，见第 1 步。
- **打不开，提示证书错误或连接超时**：Caddy 还没申请到证书。在 VPS 上运行 `sudo journalctl -u caddy --since "10 minutes ago"` 看日志，常见原因是 80、443 端口没放开（服务商网页控制台里的安全组也要放开），DNS 还没生效，或者大陆机房的域名没有备案。
- **改了内容但页面没变**：开了橙色云朵时，Cloudflare 可能缓存了旧文件。到 Cloudflare 的“缓存” → “配置” → “清除所有内容”。
