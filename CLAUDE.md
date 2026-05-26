# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Dockerized TypeScript app that syncs media metadata from WebDAV and generates `.strm` files for video files. Runs on a cron schedule. Supports multiple sync tasks with independent configs. Includes an optional web UI (React + Ant Design) for browser-based config management.

## Commands

```bash
# Install dependencies + git hook
npm install && cp .git/hooks/pre-commit .git/hooks/pre-commit

# Dev mode (backend only, auto-reload, reads config/dev.json, web server on :3000)
npm run dev

# Dev mode with web UI (backend + frontend HMR, opens on :5173 with API proxy)
npm run dev:web

# Pre-commit check: lint + type-check — MUST run before committing
npm run check

# Type-check and compile backend (used in Docker, no lint)
npm run build

# Build frontend (React → web/dist/)
npm run build:web

# Build both backend and frontend
npm run build:all

# Run compiled output
npm start

# Docker
docker compose up --build
# With custom web port
WEB_PORT=8080 docker compose up --build
```

**Before every commit:** run `npm run check` (lint + tsc). A git pre-commit hook enforces this automatically.

## Architecture

```
├── config/
│   ├── default.json       # Production config (volume-mounted in Docker)
│   └── dev.json           # Dev config, only loaded when NODE_ENV=development
├── src/
│   ├── index.ts           # Entry: loads config, starts scheduler, starts web server (if WEB_PORT set), graceful shutdown
│   ├── config.ts          # Reads & validates config, selects file by NODE_ENV, exports validateConfig()
│   ├── server.ts          # Express API server: GET/PUT /api/config, static file serving + SPA fallback
│   ├── scanner.ts         # Recursively lists WebDAV dir, classifies files
│   ├── syncer.ts          # Downloads metadata, generates .strm files (buildStrmUrl)
│   ├── scheduler.ts       # Cron scheduling, fires immediately then on schedule, returns stop handle
│   ├── jellyfin.ts        # Jellyfin API client: refreshLibrary() calls POST /Library/Refresh
│   ├── logger.ts          # Ring-buffer console capture for log viewer, exports restoreConsole()
│   └── utils.ts           # Shared: delay(), pad(), errorMessage()
├── web/
│   ├── src/
│   │   ├── main.tsx               # React entry point
│   │   ├── App.tsx                # App root with config state management
│   │   ├── api.ts                 # REST client for /api/config
│   │   ├── types.ts               # ConfigFile, RawTaskConfig, etc. (mirrors backend types)
│   │   ├── layouts/
│   │   │   └── AppLayout.tsx      # Sidebar + content area shell
│   │   ├── pages/
│   │   │   ├── TaskManagementPage.tsx  # Task list + stats dashboard
│   │   │   ├── LogViewerPage.tsx       # Real-time log viewer with ANSI color
│   │   │   └── SystemSettingsPage.tsx  # Global defaults editor
│   │   ├── components/
│   │   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   │   ├── StatsCard.tsx          # Single stats card with gradient
│   │   │   ├── StatsDashboard.tsx     # Stats card grid (total/enabled/syncing/disabled)
│   │   │   ├── TaskListView.tsx       # Filtered task list
│   │   │   ├── TaskListItem.tsx       # Single task row
│   │   │   ├── TaskEditModal.tsx      # Modal editor (tabbed: basic/advanced/jellyfin)
│   │   │   ├── GlobalDefaultsEditor.tsx  # Top-level remote/cron/rateLimit form
│   │   │   ├── RemoteFieldsEditor.tsx    # Reusable remote config form fields
│   │   │   ├── RateLimitFields.tsx       # Concurrency/interval input fields
│   │   │   ├── JellyfinFields.tsx        # Reusable Jellyfin url/token input fields
│   │   │   ├── Addon.tsx                 # Compact input label prefix
│   │   │   ├── cleanJellyfin.ts          # Shared Jellyfin field cleanup (return undefined if empty)
│   │   │   └── ErrorBoundary.tsx         # Global error boundary, wraps <App />
│   │   ├── hooks/
│   │   │   ├── useConfigState.tsx  # Config load/save/in-memory state hook
│   │   │   └── useResponsive.ts   # Responsive breakpoint hook
│   │   └── utils/
│   │       └── ansiToHtml.ts      # ANSI escape code to HTML converter
│   ├── package.json
│   ├── vite.config.ts
│   └── dist/                      # Built frontend (served by Express in production)
├── tsconfig.json
├── package.json
└── data/                  # Local sync destination (Docker volume mount)
```

**Flow**: `index.ts` → `config.load()` → filter enabled tasks → `scheduler.start(tasks, runTaskTracked)` → if `WEB_PORT` set, `server.startServer()` → watch config with `fs.watchFile` for hot-reload → for each task: `createClient(url, {username, password})` → `scanner.scan()` → (if syncMetadata) concurrent `syncer.syncMetadata()` → concurrent `syncer.generateStrm()` → log stats. On SIGTERM/SIGINT: close HTTP server (if any), stop cron jobs, wait for in-flight tasks, exit.

