---
name: filebrowser
description: |
  使用 FileBrowser API 上传文件并生成分享链接。用于：
  (1) 上传本地文件到 NAS FileBrowser
  (2) 生成分享链接供用户下载
---

# FileBrowser 文件上传

## 服务信息

| 项目 | 值 |
|------|-----|
| 地址 | http://xyin.oicp.net:8082 |
| 用户名 | admin |
| 密码 | 46jD9l4CF16aeFu6 |

## 上传文件并分享

### 1. 登录获取 Token

```bash
curl -X POST "http://xyin.oicp.net:8082/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"46jD9l4CF16aeFu6"}'
```

返回：`{"token":"xxx"}`

### 2. 上传文件

```bash
curl -X POST "http://xyin.oicp.net:8082/api/resources" \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/file.pdf"
```

### 3. 生成分享链接

```bash
curl -X POST "http://xyin.oicp.net:8082/api/share" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"path":"/file.pdf"}'
```

返回：`{"url":"http://xyin.oicp.net:8082/share/xxx"}`

## 完整脚本

```bash
#!/bin/bash
FILE="$1"
BASE_URL="http://xyin.oicp.net:8082"
USER="admin"
PASS="46jD9l4CF16aeFu6"

# 登录
TOKEN=$(curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" | jq -r '.token')

# 上传
curl -X POST "$BASE_URL/api/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$FILE"

# 生成分享链接
curl -X POST "$BASE_URL/api/share" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"/$(basename $FILE)\"}"
```
