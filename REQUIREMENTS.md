# Auto STRM

通过 WebDAV 扫描远端媒体目录，同步元数据文件到本地，并为视频文件生成 `.strm` 链接文件。

## 功能需求

- 扫描 WebDAV 指定目录下的所有子文件夹，保持本地目录结构一致
- 同步元数据文件到本地（nfo、海报、字幕、音轨等），详见 `CLAUDE.md` 文件分类
- 检测到视频文件时，生成同名 `.strm` 链接文件（替换视频扩展名），URL 格式见 `CLAUDE.md`
- 可选配置 `syncMetadata`（默认 `true`），设为 `false` 时跳过元数据下载只生成 strm
- 增量同步：本地已有同名文件则跳过下载；strm 内容不变则跳过写入
- 并发处理：元数据下载和 strm 生成并发执行，并发数和请求间隔可配置（默认 5 并发，200ms 间隔）
- 下载失败时自动清理残留的部分文件，下次同步可重试
- 支持多个同步任务，每个任务独立配置远端/本地/cron 表达式
- 任务可单独启用/禁用（`enabled` 字段，默认 `true`），禁用后跳过该任务
- 配置文件热更新，修改后自动重载任务配置，无需重启
- 定时执行，启动时立即执行一次
- 监听 SIGTERM/SIGINT 信号，优雅退出（停止定时器，等待当前任务完成）

## Web 管理界面

- 可选启用（设置 `WEB_PORT` 环境变量），浏览器内管理所有配置
- 全局默认值面板：公共 remote、cron、rateLimit、jellyfin 配置
- 任务列表：新增/删除/启用/禁用任务，每个任务独立展开编辑
- 即时保存：修改后保存自动校验并重载调度器
- 手动触发：Web UI 内可直接触发单个任务同步
- 日志查看器：模态窗口查看实时日志，支持 ANSI 颜色渲染

## REST API

- `GET /api/config` — 读取完整配置 JSON
- `PUT /api/config` — 校验并写入配置，自动重载调度器
- `POST /api/tasks/:name/sync` — 手动触发单个任务同步
- `POST /api/config/reload` — 强制从文件重载配置
- `POST /api/webhook?task=name` — 接收 webhook 事件，触发任务同步
- `GET /api/health` — 服务健康检查
- `GET /api/logs` — 获取最近日志

## Webhook

接收外部系统（如 MoviePilot）的 webhook 事件，自动匹配并触发对应任务的同步。

- `POST /api/webhook?task=name` — 手动指定任务名，直接触发同步
- `POST /api/webhook` — 自动检测，解析 `type: "transfer.complete"` 事件：
  - 提取 `data.transferinfo.target_diritem.path`（兜底 `target_item.path`）
  - 按 `remote.path` 前缀匹配所有已启用 task，选最长路径匹配（如 `/电影/动漫` 优先于 `/电影`）
  - 匹配成功后延迟 **60 秒** 触发同步，等待 WebDAV 文件落盘
- 同名任务正在运行时重复触发静默跳过。
- body 格式不匹配时仅记录日志，不触发同步。

## Jellyfin 集成

可选配置 Jellyfin 服务器（url + token），任务生成新 `.strm` 文件后自动调用 `POST /Library/Refresh` 刷新媒体库。
配置支持全局默认，每个任务可覆盖。刷新失败仅记录警告，不影响同步流程。

## 开发

- `npm run dev` — 开发模式热更新（仅后端）
- `npm run dev:web` — 开发模式（后端 + 前端 HMR）
- `npm run check` — 提交前检查（lint + tsc），仅后端
- `npm run build:web` — 前端类型检查 + 打包
- `npm run build:all` — 前后端全量构建
