# Auto STRM

通过 WebDAV 扫描远端媒体目录，同步元数据文件到本地，并为视频文件生成 `.strm` 链接文件。

## 功能需求

- 扫描 WebDAV 指定目录下的所有子文件夹，保持本地目录结构一致
- 同步元数据文件到本地（`.nfo` `.jpg` `.jpeg` `.png` `.svg` `.ass` `.ssa` `.srt` `.sup` `.mp3` `.flac` `.wav` `.aac`）
- 检测到视频文件时，生成同名的 `.strm` 链接文件，替换视频扩展名（`.mkv` `.iso` `.ts` `.mp4` `.avi` `.rmvb` `.wmv` `.m2ts` `.mpg` `.flv` `.rm` `.mov`）
- `.strm` 文件内容为 CloudDrive2 流媒体格式 URL：`{base}/static/{proto}/{host}/False{encodedPath}/{encodedFile}`
  - `publicUrl` 未填时，base 自动取 `remote.url` 的 origin
  - `publicUrl` 填写时，用指定地址作为 base
  - 远端路径和文件路径各段经过 URL 编码（`encodeURIComponent`），保证含中文、空格等特殊字符的路径可用
- 可选配置 `syncMetadata`（默认 `true`），设为 `false` 时跳过元数据下载只生成 strm
- 增量同步：本地已有同名文件则跳过下载；strm 内容不变则跳过写入
- 并发处理：元数据下载和 strm 生成并发执行（默认 10 并发），提高同步速度
- 下载失败时自动清理残留的部分文件，下次同步可重试
- 支持多个同步任务，每个任务独立配置远端/本地/cron 表达式
- 定时执行，启动时立即执行一次
- 监听 SIGTERM/SIGINT 信号，优雅退出（停止定时器，等待当前任务完成）
- 每次同步输出统计信息（下载/跳过/生成的各类文件数量）
- `NODE_ENV=development` 时读 `config/dev.json`，否则读 `config/default.json`

## 配置示例

```json
{
  "tasks": [
    {
      "name": "剧集",
      "remote": {
        "url": "https://your-server.com/dav",
        "username": "your-account",
        "password": "your-password",
        "path": "/cloud-drive/Media/剧集",
        "syncMetadata": false,
        "publicUrl": "https://your-server.com"
      },
      "local": {
        "path": "/data/剧集"
      },
      "cron": "0 */6 * * *"
    }
  ]
}
```

## 技术栈

- TypeScript + Node.js 22
- Docker 容器化（两阶段构建）
- `webdav` (v5) — WebDAV 客户端
- `cron` (v3) — 定时调度
- `tsx` — 开发模式热更新
