# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Dockerized TypeScript app that syncs media metadata from WebDAV and generates `.strm` files for video files. Runs on a cron schedule. Supports multiple sync tasks with independent configs.

## Commands

```bash
# Install dependencies + git hook
cd app && npm install && cp ../.git/hooks/pre-commit ../.git/hooks/pre-commit

# Dev mode with auto-reload (reads config/dev.json)
cd app && npm run dev

# Pre-commit check: lint + type-check — MUST run before committing
cd app && npm run check

# Type-check and compile (used in Docker, no lint)
cd app && npm run build

# Run compiled output
cd app && npm start

# Docker
docker compose up --build
```

**Before every commit:** run `cd app && npm run check` (lint + tsc). A git pre-commit hook enforces this automatically.

## Architecture

```
app/
├── config/
│   ├── default.json       # Production config (volume-mounted in Docker)
│   └── dev.json           # Dev config, only loaded when NODE_ENV=development
├── src/
│   ├── index.ts           # Entry: loads config, starts scheduler, concurrency & graceful shutdown
│   ├── config.ts          # Reads & validates config, selects file by NODE_ENV
│   ├── scanner.ts         # Recursively lists WebDAV dir, classifies files
│   ├── syncer.ts          # Downloads metadata, generates .strm files (buildStrmUrl)
│   └── scheduler.ts       # Cron scheduling, fires immediately then on schedule, returns stop handle
├── tsconfig.json
├── package.json
└── data/                  # Local sync destination (Docker volume mount)
```

**Flow**: `index.ts` → `config.load()` → filter enabled tasks → `scheduler.start(tasks, runTaskTracked)` → watch config with `fs.watchFile` for hot-reload → for each task: `createClient(url, {username, password})` → `scanner.scan()` → (if syncMetadata) concurrent `syncer.syncMetadata()` → concurrent `syncer.generateStrm()` → log stats. On SIGTERM/SIGINT: stop cron jobs, wait for in-flight tasks, exit.

## Config schema

Top-level `remote`, `cron`, and `rateLimit` provide common defaults shared across tasks. Each task can override any field. If top-level defaults are omitted, each task must supply all required fields.

```jsonc
{
  "remote": {                        // optional: common config shared by all tasks
    "url": "https://your-server.com/dav",
    "username": "your-account",
    "password": "your-password",
    "publicUrl": "https://your-server.com"  // optional: override streaming host
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
        "path": "/cloud-drive/Media/Movies",  // required per task (or from common)
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
- `MetadataFile` / `VideoFile` / `ScanResult` — defined in `scanner.ts`
- `SchedulerHandle` — `{ stop: () => void; update: (tasks: TaskConfig[]) => void }`, returned by `scheduler.start()`

## Key behaviors

- **Config hot-reload**: `fs.watchFile` monitors the config file. On change, config is reloaded, cron jobs are rebuilt. Existing tasks only get updated cron schedules (no immediate re-run); genuinely new tasks fire immediately. Parse errors leave old jobs running untouched.
- **Incremental sync**: metadata files are skipped if the local file already exists (existence-only check, no size/mtime comparison). `.strm` files are skipped if content matches.
- **Error cleanup**: partial downloads are deleted on failure so the next run retries cleanly.
- **Graceful shutdown**: on SIGTERM/SIGINT, cron jobs are stopped and in-flight tasks allowed to finish before exit (30s timeout, then force exit).
- **Re-entrance guard**: if a cron trigger fires while the previous run of the same task is still in progress, the new trigger is skipped.

## Key libraries

- `webdav` (v5) — WebDAV client: `createClient`, `getDirectoryContents`, `createReadStream`
- `cron` (v3) — `CronJob` for scheduling
- `tsx` — TypeScript runner for dev mode

## File classification

Metadata extensions synced as-is: `.nfo .jpg .jpeg .png .svg .ass .ssa .srt .sup .mp3 .flac .wav .aac`

Video extensions trigger `.strm` generation: `.mkv .iso .ts .mp4 .avi .rmvb .wmv .m2ts .mpg .flv .rm .mov`
