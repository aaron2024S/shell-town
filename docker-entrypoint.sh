#!/bin/sh
# Shell Town（拾贝小镇）容器启动入口
#
# 作用：镜像内置一份出厂宠物素材 /app/pets-default。当 /app/web/dist/pets
# 被宿主机 bind mount 覆盖（首挂时通常是空目录）时，把缺失的文件补进去——
# 只补缺失，绝不覆盖用户已修改或家长端上传的图。
#
# 注意：本脚本**不改变工作目录**，所有路径均为绝对路径；
# 末尾以 cwd=/app 启动服务（入口参数 server/dist/index.js 是相对路径）。
set -e

APP=/app
SRC=/app/pets-default
DST=/app/web/dist/pets

if [ -d "$SRC" ]; then
  mkdir -p "$DST"
  find "$SRC" -type f | while read -r f; do
    rel=${f#"$SRC"/}
    target="$DST/$rel"
    if [ ! -e "$target" ]; then
      mkdir -p "$(dirname "$target")"
      cp "$f" "$target"
    fi
  done
fi

cd "$APP"
exec node server/dist/index.js
