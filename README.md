# Auto STRM

从 CloudDrive2 WebDAV 同步媒体元数据到本地，并自动生成 `.strm` 流媒体链接文件。

## 功能

- 扫描 CloudDrive2 WebDAV 目录，保持本地目录结构一致
- 下载元数据文件（nfo、海报、字幕、音轨等）到本地
- 为视频文件自动生成 `.strm` 链接，支持 CloudDrive2 流媒体 URL 格式
- 增量同步，已存在的文件自动跳过，strm 内容不变则跳过写入
- 并发处理，默认 5 个并发，请求间隔 200ms，避免触发服务端限频
- 支持多任务配置，独立设置同步目录和定时规则
- 定时执行，容器启动立即同步一次
- 优雅退出，收到停止信号后等待当前任务完成再退出

## 快速开始

```bash
# 1. 创建配置文件
cp app/config/default.example.json app/config/default.json
# 编辑 default.json，填入你的 CloudDrive2 地址和账号密码

# 2. 开发模式（本地运行，读取 config/dev.json）
# 创建 dev.json 配置文件，然后：
cd app && npm install && npm run dev

# 3. 生产模式（Docker）
docker compose up -d --build
```

## 配置

```jsonc
{
  // 顶层 remote 为所有任务共享的公共连接配置，每个 task 可覆盖任意字段
  "remote": {
    "url": "https://your-server.com/dav",
    "username": "your-account",
    "password": "your-password",
    "publicUrl": "https://your-server.com"
  },
  // 顶层 cron 为所有任务共享的定时规则，每个 task 可覆盖
  "cron": "0 */6 * * *",
  // 顶层 rateLimit 为所有任务共享的请求频率控制，每个 task 可覆盖
  "rateLimit": {
    "concurrency": 5,
    "intervalMs": 200
  },
  "tasks": [
    {
      "name": "剧集",
      "remote": {
        "path": "/cloud-drive/Media/剧集",
        "syncMetadata": false
      },
      "local": {
        "path": "/data/剧集"
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
| `local.path` | 本地存储路径，Docker 内对应 `/data` |
| `cron` | 定时表达式，启动时立即执行一次。顶层定义后任务可省略 |
| `rateLimit.concurrency` | 并发下载数，默认 5 |
| `rateLimit.intervalMs` | 请求间隔（毫秒），默认 200 |

顶层 `remote`、`cron`、`rateLimit` 均为可选，省略时每个 task 必须填写对应字段。

默认配置文件不会被 git 追踪，首次使用需从 `default.example.json` 复制。

## 技术栈

- TypeScript + Node.js 22
- Docker 容器化（两阶段构建）
- `webdav` (v5) — WebDAV 客户端
- `cron` (v3) — 定时调度
- `tsx` — 开发模式热更新