## Config schema

Top-level `remote`, `cron`, and `rateLimit` provide common defaults shared across tasks. Each task can override any field. `remote.path` and `local.path` must be defined per-task — they cannot be inherited from global defaults.

```jsonc
{
  "remote": {                        // optional: common config shared by all tasks
    "url": "https://your-server.com/dav",
    "username": "your-account",
    "password": "your-password",
    "publicUrl": "https://your-server.com"  // optional: override streaming host
    // path is NOT allowed here — must be defined per-task
  },
  "cron": "0 */6 * * *",            // optional: common cron, tasks inherit if omitted
  "rateLimit": {                     // optional: common rate limit defaults
    "concurrency": 5,                // default 5
    "intervalMs": 200                // default 200ms between requests
  },
  "tasks": [
    {
      "name": "example",
      "enabled": true,                     // optional, defaults to true
      "remote": {
        "path": "/cloud-drive/Media/Movies",  // required per task
        "syncMetadata": true                  // optional, defaults to true
        // url/username/password can be overridden per task if needed
      },
      "local": { "path": "./data/example" },
      "cron": "0 */6 * * *",          // optional if top-level cron is set
      "rateLimit": {                  // optional: per-task override
        "concurrency": 3,
        "intervalMs": 500
      }
    }
  ]
}
```

```typescript
// Before merge (RawTaskConfig / ConfigFile)
interface RemoteConfig {
  url?: string;
  username?: string;
  password?: string;
  path?: string;
  publicUrl?: string;
  syncMetadata?: boolean; // default true
}

interface RateLimitConfig {
  concurrency: number; // default 5
  intervalMs: number;  // default 200
}

// After merge (TaskConfig) — all required fields guaranteed present
interface ResolvedRemoteConfig {
  url: string;
  username: string;
  password: string;
  path: string;
  publicUrl?: string;
  syncMetadata?: boolean;
}

interface TaskConfig {
  name: string;
  remote: ResolvedRemoteConfig;
  local: LocalConfig;
  cron: string;
  rateLimit: RateLimitConfig;
  enabled: boolean; // default true
}
```

Merge: `{ ...commonRemote, ...taskRemote }` — task values take precedence.
Cron merge: `task.cron || commonCron` — task wins, falls back to top-level.
Rate limit merge: `DEFAULT → top-level rateLimit → task rateLimit` — each field merges independently.
Enabled: `task.enabled ?? true` — per-task only, no common override.

## .strm URL format

CloudDrive2 streaming format: `{base}/static/{proto}/{host}/False{encodedRemotePath}/{encodedVideoPath}`

- `base` = `publicUrl` if set, otherwise origin extracted from `remote.url`
- `proto` = protocol extracted from `base` (e.g. `http`, `https`)
- `host` = hostname:port parsed from `base`
- `encodedRemotePath` = `remote.path` with each segment `encodeURIComponent` encoded
- `encodedVideoPath` = video relative path with each segment `encodeURIComponent` encoded
- `.strm` file replaces video extension (e.g. `movie.strm`, not `movie.mp4.strm`)

## Concurrency

Metadata downloads and strm generation run concurrently within each task. Controlled by `rateLimit.concurrency` (default 5). Each worker pauses `rateLimit.intervalMs` (default 200ms) between items to avoid triggering server rate limits.

## Key types

- `TaskConfig` / `RemoteConfig` / `ResolvedRemoteConfig` / `LocalConfig` — defined in `config.ts`
- `ConfigFile` / `RawTaskConfig` — raw (pre-merge) config types, exported for server and frontend use
- `MetadataFile` / `VideoFile` / `ScanResult` — defined in `scanner.ts`
- `SchedulerHandle` — `{ stop: () => void; update: (tasks: TaskConfig[]) => void; runNow: (name: string, overrideRemotePath?: string) => boolean }`, returned by `scheduler.start()`

## Key behaviors

- **Web server (opt-in)**: set `WEB_PORT` env var to enable the web UI. Express serves the React SPA on `/` and REST API on `/api/*`. When `WEB_PORT` is unset, the app runs headless as before.
- **Config management API**: `GET /api/config` returns the raw config JSON. `PUT /api/config` validates the body, writes atomically (tmp + rename), and triggers scheduler reload. Passwords are returned in plain text — the frontend `Input.Password` component handles visual masking.
- **Task enable toggle instant save**: switching a task's enabled/disabled state immediately saves only the `enabled` field (uses `savedConfigRef` to isolate from other unsaved edits). New tasks use `__tmp__:N` prefix for unique React keys, replaced with real UUID on first save.
- **Save button loading**: App tracks `saving` state; `onSaveDone` is called in `finally` block so the button recovers even if save/load fails.
- **Config hot-reload**: `fs.watchFile` monitors the config file. On change, config is reloaded, cron jobs are rebuilt. Existing tasks only get updated cron schedules (no immediate re-run); genuinely new tasks fire immediately. Parse errors leave old jobs running untouched.
- **Incremental sync**: metadata files are skipped if the local file already exists (existence-only check, no size/mtime comparison). `.strm` files are skipped if content matches.
- **Error cleanup**: partial downloads are deleted on failure so the next run retries cleanly.
- **Graceful shutdown**: on SIGTERM/SIGINT, HTTP server stops accepting connections, active connections destroyed, webhook timers cancelled, cron jobs stopped, in-flight tasks allowed to finish (30s timeout, then force exit).
- **Scanner traversal**: same-level directories are traversed concurrently via `Promise.all`.
- **Logger**: uses `splice()` for O(1) bulk eviction instead of `shift()` O(n).
- **Stream downloads**: `pipeToFile` uses `stream/promises.pipeline()` for automatic error propagation and cleanup.
- **Re-entrance guard**: if a cron trigger fires while the previous run of the same task is still in progress, the new trigger is skipped.

