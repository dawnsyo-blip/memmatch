#!/usr/bin/env bash
# 打包网站并上传到 VPS。在仓库根目录的 Git Bash 里运行：
#   MEMMATCH_HOST=用户名@服务器IP bash deploy/publish.sh
# 做的事：npm run build 生成 dist/ → 打成一个压缩包传上去 → 在服务器上解压到新目录，再一次性替换 /var/www/memmatch，
# 替换的那一刻之前访客看到的都是旧版，不会出现一半新一半旧。
set -euo pipefail
HOST="${MEMMATCH_HOST:?请先设置 MEMMATCH_HOST，例如 MEMMATCH_HOST=root@<VPS 的 IP>}"
SITE=/var/www/memmatch

cd "$(dirname "$0")/.."
npm run build
tar -czf dist.tgz -C dist .
scp dist.tgz "$HOST:/tmp/memmatch-dist.tgz"
ssh "$HOST" "set -e
  rm -rf $SITE.new && mkdir -p $SITE.new
  tar -xzf /tmp/memmatch-dist.tgz -C $SITE.new && rm /tmp/memmatch-dist.tgz
  if [ -d $SITE ]; then rm -rf $SITE.old && mv $SITE $SITE.old; fi
  mv $SITE.new $SITE
  echo '已更新网站：' \$(ls $SITE | wc -l) '个文件和目录'"
rm dist.tgz
echo "完成：https://memmatch.fyi/"
