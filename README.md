# Auto STRM

从 CloudDrive2 WebDAV 同步媒体元数据到本地，自动生成 `.strm` 流媒体链接文件，支持 Web UI 管理配置。

## 功能

- 扫描 CloudDrive2 WebDAV 目录，保持本地目录结构一致
- 下载元数据文件（nfo、海报、字幕、音轨等）到本地
- 为视频文件自动生成 `.strm` 链接，支持 CloudDrive2 流媒体 URL 格式
- 增量同步，已存在的文件自动跳过，strm 内容不变则跳过写入
- 并发处理，并发数和请求间隔可配置（默认 5 并发，200ms 间隔）
- 支持多任务配置，独立设置同步目录和定时规则
- 任务可单独启用/禁用，配置热更新无需重启
- **Web 管理界面**：浏览器内管理配置，实时编辑保存
- **REST API**：提供配置读写、触发同步、重载配置等接口
- **Webhook 接口**：接收第三方（如 MoviePilot）的 webhook 事件，自动触发同步
- **Jellyfin 集成**：新增 strm 文件后自动刷新 Jellyfin 媒体库
- 定时执行，容器启动立即同步一次
- 优雅退出，收到停止信号后等待当前任务完成再退出
- **日志查看器**：Web UI 内查看实时日志，支持 ANSI 颜色渲染

## 快速开始

```bash
# 1. 创建配置文件
cp config/default.json.example config/default.json
# 编辑 default.json，填入 CloudDrive2 地址和账号密码

# 2. 安装依赖 + 初始化 git hook
npm install

# 3. 开发模式（无 Web UI，读取 config/dev.json，API 端口 :3000）
npm run dev

# 4. 开发模式（含 Web UI，前端 HMR，访问 :5173）
npm run dev:web

# 5. 提交前检查（lint + tsc）
npm run check

# 6. 生产模式（Docker）
docker compose up -d --build
# 自定义 Web 端口
WEB_PORT=8080 docker compose up -d --build
```

## 配置

```jsonc
{
  // 公共连接配置，每个 task 可覆盖任意字段
  "remote": {
    "url": "https://your-server.com/dav",
    "username": "your-account",
    "password": "your-password",
    "publicUrl": "https://your-server.com"
  },
  // 公共定时规则，每个 task 可覆盖
  "cron": "0 */6 * * *",
  // 公共请求频率控制，每个 task 可覆盖
  "rateLimit": {
    "concurrency": 5,
    "intervalMs": 200
  },
  // 可选：Jellyfin 服务器，新增 strm 后自动刷新媒体库
  "jellyfin": {
    "url": "http://your-jellyfin:8096",
    "token": "your-api-token"
  },
  "tasks": [
    {
      "name": "剧集",
      "enabled": true,
      "remote": {
        "path": "/cloud-drive/Media/剧集",
        "syncMetadata": false
      },
      "local": { "path": "/data/剧集" },
      // 可选：覆盖全局 jellyfin 配置
      "jellyfin": {
        "url": "http://another-jellyfin:8096",
        "token": "another-token"
      }
    }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `remote.url` | CloudDrive2 WebDAV 地址 |
| `remote.path` | 远端要扫描的目录 |
| `remote.publicUrl` | 可选，strm 链接使用的域名端口，不填则自动取 url 的 origin |
| `remote.syncMetadata` | 默认 `true`，设为 `false` 只生成 strm 不下载元数据 |
| `local.path` | 本地存储路径 |
| `cron` | 定时表达式，启动时立即执行一次 |
| `enabled` | 默认 `true`，设为 `false` 则跳过该任务 |
| `rateLimit.concurrency` | 并发下载数，默认 5 |
| `rateLimit.intervalMs` | 请求间隔（毫秒），默认 200 |
| `jellyfin.url` | Jellyfin 服务地址 |
| `jellyfin.token` | Jellyfin API Token |

顶层 `remote`、`cron`、`rateLimit`、`jellyfin` 均可选，省略时每个 task 必须填写对应字段。
Task 级别的 `jellyfin` 覆盖全局配置（整对象覆盖，非逐字段合并）。

## Webhook

接收外部系统的 webhook 事件，自动匹配任务并触发同步。

**手动指定任务：**
```
POST /api/webhook?task=任务名
```
根据 URL 参数中的任务名直接触发同步。

**MoviePilot 自动匹配：**
```
POST /api/webhook
Body: {"type": "transfer.complete", "data": {...}}
```
自动提取 `transferinfo.target_diritem.path`，按 `remote.path` 前缀匹配已启用任务（最长路径优先），匹配成功后延迟 60 秒**仅同步该目录**（非整个 task）。

收到 webhook 后 HTTP 响应立即返回，任务在后台异步执行。同名任务正在运行时，新触发静默跳过。未知格式仅记录日志。

## 环境变量

| 变量 | 说明 |
|------|------|
| `WEB_PORT` | 设置后启用 Web UI 和 API 服务，默认不启用 |
| `NODE_ENV` | `development` 时读 `config/dev.json` |
| `TZ` | 容器时区，默认 `Asia/Shanghai` |

## 技术栈

- TypeScript + Node.js 22
- Docker 容器化
- `webdav` (v5) — WebDAV 客户端
- `cron` (v3) — 定时调度
- `express` (v5) — HTTP 服务 + REST API
- `react` + `antd` (v5) — Web 管理界面
- `vite` (v5) — 前端构建
- `tsx` — 开发模式热更新