## API endpoints

Express routes:
- `GET /api/config` — raw config JSON
- `PUT /api/config` — validate, write atomically, reload scheduler
- `POST /api/tasks/:name/sync` — trigger a single task run by name
- `POST /api/config/reload` — re-read config file and reload scheduler
- `POST /api/webhook?task=name` — receive webhook, log event, optionally trigger sync
- `GET /api/health` — uptime status
- `GET /api/logs` — ring-buffer logs

## Webhook

`POST /api/webhook` 接收外部 webhook 事件，自动匹配任务并延迟触发同步。

**MoviePilot 适配：** 解析 `type: "transfer.complete"` 事件，提取 `data.transferinfo.target_diritem.path`（兜底 `target_item.path`），按 `remote.path` 前缀匹配所有已启用 task，选最长匹配（如 `/电影/动漫` 优先于 `/电影`），匹配成功后延迟 60 秒触发 **部分同步**（仅扫描 webhook 传来的目标目录，非整个 task）。`relativePath` 自动补全子目录偏移量，保证本地落点和 strm URL 与全量同步一致。

**手动触发：** `POST /api/webhook?task=name` 直接按任务名触发全量同步。

**Flow:**
1. 如果 `?task=name` 指定 → `schedulerHandle.runNow(name)` 直接触发全量同步
2. 如果 body 包含 `type: "transfer.complete"` → 提取 target path，遍历 enabled tasks，选最长 `remote.path` 前缀匹配，`setTimeout(() => schedulerHandle.runNow(name, targetPath), 60_000)` 延迟触发部分同步
3. 格式不匹配 → 截取前 300 字符日志，返回 `{ action: 'logged' }`
4. Re-entrance guard: 同名任务正在运行时重复触发静默跳过

## Jellyfin integration

Optional `jellyfin` config (url + token) at global level and per-task. Merge: `task.jellyfin || cfg.jellyfin` (whole-object override). When a task generates new `.strm` files, calls `POST {url}/Library/Refresh` with `X-MediaBrowser-Token` header. Failure logs a warning and does not fail the sync.

## Frontend config field checklist

When adding a new config field (e.g. `jellyfin`), update ALL of:
1. `web/src/types.ts` — add interface + fields to `ConfigFile` and `RawTaskConfig`
2. Create/reuse a Fields component (follow `RateLimitFields` or `JellyfinFields` pattern)
3. `GlobalDefaultsEditor.tsx` — add input section, pass through props
4. `TaskItemEditor.tsx` — add collapsible section with inherited placeholder
5. `ConfigPage.tsx` — pass field to both editors
6. `TaskListEditor.tsx` — add to `defaults` prop type

## Verification

- `npm run check` — backend only: lint + tsc
- `npm run build:web` — frontend type-check + vite build (run separately)
- Run both before committing frontend changes
- Fix prettier errors: `npx prettier --write <file>`

## Prettier

```bash
npx prettier --write src/config.ts src/jellyfin.ts  # auto-fix formatting
```

## Key libraries

- `webdav` (v5) — WebDAV client: `createClient`, `getDirectoryContents`, `createReadStream`
- `cron` (v3) — `CronJob` for scheduling
- `express` (v5) — HTTP server for web UI and REST API
- `react` + `antd` (v5) — web UI (in `web/`)
- `vite` (v5) — frontend build tool
- `tsx` — TypeScript runner for dev mode

## File classification

Metadata extensions synced as-is: `.nfo .jpg .jpeg .png .svg .ass .ssa .srt .sup .mp3 .flac .wav .aac`

Video extensions trigger `.strm` generation: `.mkv .iso .ts .mp4 .avi .rmvb .wmv .m2ts .mpg .flv .rm .mov`

## Gotchas

- **Socket type**: import from `node:net`, not `node:http`
- **Dockerfile non-root**: don't add non-root USER if config dir is volume-mounted (EACCES on write)
- **Collapse antd v5**: children mode (`<Collapse.Panel>`) preserves expand/collapse state across re-renders
